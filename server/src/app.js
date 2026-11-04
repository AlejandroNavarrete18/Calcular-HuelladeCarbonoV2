import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createRoutes } from './routes/index.js';
import { createCatalogoController } from './controllers/catalogo.controller.js';
import { createCuestionarioController } from './controllers/cuestionario.controller.js';
import { createParticipacionesController } from './controllers/participaciones.controller.js';
import { createAdminAuthController } from './controllers/adminAuth.controller.js';
import { createAdminPanelController } from './controllers/adminPanel.controller.js';
import { createAdminRoutes } from './routes/admin.js';
import { createRequireAdmin } from './middleware/adminAuth.js';
import { createValidarParticipacion } from './middleware/validarParticipacion.js';
import {
  createAdminExportLimiter,
  createAdminLoginLimiter,
  createGeneralLimiter,
  createSubmissionIpLimiter,
} from './middleware/rateLimit.js';
import { createOriginGuard } from './middleware/originGuard.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Construye la aplicación Express.
 *
 * @param {object} deps
 * @param {object} deps.config Configuración validada (ver config/index.js).
 * @param {{catalogo: object, cuestionario: object, participaciones: object, adminAuth: object, adminPanel: object, reenvios: object}} deps.services
 *   Servicios de la aplicación.
 * @param {object} deps.repositories Repositorios (el panel de administración los usa para validar sesiones).
 * @param {{info: Function, warn: Function, error: Function}} deps.logger
 */
export function createApp({ config, services, repositories, logger }) {
  const app = express();

  app.disable('x-powered-by'); // no anunciar que usamos Express
  if (config.trustProxy) {
    app.set('trust proxy', config.trustProxy);
  }

  /*
   * Cabeceras de seguridad HTTP. `upgrade-insecure-requests` se desactiva para que la página siga
   * funcionando si se sirve por http dentro de la red de la universidad (en https no cambia nada).
   */
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } },
    })
  );

  // CORS: solo las páginas autorizadas pueden llamar a la API desde un navegador.
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || config.allowedOrigins.includes(origin)),
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    })
  );
  app.use('/api', createOriginGuard(config.allowedOrigins, { allowSameHost: config.serveClient }));

  app.use(express.json({ limit: '10kb' })); // los datos y respuestas del cuestionario pesan muy poco
  app.use('/api', createGeneralLimiter(config.limits));

  // Las respuestas de la API (cuestionario, catálogos) se revalidan siempre: un cambio en la base se ve de inmediato.
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-cache');
    next();
  });

  const catalogoController = createCatalogoController({ catalogoService: services.catalogo });
  const cuestionarioController = createCuestionarioController({ cuestionarioService: services.cuestionario });
  const participacionesController = createParticipacionesController({
    participacionesService: services.participaciones,
    logger,
  });
  app.use(
    '/api',
    createRoutes({
      catalogoController,
      cuestionarioController,
      participacionesController,
      validarParticipacion: createValidarParticipacion({ cuestionarioService: services.cuestionario }),
      submissionIpLimiter: createSubmissionIpLimiter(config.limits),
    })
  );

  // Panel de administración: API propia con sesión por cookie y reglas de origen más estrictas.
  app.use(
    '/api/admin',
    createAdminRoutes({
      authController: createAdminAuthController({ adminAuthService: services.adminAuth, config }),
      panelController: createAdminPanelController({ adminPanelService: services.adminPanel, reenviosService: services.reenvios }),
      requireAdmin: createRequireAdmin({ administradores: repositories.administradores, config }),
      originGuard: createOriginGuard(config.allowedOrigins, { allowSameHost: config.serveClient, requireOriginOnUnsafe: true }),
      loginLimiter: createAdminLoginLimiter(config.limits),
      exportLimiter: createAdminExportLimiter(config.limits),
    })
  );

  if (config.serveClient) {
    // Las páginas del panel no deben aparecer en buscadores.
    app.use('/admin', (_req, res, next) => {
      res.set('X-Robots-Tag', 'noindex, nofollow');
      next();
    });

    /*
     * Caché del cliente. Los archivos de /assets llevan un hash en el nombre, que cambia cuando cambia su
     * contenido, así que se pueden guardar un año. El HTML no cambia de nombre y es el que apunta a los archivos
     * nuevos: se revalida siempre para que una versión publicada llegue a quien ya había visitado el sitio.
     */
    app.use('/assets', express.static(path.join(config.clientDistDir, 'assets'), { maxAge: '1y', immutable: true, index: false }));
    // Un archivo de /assets que ya no existe responde 404, no la página principal (evita una página en blanco).
    app.use('/assets', notFoundHandler);
    app.use(
      express.static(config.clientDistDir, {
        maxAge: '1h',
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.set('Cache-Control', 'no-cache');
          }
        },
      })
    );
    // Cualquier GET que no sea /api devuelve la página principal (navegación de la app).
    app.get(/^\/(?!api(\/|$)).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(config.clientDistDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
