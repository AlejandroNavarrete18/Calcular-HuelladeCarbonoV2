import { randomUUID } from 'node:crypto';
import { rebuildFootprint } from '@huella/shared';
import { conflict, badRequest } from '../../utils/errors.js';
import { maskEmail } from '../../utils/maskEmail.js';
import { reintentar } from '../../utils/reintentar.js';
import { SinCuentasDisponiblesError, TIPO_ERROR, clasificarError } from './errores.js';
import { ARRIENDO_SEGUNDOS, iniciarLatido } from './latido.js';

// Cuántos correos como máximo puede abarcar un solo reenvío masivo.
export const MAX_REENVIO_MASIVO = 2000;
// Pausa entre correos para no saturar el servidor SMTP ni parecer un envío automático masivo.
const PAUSA_ENTRE_ENVIOS_MS = 250;
// Cuántos detalles de fallo se guardan para mostrarlos en el panel.
const MAX_ERRORES_VISIBLES = 50;
// Espera de un correo que quedó pendiente porque las cuentas de envío no pudieron enviarlo.
const ESPERA_POR_CUENTA_SEGUNDOS = 300;

const MOTIVO_POR_TIPO = Object.freeze({
  [TIPO_ERROR.CUOTA]: 'Las cuentas de envío llegaron a su límite diario.',
  [TIPO_ERROR.CREDENCIALES]: 'Una cuenta de envío rechazó sus credenciales.',
  [TIPO_ERROR.DESTINATARIO]: 'La dirección del destinatario no es válida o no existe.',
  [TIPO_ERROR.TEMPORAL]: 'Error temporal del servidor de correo. Se puede reintentar.',
});

const pausa = (milisegundos) => new Promise((resolver) => setTimeout(resolver, milisegundos));

// Las respuestas se guardan como JSON; mysql2 las entrega ya como objeto, pero se acepta también texto.
function leerRespuestas(valor) {
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor);
    } catch {
      return {};
    }
  }
  return valor ?? {};
}

// Copia del trabajo para enviarla al panel (sin exponer nada interno).
function vistaDelTrabajo(trabajo) {
  if (!trabajo) {
    return null;
  }
  return { ...trabajo, errores: [...trabajo.errores], restantes: Math.max(trabajo.total - trabajo.procesados, 0) };
}

/**
 * Reenvío de correos de resultados desde el panel (uno, varios o todos los pendientes).
 *
 * - Un reenvío masivo corre en segundo plano y el panel consulta su avance; así la petición no queda colgada.
 * - Solo puede haber un trabajo a la vez: evita que dos personas manden los mismos correos al mismo tiempo.
 * - Antes de enviar toma el trabajo de esa participación en la cola (cola_correos). Si el despachador o este mismo
 *   panel ya lo están enviando, se omite: nunca salen dos correos iguales al mismo tiempo.
 * - El correo se reconstruye con las cifras que se guardaron: dice lo mismo que vio la persona aunque el
 *   cuestionario se haya editado después.
 * - Si se acaban las cuentas con cupo, el trabajo se detiene y lo que falta queda pendiente para intentarlo luego.
 * - No aplica el límite por destinatario: ese límite protege de abusos del formulario público, no de quien administra.
 *
 * @param {object} deps
 * @param {{participaciones: object}} deps.repositories
 * @param {{sendResultsEmail: Function}} deps.mailService
 * @param {Function} deps.auditar
 * @param {{info: Function, warn: Function, error: Function}} deps.logger
 */
export function createReenviosService({ repositories, mailService, auditar, logger }) {
  const { participaciones, colaCorreo, enviosCorreo } = repositories;
  let trabajo = null;
  let ejecucion = null;
  let cancelado = false;

  // Qué hacer con el trabajo de la cola cuando el envío manual no salió.
  async function resolverFallo(idCola, fila, error) {
    if (error instanceof SinCuentasDisponiblesError) {
      // Sin cuentas con cupo: queda pendiente en la cola y saldrá solo cuando haya cupo.
      await colaCorreo.reprogramar(idCola, ESPERA_POR_CUENTA_SEGUNDOS, error.message, true);
      return { resultado: 'sin_cuentas' };
    }

    const tipo = clasificarError(error);
    logger.warn(`Reenvío a ${maskEmail(fila.correo)} falló (${tipo}): ${error.code ?? ''} ${error.message}`);
    await colaCorreo.marcarFallido(idCola, `${tipo}: ${error.code ?? ''} ${error.message}`.trim());
    return { resultado: 'fallido', motivo: MOTIVO_POR_TIPO[tipo], correo: fila.correo };
  }

  // Envía el correo con el trabajo de la cola ya tomado.
  async function enviarFila(fila, idCola, forzar) {
    if (!forzar && (await enviosCorreo.existeEnviado(fila.id))) {
      // La bitácora dice que ya salió y solo faltó anotarlo en la participación.
      await colaCorreo.confirmarEnvio(idCola, fila.id);
      return { resultado: 'omitido', motivo: 'Ya tenía un correo enviado.', correo: fila.correo };
    }

    let envio;
    try {
      envio = await mailService.sendResultsEmail({
        to: fila.correo,
        name: `${fila.nombre} ${fila.apellidos}`,
        results: rebuildFootprint(fila, leerRespuestas(fila.respuestas)),
        idParticipacion: fila.id,
      });
    } catch (error) {
      return resolverFallo(idCola, fila, error);
    }

    // En modo de prueba (dry-run) no sale ningún correo real, así que no se marca como enviado.
    if (envio.dryRun) {
      await colaCorreo.marcarOmitido(idCola, 'Modo de prueba (dry-run): no se envió.');
      return { resultado: 'simulado' };
    }

    // El correo ya salió: si anotarlo falla, no se informa como fallo (alguien lo reenviaría y llegaría repetido).
    try {
      await reintentar(() => colaCorreo.confirmarEnvio(idCola, fila.id));
    } catch (error) {
      logger.error(`El reenvío a ${maskEmail(fila.correo)} salió, pero no se pudo anotar: ${error.code ?? ''} ${error.message}`);
    }
    return { resultado: 'enviado' };
  }

  // Intenta enviar el correo de UNA participación y dice qué pasó.
  async function reenviarUno(id, forzar) {
    const fila = await participaciones.buscarParaReenvio(id);
    if (!fila) {
      return { resultado: 'omitido', motivo: 'La participación ya no existe.' };
    }
    if (fila.correoEnviado && !forzar) {
      return { resultado: 'omitido', motivo: 'Ya tenía un correo enviado.', correo: fila.correo };
    }

    const idCola = await colaCorreo.tomarParaReenvio(id, ARRIENDO_SEGUNDOS);
    if (idCola === null) {
      return { resultado: 'omitido', motivo: 'Este correo ya se está enviando en este momento.', correo: fila.correo };
    }

    const detenerLatido = iniciarLatido(colaCorreo, idCola, logger);
    try {
      return await enviarFila(fila, idCola, forzar);
    } finally {
      detenerLatido();
    }
  }

  function anotar(id, intento) {
    trabajo.procesados += 1;
    if (intento.resultado === 'enviado') {
      trabajo.enviados += 1;
    } else if (intento.resultado === 'simulado') {
      trabajo.simulados += 1;
    } else if (intento.resultado === 'omitido') {
      trabajo.omitidos += 1;
    } else {
      trabajo.fallidos += 1;
    }
    const conProblema = intento.resultado === 'fallido' || intento.resultado === 'omitido';
    if (conProblema && trabajo.errores.length < MAX_ERRORES_VISIBLES) {
      trabajo.errores.push({ idParticipacion: id, correo: intento.correo ?? null, motivo: intento.motivo, tipo: intento.resultado });
    }
  }

  async function ejecutar(ids, forzar) {
    try {
      for (const id of ids) {
        if (cancelado) {
          trabajo.detenidoPor = 'apagado';
          break;
        }
        const intento = await reenviarUno(id, forzar);
        if (intento.resultado === 'sin_cuentas') {
          trabajo.detenidoPor = 'sin_cuentas';
          break;
        }
        anotar(id, intento);
        await pausa(PAUSA_ENTRE_ENVIOS_MS);
      }
    } catch (error) {
      // Un error inesperado (por ejemplo, la base de datos) detiene el trabajo, pero no tumba el servidor.
      trabajo.detenidoPor = 'error';
      logger.error('El reenvío de correos se detuvo por un error inesperado:', error.code ?? '', error.message);
    } finally {
      trabajo.estado = 'terminado';
      trabajo.terminadoEn = new Date().toISOString();
      logger.info(`Reenvío terminado: ${trabajo.enviados} enviados, ${trabajo.fallidos} fallidos, ${trabajo.omitidos} omitidos.`);
    }
  }

  return {
    // Avance del trabajo en curso o del último que terminó (null si no hubo ninguno desde que arrancó el servidor).
    estado() {
      return vistaDelTrabajo(trabajo);
    },

    /**
     * Inicia un reenvío.
     *
     * @param {{modo: 'ids'|'pendientes', ids?: number[], forzar?: boolean}} peticion
     *   `forzar` permite volver a enviar a quien ya figura como enviado (por ejemplo, si lo recibió en spam y no lo encuentra).
     * @param {{admin: object, ip: string}} contexto
     */
    async iniciar({ modo, ids = [], forzar = false }, { admin, ip }) {
      if (trabajo?.estado === 'en_curso') {
        throw conflict('RESEND_RUNNING', 'Ya hay un reenvío en curso. Espera a que termine para iniciar otro.');
      }

      let lista = [...new Set(ids)];
      if (modo === 'pendientes') {
        lista = await participaciones.idsPendientes(MAX_REENVIO_MASIVO);
      }
      if (lista.length === 0) {
        throw badRequest('NOTHING_TO_RESEND', 'No hay correos pendientes por reenviar.');
      }

      cancelado = false;
      trabajo = {
        id: randomUUID(),
        estado: 'en_curso',
        modo,
        forzado: forzar,
        total: lista.length,
        procesados: 0,
        enviados: 0,
        fallidos: 0,
        omitidos: 0,
        simulados: 0,
        detenidoPor: null,
        errores: [],
        iniciadoPor: admin.nombre,
        iniciadoEn: new Date().toISOString(),
        terminadoEn: null,
      };

      let entidad = null;
      let idEntidad = null;
      if (lista.length === 1) {
        entidad = 'participacion';
        [idEntidad] = lista;
      }
      await auditar({
        idAdministrador: admin.id,
        accion: 'reenviar_correos',
        entidad,
        idEntidad,
        detalle: { modo, cantidad: lista.length, forzar },
        ip,
      });

      ejecucion = ejecutar(lista, forzar);
      return vistaDelTrabajo(trabajo);
    },

    // Cierre ordenado del servidor: termina el correo en curso y no empieza otro.
    async detener() {
      cancelado = true;
      await ejecucion;
    },
  };
}
