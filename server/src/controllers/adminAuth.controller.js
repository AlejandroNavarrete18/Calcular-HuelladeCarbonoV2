import { COOKIE_NAME, hashToken, leerTokenDeCookie, opcionesCookie, tokenCsrf, tokensIguales } from '../utils/sesion.js';
import { validarCambioContrasena, validarLogin } from '../validators/admin.validator.js';

/**
 * Controlador de la sesión de los administradores.
 *
 * @param {{adminAuthService: ReturnType<import('../services/adminAuth.service.js').createAdminAuthService>, config: object}} deps
 */
export function createAdminAuthController({ adminAuthService, config }) {
  const cookie = opcionesCookie(config.admin);

  return {
    async login(req, res) {
      const credenciales = validarLogin(req.body);
      const tokenAnterior = leerTokenDeCookie(req);
      let tokenHashAnterior = '';
      if (tokenAnterior) {
        tokenHashAnterior = hashToken(tokenAnterior);
      }
      const { token, csrf, admin } = await adminAuthService.iniciarSesion({
        ...credenciales,
        ip: req.ip,
        agenteUsuario: req.get('user-agent'),
        tokenHashAnterior,
      });
      // Sin `maxAge`: es una cookie de sesión, el navegador la descarta al cerrarse. La duración máxima la impone el servidor.
      res.cookie(COOKIE_NAME, token, cookie);
      res.json({ ok: true, admin, csrf });
    },

    /*
     * La página avisa con sendBeacon que se está cerrando (cerrar pestaña o navegador, o recargar). Un beacon no puede
     * llevar cabeceras, así que el token CSRF viaja en el cuerpo. Si la página sigue abierta (recarga, otra pestaña),
     * su siguiente petición o latido cancela el aviso; si no, la sesión termina al vencer la espera.
     */
    async cerrando(req, res) {
      const token = leerTokenDeCookie(req);
      if (token && tokensIguales(req.body?.csrf ?? '', tokenCsrf(token))) {
        await adminAuthService.marcarCierrePendiente({ tokenHash: hashToken(token) });
      }
      res.status(204).end();
    },

    // Latido de fondo: la página sigue abierta. Pasa por requireAdmin, que hace el trabajo; si la sesión ya no vale, responde 401.
    latido(_req, res) {
      res.json({ ok: true });
    },

    async logout(req, res) {
      await adminAuthService.cerrarSesion({ admin: req.admin, tokenHash: req.sesion.tokenHash, ip: req.ip });
      res.clearCookie(COOKIE_NAME, cookie);
      res.json({ ok: true });
    },

    // Devuelve los datos de la sesión abierta; el navegador lo usa al recargar la página para obtener su token CSRF.
    yo(req, res) {
      res.json({ ok: true, admin: req.admin, csrf: req.sesion.csrf });
    },

    async cambiarContrasena(req, res) {
      const { actual, nueva } = validarCambioContrasena(req.body, req.admin.correo);
      await adminAuthService.cambiarContrasena({ admin: req.admin, tokenHash: req.sesion.tokenHash, actual, nueva, ip: req.ip });
      res.json({ ok: true });
    },
  };
}
