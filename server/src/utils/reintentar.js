const pausa = (milisegundos) => new Promise((resolver) => setTimeout(resolver, milisegundos));

/**
 * Ejecuta una operación y la repite si falla, con una espera que crece en cada intento.
 * Se usa para anotar en la base de datos algo que ya ocurrió (por ejemplo, un correo que ya salió).
 *
 * @template T
 * @param {() => Promise<T>} operacion
 * @param {{veces?: number, esperaMs?: number}} [opciones]
 * @returns {Promise<T>}
 * @throws el error del último intento si todos fallan
 */
export async function reintentar(operacion, { veces = 5, esperaMs = 500 } = {}) {
  let ultimoError;
  for (let intento = 1; intento <= veces; intento += 1) {
    try {
      return await operacion();
    } catch (error) {
      ultimoError = error;
      if (intento < veces) {
        await pausa(esperaMs * intento);
      }
    }
  }
  throw ultimoError;
}
