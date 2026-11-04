import { HttpError, badRequest } from '../utils/errors.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../utils/passwords.js';
import { generarToken, hashToken, tokenCsrf } from '../utils/sesion.js';

const MAX_AGENTE = 255;

// Mismo mensaje para correo inexistente, contraseña incorrecta, cuenta desactivada o bloqueada: no revela cuál fue.
const credencialesInvalidas = () =>
  new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos, o el acceso está bloqueado temporalmente.');

/**
 * Inicio y cierre de sesión de los administradores.
 *
 * @param {{
 *   administradores: ReturnType<import('../repositories/administradores.repository.js').createAdministradoresRepository>,
 *   auditar: Function,
 *   config: {admin: {sessionHours: number, loginMaxAttempts: number, lockMinutes: number}},
 *   logger: {error: Function}
 * }} deps
 */
export function createAdminAuthService({ administradores, auditar, config, logger }) {
  const { sessionHours, loginMaxAttempts, lockMinutes, closeGraceSeconds } = config.admin;

  return {
    /**
     * Valida las credenciales y abre una sesión.
     * Siempre se calcula un hash (aunque el correo no exista) para que la respuesta tarde lo mismo.
     *
     * @returns {Promise<{token: string, csrf: string, admin: {id: number, nombre: string, correo: string, rol: string}}>}
     */
    async iniciarSesion({ correo, contrasena, ip, agenteUsuario, tokenHashAnterior = '' }) {
      const cuenta = await administradores.buscarParaLogin(correo);
      const contrasenaCorrecta = await verifyPassword(contrasena, cuenta?.contrasena_hash ?? DUMMY_HASH);

      if (!cuenta || !cuenta.activo) {
        await auditar({ accion: 'login_fallido', detalle: { motivo: 'cuenta_no_valida' }, ip });
        throw credencialesInvalidas();
      }
      if (cuenta.bloqueado) {
        await auditar({ idAdministrador: cuenta.id, accion: 'login_bloqueado', ip });
        throw credencialesInvalidas();
      }
      if (!contrasenaCorrecta) {
        await administradores.registrarFalloDeLogin(cuenta.id, { maxIntentos: loginMaxAttempts, minutosBloqueo: lockMinutes });
        await auditar({ idAdministrador: cuenta.id, accion: 'login_fallido', detalle: { motivo: 'contrasena' }, ip });
        throw credencialesInvalidas();
      }

      // Si el navegador ya traía una sesión abierta, se cierra: una sesión nueva nunca hereda el token de la anterior.
      if (tokenHashAnterior) {
        await administradores.revocarSesion(tokenHashAnterior);
      }

      const token = generarToken();
      await administradores.crearSesion({
        idAdministrador: cuenta.id,
        tokenHash: hashToken(token),
        ip,
        agenteUsuario: (agenteUsuario ?? '').slice(0, MAX_AGENTE) || null,
        horas: sessionHours,
      });
      await administradores.registrarAcceso(cuenta.id);
      administradores.limpiarSesiones().catch((err) => logger.error('No se pudieron limpiar sesiones viejas:', err.code ?? err.message));
      await auditar({ idAdministrador: cuenta.id, accion: 'login_ok', ip });

      return {
        token,
        csrf: tokenCsrf(token),
        admin: { id: cuenta.id, nombre: cuenta.nombre, correo: cuenta.correo, rol: cuenta.rol },
      };
    },

    async marcarCierrePendiente({ tokenHash }) {
      await administradores.marcarCierrePendiente(tokenHash, closeGraceSeconds);
    },

    async cerrarSesion({ admin, tokenHash, ip }) {
      await administradores.revocarSesion(tokenHash);
      await auditar({ idAdministrador: admin.id, accion: 'logout', ip });
    },

    // Cambia la contraseña propia y cierra las demás sesiones abiertas.
    async cambiarContrasena({ admin, tokenHash, actual, nueva, ip }) {
      const hashGuardado = await administradores.buscarContrasenaHash(admin.id);
      if (!hashGuardado || !(await verifyPassword(actual, hashGuardado))) {
        await auditar({ idAdministrador: admin.id, accion: 'cambio_contrasena_fallido', ip });
        throw badRequest('INVALID_CURRENT_PASSWORD', 'La contraseña actual no es correcta.', [
          { field: 'actual', message: 'La contraseña actual no es correcta.' },
        ]);
      }
      await administradores.cambiarContrasena(admin.id, await hashPassword(nueva));
      await administradores.revocarSesionesDe(admin.id, tokenHash);
      await auditar({ idAdministrador: admin.id, accion: 'cambio_contrasena', entidad: 'administrador', idEntidad: admin.id, ip });
    },
  };
}
