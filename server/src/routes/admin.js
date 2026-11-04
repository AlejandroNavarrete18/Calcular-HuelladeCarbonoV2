import { Router } from 'express';
import { noGuardarEnCache, requireRole } from '../middleware/adminAuth.js';
import { validarIdParam } from '../middleware/validarParametros.js';

/**
 * Rutas del panel de administración (cuelgan de /api/admin)
 *
 *   POST   /auth/login                       = inicia sesión (cookie HttpOnly)
 *   POST   /auth/logout                      = cierra la sesión
 *   POST   /auth/cerrando                    = aviso de que la ventana se cierra (sendBeacon); la sesión termina si no hay más señales
 *   POST   /auth/latido                      = la página sigue abierta (evita que un aviso de cierre termine la sesión)
 *   GET    /auth/yo                          = datos de la sesión abierta
 *   POST   /auth/cambiar-contrasena          = cambia la contraseña propia
 *   GET    /resumen                          = estadísticas generales (acepta los mismos filtros que participaciones)
 *   GET    /participaciones                  = listado con filtros, orden y paginación
 *   GET    /participaciones/exportar         = descarga Excel (xlsx), PDF o CSV (?formato=) con los filtros aplicados
 *   GET    /participaciones/:id              = detalle con respuestas
 *   DELETE /participaciones/:id              = borra una participación (superadmin)
 *   GET    /correo/cuentas                   = cuentas de Gmail y su uso del día
 *   POST   /correo/cuentas                   = agrega una cuenta (superadmin)
 *   PATCH  /correo/cuentas/:id               = edita, pausa o cambia la contraseña de una cuenta (superadmin)
 *   GET    /correo/envios                    = bitácora de correos enviados y fallidos
 *   GET    /correo/resumen                   = conteos generales: total enviado, hoy, pendientes y cupo
 *   GET    /correo/pendientes                = participaciones cuyo correo no salió
 *   POST   /correo/reenviar                  = reenvía correos (elegidos o todos los pendientes), en segundo plano
 *   GET    /correo/reenvio                   = avance del reenvío en curso o del último
 *   GET    /administradores                  = lista de administradores (superadmin)
 *   POST   /administradores                  = crea un administrador (superadmin)
 *   PATCH  /administradores/:id              = cambia nombre, rol o estado (superadmin)
 *   POST   /administradores/:id/contrasena   = restablece su contraseña (superadmin)
 *   GET    /bitacora                         = movimientos de los administradores (superadmin)
 */
export function createAdminRoutes({ authController, panelController, requireAdmin, originGuard, loginLimiter, exportLimiter }) {
  const router = Router();
  const soloSuperadmin = requireRole('superadmin');

  router.use(noGuardarEnCache);
  router.use(originGuard);

  router.post('/auth/login', loginLimiter, authController.login);
  // Aviso de cierre de ventana (sendBeacon): no puede mandar cabeceras, valida el CSRF por su cuenta.
  router.post('/auth/cerrando', authController.cerrando);

  // Todo lo que sigue exige una sesión abierta.
  router.use(requireAdmin);

  router.post('/auth/logout', authController.logout);
  router.post('/auth/latido', authController.latido);
  router.get('/auth/yo', authController.yo);
  router.post('/auth/cambiar-contrasena', authController.cambiarContrasena);

  router.get('/resumen', panelController.resumen);

  router.get('/participaciones', panelController.listarParticipaciones);
  router.get('/participaciones/exportar', exportLimiter, panelController.exportarParticipaciones);
  router.get('/participaciones/:id', validarIdParam('id'), panelController.obtenerParticipacion);
  router.delete('/participaciones/:id', soloSuperadmin, validarIdParam('id'), panelController.eliminarParticipacion);

  router.get('/correo/cuentas', panelController.listarCuentasCorreo);
  router.post('/correo/cuentas', soloSuperadmin, panelController.crearCuentaCorreo);
  router.patch('/correo/cuentas/:id', soloSuperadmin, validarIdParam('id'), panelController.actualizarCuentaCorreo);
  router.get('/correo/envios', panelController.listarEnvios);
  router.get('/correo/resumen', panelController.resumenCorreo);
  router.get('/correo/pendientes', panelController.listarPendientesCorreo);
  router.post('/correo/reenviar', panelController.reenviarCorreos);
  router.get('/correo/reenvio', panelController.estadoReenvio);

  router.get('/administradores', soloSuperadmin, panelController.listarAdministradores);
  router.post('/administradores', soloSuperadmin, panelController.crearAdministrador);
  router.patch('/administradores/:id', soloSuperadmin, validarIdParam('id'), panelController.actualizarAdministrador);
  router.post('/administradores/:id/contrasena', soloSuperadmin, validarIdParam('id'), panelController.restablecerContrasena);

  router.get('/bitacora', soloSuperadmin, panelController.listarBitacora);

  return router;
}
