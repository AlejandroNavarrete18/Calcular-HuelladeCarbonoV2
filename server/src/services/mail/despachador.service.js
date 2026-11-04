import { rebuildFootprint } from '@huella/shared';
import { maskEmail } from '../../utils/maskEmail.js';
import { reintentar } from '../../utils/reintentar.js';
import { SinCuentasDisponiblesError, TIPO_ERROR, clasificarError } from './errores.js';
import { ARRIENDO_SEGUNDOS, iniciarLatido } from './latido.js';

// Cada cuánto revisa la cola aunque nadie lo despierte (cubre esperas vencidas y trabajos de un servidor caído).
const INTERVALO_REVISION_MS = 3_000;
// Cada cuánto revisa mientras no haya ninguna cuenta con cupo: solo consulta, no toca la cola.
const INTERVALO_SIN_CUENTAS_MS = 30_000;
// Intentos por correo antes de rendirse (después queda como "fallido" y se puede reenviar desde el panel).
// Con la espera creciente de abajo, cubre una caída del servidor de correo de unas 4 horas.
const MAX_INTENTOS = 10;
// Espera de un correo cuando el problema fue de la cuenta (cuota o credenciales) y no del correo.
const ESPERA_POR_CUENTA_SEGUNDOS = 300;
// Espera tras un error temporal: 1, 2, 4, 8... minutos, con tope de una hora.
const ESPERA_BASE_SEGUNDOS = 60;
const ESPERA_MAXIMA_SEGUNDOS = 3_600;
// Tope de correos enviándose a la vez (en la práctica, uno por cuenta con cupo).
const MAX_PARALELO = 10;
// Reintentos al anotar en la base de datos un correo que ya salió.
const REINTENTOS_ANOTAR = { veces: 5, esperaMs: 500 };

// Espera creciente con una variación del 20 % para que los correos fallidos no vuelvan todos al mismo tiempo.
function esperaTemporal(intentos) {
  const base = Math.min(ESPERA_BASE_SEGUNDOS * 2 ** Math.max(intentos - 1, 0), ESPERA_MAXIMA_SEGUNDOS);
  const variacion = 0.8 + Math.random() * 0.4;
  return Math.round(base * variacion);
}

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

/**
 * Despachador de la cola persistente de correos.
 *
 * - Toma de `cola_correos` los correos que ya les toca (en orden de llegada) y los manda al servicio de correo,
 *   que los reparte por turnos entre las cuentas.
 * - Solo toma tantos trabajos como cuentas con cupo haya: la cola real vive en MySQL, no en la memoria del servidor.
 *   Sin ninguna cuenta con cupo no toca la cola; solo vuelve a mirar cada 30 segundos.
 * - Mientras un correo se envía, renueva su arriendo (latido). Si el servidor cae, el latido se detiene, el arriendo
 *   vence y el correo se retoma al volver a arrancar.
 * - Evita duplicados en tres puntos: no reclama lo que este mismo proceso ya está enviando, consulta la bitácora
 *   antes de enviar, y cuando un correo sale pero no se logra anotar, lo sigue intentando anotar sin volver a enviarlo.
 * - Errores de la cuenta (cuota, credenciales): el correo espera sin gastar intentos. Errores temporales: se reintenta
 *   con espera creciente. Rechazo definitivo o intentos agotados: queda "fallido" para reenviarlo a mano desde el panel.
 * - Es "al menos una vez": si el proceso muere justo después de que el proveedor aceptó el correo y antes de que
 *   la bitácora quede escrita, ese correo podría repetirse al reiniciar. Es el límite de cualquier cola con SMTP.
 *
 * @param {object} deps
 * @param {ReturnType<import('../../repositories/index.js').createRepositories>} deps.repositories
 * @param {{sendResultsEmail: Function}} deps.mailService
 * @param {{release: Function}} deps.recipientLimiter
 * @param {{info: Function, warn: Function, error: Function}} deps.logger
 * @param {boolean} [deps.dryRun] modo de prueba: no hace falta ninguna cuenta para "enviar".
 * @param {{veces: number, esperaMs: number}} [deps.reintentos] reintentos al anotar un envío (se ajusta solo en pruebas).
 */
export function createDespachadorCorreo({
  repositories,
  mailService,
  recipientLimiter,
  logger,
  dryRun = false,
  reintentos = REINTENTOS_ANOTAR,
}) {
  const { colaCorreo, cuentasCorreo, enviosCorreo, participaciones } = repositories;

  const enCurso = new Map(); // id de trabajo -> envío que este proceso está haciendo ahora mismo
  const porAnotar = new Map(); // id de trabajo -> id de participación: salió el correo y falta anotarlo
  let activo = false;
  let temporizador = null;
  let revisando = false;
  let hayQueRevisarDeNuevo = false;
  let sinCuentas = false;

  function idsEnMarcha() {
    return [...enCurso.keys(), ...porAnotar.keys()];
  }

  function anotarDisponibilidad(hayCuentas) {
    if (!hayCuentas && !sinCuentas) {
      sinCuentas = true;
      logger.warn('No hay cuentas con cupo: los correos pendientes esperan en la cola.');
    }
    if (hayCuentas && sinCuentas) {
      sinCuentas = false;
      logger.info('Hay cuentas con cupo otra vez: se reanuda el envío de correos.');
    }
  }

  // Cuántos correos más se pueden empezar a enviar ahora.
  async function lugaresLibres() {
    if (dryRun) {
      return MAX_PARALELO - enCurso.size;
    }
    const { cuentas, cupo } = await cuentasCorreo.resumenDisponible();
    anotarDisponibilidad(cuentas > 0 && cupo > 0);
    if (cuentas === 0 || cupo === 0) {
      return 0;
    }
    return Math.min(MAX_PARALELO, cuentas, cupo) - enCurso.size;
  }

  async function resolverFallo(trabajo, fila, error) {
    const { id, intentos } = trabajo;

    if (error instanceof SinCuentasDisponiblesError) {
      await colaCorreo.reprogramar(id, ESPERA_POR_CUENTA_SEGUNDOS, error.message, true);
      return;
    }

    const tipo = clasificarError(error);
    const motivo = `${tipo}: ${error.code ?? ''} ${error.message}`.trim();

    if (tipo === TIPO_ERROR.CUOTA || tipo === TIPO_ERROR.CREDENCIALES) {
      // La cuenta quedó pausada o desactivada: el correo no tiene la culpa, no gasta intento.
      await colaCorreo.reprogramar(id, ESPERA_POR_CUENTA_SEGUNDOS, motivo, true);
      logger.warn(`Correo a ${maskEmail(fila.correo)} en espera: las cuentas de envío no pudieron enviarlo (${tipo}).`);
      return;
    }

    if (tipo === TIPO_ERROR.DESTINATARIO || intentos >= MAX_INTENTOS) {
      await colaCorreo.marcarFallido(id, motivo);
      recipientLimiter.release(fila.correo);
      logger.error(`Correo a ${maskEmail(fila.correo)} marcado como fallido (${tipo}, ${intentos} intento(s)).`);
      return;
    }

    const espera = esperaTemporal(intentos);
    await colaCorreo.reprogramar(id, espera, motivo);
    logger.warn(`Correo a ${maskEmail(fila.correo)} falló (${tipo}); se reintenta en ${Math.round(espera / 60)} min.`);
  }

  // Desde que el correo sale hasta que queda anotado no se puede perder el registro: de eso depende no duplicarlo.
  async function anotarEnvio(trabajo, fila) {
    const { id, idParticipacion } = trabajo;
    try {
      await reintentar(() => colaCorreo.confirmarEnvio(id, idParticipacion), reintentos);
      logger.info(`Resultados enviados a ${maskEmail(fila.correo)}.`);
    } catch (error) {
      porAnotar.set(id, idParticipacion);
      logger.error(
        `El correo a ${maskEmail(fila.correo)} salió, pero no se pudo anotar (${error.code ?? error.message}). ` +
          'Se seguirá intentando anotarlo; no se enviará otra vez.'
      );
    }
  }

  async function enviarYAnotar(trabajo, fila) {
    const { id, idParticipacion } = trabajo;

    let envio;
    try {
      envio = await mailService.sendResultsEmail({
        to: fila.correo,
        name: `${fila.nombre} ${fila.apellidos}`,
        results: rebuildFootprint(fila, leerRespuestas(fila.respuestas)),
        idParticipacion,
      });
    } catch (error) {
      await resolverFallo(trabajo, fila, error);
      return;
    }

    if (envio.dryRun) {
      await colaCorreo.marcarOmitido(id, 'Modo de prueba (dry-run): no se envió.');
      return;
    }
    await anotarEnvio(trabajo, fila);
  }

  async function procesar(trabajo) {
    const { id, idParticipacion } = trabajo;

    const fila = await participaciones.buscarParaReenvio(idParticipacion);
    if (!fila) {
      await colaCorreo.marcarOmitido(id, 'La participación ya no existe.');
      return;
    }
    if (fila.correoEnviado) {
      // Por ejemplo, un administrador ya lo reenvió desde el panel mientras esperaba en la cola.
      await colaCorreo.marcarOmitido(id, 'Ya tenía un correo enviado.');
      return;
    }
    if (await enviosCorreo.existeEnviado(idParticipacion)) {
      // La bitácora dice que ya salió y solo faltó anotarlo en la participación: se repara sin enviar otra vez.
      await colaCorreo.confirmarEnvio(id, idParticipacion);
      logger.warn(`El correo a ${maskEmail(fila.correo)} ya constaba como enviado: se corrigió su registro sin reenviarlo.`);
      return;
    }

    const detenerLatido = iniciarLatido(colaCorreo, id, logger);
    try {
      await enviarYAnotar(trabajo, fila);
    } finally {
      detenerLatido();
    }
  }

  function lanzar(trabajo) {
    const tarea = procesar(trabajo)
      .catch((error) => logger.error(`Error inesperado al procesar el correo en cola ${trabajo.id}:`, error.code ?? '', error.message))
      .finally(() => {
        enCurso.delete(trabajo.id);
        despertar();
      });
    enCurso.set(trabajo.id, tarea);
  }

  // Reintenta anotar los correos que ya salieron y quedaron sin anotar por un fallo de la base de datos.
  async function anotarPendientes() {
    for (const [id, idParticipacion] of [...porAnotar]) {
      try {
        await colaCorreo.confirmarEnvio(id, idParticipacion);
        porAnotar.delete(id);
        logger.info(`Se anotó el correo en cola ${id}, que había salido sin quedar registrado.`);
      } catch (error) {
        logger.warn(`Sigue sin poder anotarse el correo en cola ${id}:`, error.code ?? '', error.message);
        return;
      }
    }
  }

  function programar(milisegundos) {
    clearTimeout(temporizador);
    if (!activo) {
      return;
    }
    temporizador = setTimeout(revisar, milisegundos);
    temporizador.unref();
  }

  // Un ciclo de revisión: reclama trabajos hasta llenar la capacidad. Solo corre uno a la vez.
  async function revisar() {
    if (!activo) {
      return;
    }
    if (revisando) {
      hayQueRevisarDeNuevo = true;
      return;
    }
    revisando = true;
    try {
      await anotarPendientes();
      do {
        hayQueRevisarDeNuevo = false;
        const lugares = await lugaresLibres();
        if (lugares > 0 && activo) {
          const trabajos = await colaCorreo.reclamar(lugares, ARRIENDO_SEGUNDOS, idsEnMarcha());
          trabajos.forEach(lanzar);
          if (trabajos.length === lugares) {
            hayQueRevisarDeNuevo = true;
          }
        }
      } while (hayQueRevisarDeNuevo && activo);
    } catch (error) {
      logger.error('No se pudo revisar la cola de correos:', error.code ?? '', error.message);
    } finally {
      revisando = false;
      let espera = INTERVALO_REVISION_MS;
      if (sinCuentas) {
        espera = INTERVALO_SIN_CUENTAS_MS;
      }
      programar(espera);
    }
  }

  // Revisa la cola de inmediato (se llama cuando entra un correo nuevo o termina un envío).
  function despertar() {
    if (activo) {
      revisar();
    }
  }

  return {
    despertar,

    // Al arrancar el servidor: retoma lo que haya quedado pendiente en la base de datos.
    async iniciar() {
      activo = true;
      try {
        const conteo = await colaCorreo.contarPorEstado();
        const porEnviar = conteo.pendiente + conteo.enviando;
        if (porEnviar > 0) {
          logger.info(`Cola de correos: ${porEnviar} correo(s) por enviar se retoman ahora.`);
        }
      } catch (error) {
        logger.error('No se pudo leer la cola de correos al arrancar:', error.code ?? '', error.message);
      }
      revisar();
    },

    // Cierre ordenado: no toma más trabajos y espera a que terminen los envíos en curso.
    // Lo que no se alcanzó a enviar sigue en la base de datos y sale cuando el servidor vuelva.
    async detener() {
      activo = false;
      clearTimeout(temporizador);
      await Promise.allSettled([...enCurso.values()]);
      await anotarPendientes();
      if (porAnotar.size > 0) {
        logger.error(`Quedan ${porAnotar.size} correo(s) enviados sin anotar en la base de datos (ids de cola: ${[...porAnotar.keys()].join(', ')}).`);
      }
    },

    estado() {
      return colaCorreo.contarPorEstado();
    },
  };
}
