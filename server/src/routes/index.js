import { Router } from 'express';
import { validarClaveParam, validarIdParam } from '../middleware/validarParametros.js';

/**
 * Rutas de la API (todas cuelgan de /api)
 *
 *   GET  /health                                       = comprobar que el servidor está vivo
 *   GET  /cuestionario/:clave                          = preguntas y opciones vigentes del cuestionario elegido
 *                                                        ("hogar" o "trabajo"; leídas de MySQL, sin pesos)
 *   GET  /catalogo/unidades-regionales                 = unidades regionales activas
 *   GET  /catalogo/unidades-regionales/:idUnidad/escuelas = escuelas/facultades de ESA unidad (cascada)
 *   GET  /catalogo/paises                              = países (México primero)
 *   GET  /catalogo/estados                             = estados de México
 *   GET  /catalogo/estados/:idEstado/municipios        = municipios de ESE estado (cascada)
 *   POST /participaciones                              = guarda cuestionario elegido + datos + respuestas + cantidades
 *                                                        y devuelve los resultados
 *                                                        (400 si falta cualquier dato o respuesta)
 */
export function createRoutes({
  catalogoController,
  cuestionarioController,
  participacionesController,
  validarParticipacion,
  submissionIpLimiter,
}) {
  const router = Router();

  router.get('/health', (_req, res) => res.json({ ok: true }));

  router.get('/cuestionario/:clave', validarClaveParam('clave'), cuestionarioController.obtener);

  router.get('/catalogo/unidades-regionales', catalogoController.listarUnidades);
  router.get(
    '/catalogo/unidades-regionales/:idUnidad/escuelas',
    validarIdParam('idUnidad'),
    catalogoController.listarEscuelas
  );
  router.get('/catalogo/paises', catalogoController.listarPaises);
  router.get('/catalogo/estados', catalogoController.listarEstados);
  router.get('/catalogo/estados/:idEstado/municipios', validarIdParam('idEstado'), catalogoController.listarMunicipios);

  router.post('/participaciones', submissionIpLimiter, validarParticipacion, participacionesController.crear);

  return router;
}
