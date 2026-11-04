import { forbidden, unauthorized } from '../utils/errors.js';
import { COOKIE_NAME, hashToken, leerTokenDeCookie, opcionesCookie, tokenCsrf, tokensIguales } from '../utils/sesion.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Ruta (relativa a /api/admin) del latido que la página envía mientras está abierta.
const LATIDO_PATH = '/auth/latido';

// Las respuestas del panel nunca deben quedar guardadas en cachés ni en el historial del navegador.
export function noGuardarEnCache(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

/**
 * Exige una sesión de administrador vigente. Deja en `req.admin` los datos de la persona, en `req.sesion` el hash
 * del token y, en las peticiones que modifican datos, comprueba además el token anti-CSRF.
 *
 * @param {{administradores: object, config: {admin: {secureCookies: boolean}}}} deps
 */
export function createRequireAdmin({ administradores, config }) {
  return async function requireAdmin(req, res, next) {
    const token = leerTokenDeCookie(req);
    if (!token) {
      return next(unauthorized('UNAUTHENTICATED', 'Inicia sesión para continuar.'));
    }

    const tokenHash = hashToken(token);
    const sesion = await administradores.buscarSesionActiva(tokenHash, config.admin.idleMinutes);
    if (!sesion) {
      res.clearCookie(COOKIE_NAME, opcionesCookie(config.admin));
      return next(unauthorized('SESSION_EXPIRED', 'Tu sesión terminó. Inicia sesión de nuevo.'));
    }

    if (!SAFE_METHODS.has(req.method) && !tokensIguales(req.get('x-csrf-token') ?? '', tokenCsrf(token))) {
      return next(forbidden('CSRF_INVALID', 'No se pudo verificar la solicitud. Recarga la página.'));
    }

    /*
     * La petición demuestra que la página sigue abierta (cancela un aviso de cierre). Reinicia además el reloj de
     * inactividad, salvo en el latido de fondo, que solo cuenta si la persona usó la página desde el latido anterior.
     */
    const esLatido = req.path === LATIDO_PATH;
    await administradores.registrarPresencia(sesion.idSesion, { conActividad: !esLatido || req.body?.activo === true });

    req.admin = { id: sesion.id, nombre: sesion.nombre, correo: sesion.correo, rol: sesion.rol };
    req.sesion = { tokenHash, csrf: tokenCsrf(token) };
    return next();
  };
}

// Limita una ruta a ciertos roles. Debe ir después de requireAdmin.
export function requireRole(...roles) {
  return function verificarRol(req, _res, next) {
    if (!roles.includes(req.admin?.rol)) {
      return next(forbidden('FORBIDDEN', 'No tienes permiso para realizar esta acción.'));
    }
    return next();
  };
}
