import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadConfig, ConfigError } from './config/index.js';
import { createApp } from './app.js';
import { createDatabasePool, verifyDatabaseConnection } from './database/pool.js';
import { createRepositories } from './repositories/index.js';
import { createMailService } from './services/mail/mail.service.js';
import { createReenviosService } from './services/mail/reenvios.service.js';
import { createDespachadorCorreo } from './services/mail/despachador.service.js';
import { createCuestionarioService } from './services/cuestionario.service.js';
import { createCatalogoService } from './services/catalogo.service.js';
import { createParticipacionesService } from './services/participaciones.service.js';
import { createAuditoria } from './services/auditoria.js';
import { createAdminAuthService } from './services/adminAuth.service.js';
import { createAdminPanelService } from './services/adminPanel.service.js';
import { createRecipientLimiter } from './middleware/recipientLimiter.js';
import { logger } from './utils/logger.js';

// Punto de entrada. Orden de arranque: configuración, base de datos, cuestionario de MySQL, correo y Express.

const SHUTDOWN_TIMEOUT_MS = 30_000;

// Termina el proceso con un mensaje claro.
function exitWith(message) {
  logger.error(message);
  process.exit(1);
}

let config;
try {
  config = loadConfig();
} catch (err) {
  if (err instanceof ConfigError) {
    exitWith(err.message);
  }
  throw err;
}

if (config.serveClient && !existsSync(path.join(config.clientDistDir, 'index.html'))) {
  exitWith('SERVE_CLIENT=true pero no existe client/dist. Ejecuta primero: npm run build');
}

// Un origen http que no es de esta misma máquina: con cookies seguras el navegador no guardaría la sesión del panel.
function esOrigenHttpRemoto(origen) {
  try {
    const url = new URL(origen);
    return url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

if (config.admin.secureCookies && config.allowedOrigins.some(esOrigenHttpRemoto)) {
  logger.warn(
    'La cookie de sesión del panel es "secure" pero hay orígenes http en ALLOWED_ORIGINS: por http el navegador no guardará ' +
      'la sesión y nadie podrá entrar al panel. Usa https o, solo en una red interna, define ADMIN_COOKIE_SECURE=false.'
  );
}

const pool = createDatabasePool(config.db);

// Todo se guarda en MySQL: si la base no responde, el servidor no tiene sentido y se detiene.
try {
  await verifyDatabaseConnection(pool);
} catch (err) {
  await pool.end().catch(() => {});
  exitWith(`No se pudo conectar a MySQL (${config.db.host}:${config.db.port}, base "${config.db.database}"): ${err.code ?? err.message}`);
}

const repositories = createRepositories(pool);
const cuestionario = createCuestionarioService({
  cuestionario: repositories.cuestionario,
  logger,
  cacheMs: config.questionnaireCacheMs,
});

// El cuestionario (preguntas, opciones y pesos) vive en MySQL: debe existir y estar completo para poder calcular.
const problemasCuestionario = await cuestionario.cargar();
if (problemasCuestionario.length > 0) {
  await pool.end().catch(() => {});
  exitWith(
    `El cuestionario guardado en MySQL no se puede usar:\n - ${problemasCuestionario.join('\n - ')}\n` +
      'Si es una base nueva, importa database/datos-iniciales.sql'
  );
}
if ((await repositories.catalogo.listarUnidades()).length === 0) {
  logger.warn('No hay unidades regionales activas en la base de datos: el formulario final no se podrá completar.');
}

const mailService = createMailService({
  cuentasCorreo: repositories.cuentasCorreo,
  enviosCorreo: repositories.enviosCorreo,
  mailConfig: config.mail,
  secretKey: config.mail.secretKey,
  logger,
});

// Verifica las cuentas activas al arrancar: avisa de inmediato si alguna contraseña es incorrecta.
mailService.verify().catch((err) => {
  logger.error('No se pudo verificar las cuentas de correo:', err.message);
});

const recipientLimiter = createRecipientLimiter({
  max: config.limits.emailsPerRecipientPerHour,
  windowMs: config.limits.windowMs,
});
// Cola PERSISTENTE de correos (tabla cola_correos): sobrevive a reinicios y caídas del servidor.
const despachador = createDespachadorCorreo({ repositories, mailService, recipientLimiter, logger, dryRun: config.mail.dryRun });
const participaciones = createParticipacionesService({
  repositories,
  cuestionarioService: cuestionario,
  despachador,
  recipientLimiter,
  logger,
});
const catalogo = createCatalogoService({ catalogo: repositories.catalogo });

const auditar = createAuditoria({ bitacora: repositories.bitacora, logger });
const adminAuth = createAdminAuthService({ administradores: repositories.administradores, auditar, config, logger });
const adminPanel = createAdminPanelService({ repositories, auditar, config });
const reenvios = createReenviosService({ repositories, mailService, auditar, logger });

const app = createApp({ config, services: { catalogo, cuestionario, participaciones, adminAuth, adminPanel, reenvios }, repositories, logger });
const server = app.listen(config.port, () => {
  logger.info(`API escuchando en http://localhost:${config.port} (orígenes permitidos: ${config.allowedOrigins.join(', ')})`);
  // Con el servidor ya disponible, se retoman los correos que hubieran quedado pendientes antes de apagarse.
  despachador.iniciar();
});

// Cierre ordenado: los correos dejan de tomarse de inmediato y los que ya se están enviando terminan antes de cerrar
// MySQL (lo que no se alcanzó a enviar queda en la cola y sale cuando el servidor vuelva).
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info(`${signal} recibido, cerrando servidor...`);

  const forceExit = setTimeout(() => exitWith('El cierre ordenado tardó demasiado: se fuerza la salida.'), SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  const cierreDespachador = despachador.detener();

  server.close(async () => {
    try {
      await cierreDespachador;
      await reenvios.detener();
      mailService.cerrar();
      await pool.end();
      process.exit(0);
    } catch (error) {
      exitWith(`Error durante el cierre: ${error.message}`);
    }
  });
  // Las conexiones inactivas (keep-alive) no deben retrasar el cierre.
  server.closeIdleConnections();
}
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => shutdown(signal));
}

// Errores que nadie capturó: se registran (sin volcar datos de la persona) y se cierra de forma ordenada.
process.on('unhandledRejection', (reason) => {
  logger.error('Promesa rechazada sin capturar:', reason?.code ?? '', reason?.message ?? reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Excepción sin capturar:', err.message);
  shutdown('uncaughtException');
});
