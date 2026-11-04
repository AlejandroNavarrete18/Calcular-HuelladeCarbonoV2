// Tiempo que un correo reclamado se considera de quien lo está enviando.
export const ARRIENDO_SEGUNDOS = 120;
// Cada cuánto se renueva el arriendo mientras el envío sigue en marcha.
const LATIDO_MS = 30_000;

/**
 * Mientras un correo se envía, renueva su arriendo en la cola. Así el arriendo puede ser corto (si el servidor cae,
 * el correo se recupera pronto) sin que un envío lento sea tomado por otro ciclo y salga dos veces.
 *
 * @param {{renovar: Function}} colaCorreo
 * @param {number} id id del trabajo en cola_correos
 * @param {{warn: Function}} logger
 * @returns {() => void} detiene el latido
 */
export function iniciarLatido(colaCorreo, id, logger) {
  const temporizador = setInterval(() => {
    colaCorreo.renovar(id, ARRIENDO_SEGUNDOS).catch((error) => {
      logger.warn(`No se pudo renovar el arriendo del correo en cola ${id}:`, error.code ?? '', error.message);
    });
  }, LATIDO_MS);
  temporizador.unref();

  return () => clearInterval(temporizador);
}
