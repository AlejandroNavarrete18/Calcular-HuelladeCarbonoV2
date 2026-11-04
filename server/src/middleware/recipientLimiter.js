import { createHash } from 'node:crypto';

const MAX_TRACKED_RECIPIENTS = 5000;

/**
 * Límite de correos por DESTINATARIO (además del límite por IP).
 * Evita que alguien use el servidor para llenar de correos la bandeja de otra persona.
 *
 * @param {{max: number, windowMs: number}} options
 */
export function createRecipientLimiter({ max, windowMs }) {
  /** @type {Map<string, number[]>} hash del correo -> marcas de tiempo de sus envíos recientes */
  const hits = new Map();

  const keyOf = (email) => createHash('sha256').update(email).digest('hex');
  const onlyRecent = (timestamps, currentTime) => timestamps.filter((ts) => currentTime - ts < windowMs);

  // Olvida a los destinatarios sin envíos recientes para que el mapa no crezca sin límite.
  function sweep() {
    const currentTime = Date.now();
    for (const [key, timestamps] of hits) {
      const recent = onlyRecent(timestamps, currentTime);
      if (recent.length > 0) {
        hits.set(key, recent);
      } else {
        hits.delete(key);
      }
    }
  }

  return {
    // Intenta "gastar" un envío. Devuelve false si el destinatario ya alcanzó su límite.
    tryConsume(email) {
      const currentTime = Date.now();
      const key = keyOf(email);
      const recent = onlyRecent(hits.get(key) ?? [], currentTime);

      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }

      recent.push(currentTime);
      hits.set(key, recent);
      if (hits.size > MAX_TRACKED_RECIPIENTS) {
        sweep();
      }
      return true;
    },

    // Devuelve un envío (se usa si el correo falló, para no penalizar a quien no recibió nada).
    release(email) {
      const timestamps = hits.get(keyOf(email));
      if (timestamps && timestamps.length > 0) {
        timestamps.pop();
      }
    },
  };
}
