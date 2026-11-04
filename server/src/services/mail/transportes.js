import nodemailer from 'nodemailer';
import { descifrar } from '../../utils/cifrado.js';

const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

// Crea el transporte SMTP de una cuenta. Los tiempos máximos evitan peticiones colgadas.
// Con `pool` la conexión se reutiliza entre envíos: no se abre una sesión nueva en Gmail por cada correo.
// Una cuenta envía un correo a la vez, por eso basta una conexión.
function crearTransporteSmtp(cuenta, contrasena) {
  return nodemailer.createTransport({
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
    host: cuenta.servidor_smtp,
    port: cuenta.puerto_smtp,
    secure: Boolean(cuenta.conexion_segura),
    auth: { user: cuenta.correo, pass: contrasena },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  });
}

// Cadena que cambia cuando se modifican los datos de conexión de la cuenta en la base de datos.
function huellaDeCuenta(cuenta) {
  return [
    cuenta.correo,
    cuenta.contrasena_cifrada,
    cuenta.servidor_smtp,
    cuenta.puerto_smtp,
    cuenta.conexion_segura,
  ].join('|');
}

/**
 * Guarda un transporte por cuenta y lo reutiliza entre envíos.
 * Si los datos de la cuenta cambian en la base de datos, el transporte se vuelve a crear.
 *
 * @param {string} secretKey MAIL_SECRET_KEY, para descifrar la contraseña de cada cuenta.
 */
export function createTransportCache(secretKey) {
  const transportes = new Map();

  return {
    /** @returns {import('nodemailer').Transporter} */
    obtener(cuenta) {
      const huella = huellaDeCuenta(cuenta);
      const guardado = transportes.get(cuenta.id_cuenta_correo);
      if (guardado?.huella === huella) {
        return guardado.transporter;
      }

      guardado?.transporter.close();
      const contrasena = descifrar(cuenta.contrasena_cifrada, secretKey);
      const transporter = crearTransporteSmtp(cuenta, contrasena);
      transportes.set(cuenta.id_cuenta_correo, { huella, transporter });
      return transporter;
    },

    // Cierra las conexiones abiertas (al apagar el servidor).
    cerrarTodos() {
      for (const { transporter } of transportes.values()) {
        transporter.close();
      }
      transportes.clear();
    },
  };
}
