import { buildResultsEmail } from '../../templates/resultsEmail.js';
import { getEmailAttachments } from '../../templates/emailAssets.js';
import { maskEmail } from '../../utils/maskEmail.js';
import { reintentar } from '../../utils/reintentar.js';
import { TIPO_ERROR, SinCuentasDisponiblesError, clasificarError } from './errores.js';
import { createTransportCache } from './transportes.js';
import { writeDryRunPreview } from './vistaPrevia.js';

// Cuántas cuentas se prueban para un mismo correo antes de rendirse.
const MAX_CUENTAS_POR_ENVIO = 3;
// Cuánto se pausa una cuenta que alcanzó el límite del proveedor.
const MINUTOS_BLOQUEO_CUOTA = 24 * 60;

/**
 * Servicio de correo con rotación de cuentas por turnos.
 *
 * La cola DURADERA de correos está en MySQL (tabla `cola_correos`) y la maneja el despachador
 * (despachador.service.js). La cola de este archivo es solo en memoria y contiene únicamente los envíos que el
 * despachador ya reclamó (como máximo uno por cuenta activa): si el servidor cae, el despachador los recupera.
 *
 * - Los envíos reclamados se atienden en orden de llegada (FIFO).
 * - A cada envío se le asigna la cuenta que lleva más tiempo sin enviar (ver `reservarCuenta`), así los
 *   correos se intercalan entre todas las cuentas con cupo.
 * - Una cuenta envía un correo a la vez; si hay dos solicitudes simultáneas salen en paralelo desde cuentas
 *   distintas. Si todas las cuentas están ocupadas, el envío espera su turno en la cola.
 * - Si una cuenta falla, el correo vuelve al frente de la cola y se prueba con otra.
 *
 * @param {object} deps
 * @param {ReturnType<import('../../repositories/cuentasCorreo.repository.js').createCuentasCorreoRepository>} deps.cuentasCorreo
 * @param {ReturnType<import('../../repositories/enviosCorreo.repository.js').createEnviosCorreoRepository>} deps.enviosCorreo
 * @param {{dryRun: boolean, fromName: string, replyTo: string}} deps.mailConfig
 * @param {string} deps.secretKey MAIL_SECRET_KEY (64 caracteres hexadecimales)
 * @param {{info: Function, warn: Function, error: Function}} deps.logger
 */
export function createMailService({ cuentasCorreo, enviosCorreo, mailConfig, secretKey, logger }) {
  const transportes = createTransportCache(secretKey);

  // Aplica a la cuenta la consecuencia que corresponde al tipo de error.
  async function aplicarConsecuencia(cuenta, tipo, motivo) {
    const id = cuenta.id_cuenta_correo;

    if (tipo === TIPO_ERROR.CUOTA) {
      await cuentasCorreo.bloquearCuenta(id, MINUTOS_BLOQUEO_CUOTA, motivo);
      logger.warn(`Cuenta ${maskEmail(cuenta.correo)} alcanzó su límite: pausada ${MINUTOS_BLOQUEO_CUOTA} min.`);
      return;
    }

    // En los demás casos el correo no salió, así que el cupo reservado se devuelve.
    await cuentasCorreo.liberarCupo(id);

    if (tipo === TIPO_ERROR.CREDENCIALES) {
      await cuentasCorreo.desactivarCuenta(id, motivo);
      logger.error(`Cuenta ${maskEmail(cuenta.correo)} desactivada: credenciales rechazadas.`);
    } else if (tipo === TIPO_ERROR.TEMPORAL) {
      await cuentasCorreo.registrarError(id, motivo);
    }
  }

  /**
   * Guarda el éxito en la base de datos. Cada escritura se reintenta por separado. Si aun así la base falla NO se
   * lanza error: el correo ya salió y reintentar con otra cuenta enviaría un duplicado.
   */
  async function registrarExito(cuenta, to, subject, messageId, idParticipacion) {
    try {
      await reintentar(() => cuentasCorreo.confirmarEnvio(cuenta.id_cuenta_correo));
      await reintentar(() =>
        enviosCorreo.registrarEnvio({
          idParticipacion,
          idCuenta: cuenta.id_cuenta_correo,
          remitente: cuenta.correo,
          destinatario: to,
          asunto: subject,
          estado: 'enviado',
          idMensaje: messageId,
        })
      );
    } catch (err) {
      logger.error(`El correo salió, pero no se pudo registrar en la base de datos: ${err.message}`);
    }
  }

  async function registrarFallo(cuenta, to, subject, err, tipo, motivo, idParticipacion) {
    await enviosCorreo.registrarEnvio({
      idParticipacion,
      idCuenta: cuenta.id_cuenta_correo,
      remitente: cuenta.correo,
      destinatario: to,
      asunto: subject,
      estado: 'fallido',
      tipoError: tipo,
      codigoError: String(err.code ?? err.responseCode ?? ''),
      mensajeError: motivo,
    });
  }

  // ---------------------------------------------------------------------------------------------
  // Cola de envíos
  // ---------------------------------------------------------------------------------------------
  const cola = []; // trabajos esperando cuenta, en orden de llegada
  const ocupadas = new Set(); // ids de cuentas que están enviando un correo ahora mismo
  let repartiendo = false;
  let hayTrabajoNuevo = false;

  // Envía UN correo con la cuenta ya reservada. Si falla por culpa de la cuenta, lo devuelve al frente de la cola.
  async function enviarConCuenta(trabajo, cuenta) {
    const { to, subject, html, text, idParticipacion } = trabajo;
    trabajo.intentadas.push(cuenta.id_cuenta_correo);

    let info;
    try {
      info = await transportes.obtener(cuenta).sendMail({
        from: { name: cuenta.nombre_remitente || mailConfig.fromName, address: cuenta.correo },
        replyTo: mailConfig.replyTo || undefined,
        headers: { 'Auto-Submitted': 'auto-generated' },
        to,
        subject,
        text,
        html,
        attachments: getEmailAttachments(),
      });
    } catch (err) {
      trabajo.ultimoError = err;
      const tipo = clasificarError(err);
      const motivo = `${err.code ?? ''} ${err.responseCode ?? ''} ${err.message}`.trim();

      try {
        await registrarFallo(cuenta, to, subject, err, tipo, motivo, idParticipacion);
        await aplicarConsecuencia(cuenta, tipo, motivo);
      } catch (errBase) {
        logger.error(`No se pudo registrar el fallo de ${maskEmail(cuenta.correo)}: ${errBase.message}`);
      }

      if (tipo === TIPO_ERROR.DESTINATARIO) {
        // El problema es el correo de la persona: otra cuenta fallaría igual.
        trabajo.reject(err);
        return;
      }
      if (trabajo.intentadas.length >= MAX_CUENTAS_POR_ENVIO) {
        trabajo.reject(err);
        return;
      }
      logger.warn(`Falló ${maskEmail(cuenta.correo)} (${tipo}); se intenta con otra cuenta.`);
      cola.unshift(trabajo); // conserva su lugar: es el siguiente en salir
      return;
    }

    await registrarExito(cuenta, to, subject, info.messageId, idParticipacion);
    trabajo.resolve({ messageId: info.messageId, dryRun: false });
  }

  // Asigna cuentas libres a los trabajos de la cola, de uno en uno y en orden.
  async function repartir() {
    while (cola.length > 0) {
      const trabajo = cola[0];
      let cuenta = null;
      try {
        // Se excluyen las cuentas que ya están enviando y las que ya fallaron con este correo.
        cuenta = await cuentasCorreo.reservarCuenta([...ocupadas, ...trabajo.intentadas]);
      } catch (err) {
        cola.shift();
        trabajo.reject(err);
        continue;
      }

      if (!cuenta) {
        if (ocupadas.size > 0) {
          // Hay cuentas enviando: cuando una termine se vuelve a repartir.
          return;
        }
        // Ninguna cuenta ocupada y ninguna disponible: no hay con qué enviar.
        cola.shift();
        trabajo.reject(trabajo.ultimoError ?? new SinCuentasDisponiblesError());
        continue;
      }

      cola.shift();
      const id = cuenta.id_cuenta_correo;
      ocupadas.add(id);
      // Sin await: la cuenta envía en paralelo mientras se asigna la siguiente a otro trabajo.
      enviarConCuenta(trabajo, cuenta)
        .catch((err) => trabajo.reject(err))
        .finally(() => {
          ocupadas.delete(id);
          procesarCola();
        });
    }
  }

  // Punto de entrada del reparto: garantiza que solo un ciclo asigna cuentas a la vez.
  async function procesarCola() {
    hayTrabajoNuevo = true;
    if (repartiendo) {
      return;
    }
    repartiendo = true;
    try {
      while (hayTrabajoNuevo) {
        hayTrabajoNuevo = false;
        await repartir();
      }
    } finally {
      repartiendo = false;
    }
  }

  return {
    // Al arrancar: comprueba las credenciales de cada cuenta activa (no envía nada).
    async verify() {
      if (mailConfig.dryRun) {
        logger.warn('Modo DRY-RUN activo: los correos NO se envían, se guardan en server/.dry-run/');
        return;
      }

      const cuentas = await cuentasCorreo.listarActivas();
      if (cuentas.length === 0) {
        logger.error('No hay cuentas activas en cuentas_correo: no se podrán enviar correos.');
        return;
      }

      for (const cuenta of cuentas) {
        try {
          await transportes.obtener(cuenta).verify();
          logger.info(`Cuenta ${maskEmail(cuenta.correo)} verificada.`);
        } catch (err) {
          logger.error(`Cuenta ${maskEmail(cuenta.correo)} NO válida:`, err.code ?? '', err.message);
        }
      }
    },

    /**
     * Pone en la cola el correo de resultados y espera a que se envíe (o falle definitivamente).
     *
     * @param {{to: string, name: string, results: object, idParticipacion?: number|null}} params
     * @returns {Promise<{messageId: string, dryRun?: boolean}>}
     * @throws el error original si el destinatario es inválido, o SinCuentasDisponiblesError
     */
    async sendResultsEmail({ to, name, results, idParticipacion = null }) {
      const { subject, html, text } = buildResultsEmail({ name, results });

      if (mailConfig.dryRun) {
        await writeDryRunPreview({ to, subject, html, text });
        return { messageId: 'dry-run', dryRun: true };
      }

      return new Promise((resolve, reject) => {
        cola.push({ to, subject, html, text, idParticipacion, intentadas: [], ultimoError: null, resolve, reject });
        procesarCola();
      });
    },

    // Cierra las conexiones SMTP abiertas (al apagar el servidor).
    cerrar() {
      transportes.cerrarTodos();
    },

    // Cuántos envíos esperan turno y cuántas cuentas están enviando en este momento (para diagnóstico).
    estadoCola() {
      return { enEspera: cola.length, cuentasEnviando: ocupadas.size };
    },
  };
}
