import { useEffect, useRef, useState } from 'react';
import { consultarReenvio, reenviarCorreos } from './adminApi.js';
import { errorMessage } from './errors.js';

const POLL_MS = 1500;

/**
 * Lleva el reenvío de correos: lo inicia, consulta su avance cada poco tiempo y avisa cuando termina.
 * Si la persona sale de la pantalla y vuelve mientras hay uno en curso, lo retoma.
 *
 * @param {{onFinished?: (job: object) => void}} [options]
 */
export function useResend({ onFinished } = {}) {
  const [job, setJob] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const finished = useRef(onFinished);

  useEffect(() => {
    finished.current = onFinished;
  });

  // Al abrir la pantalla: si ya hay un reenvío corriendo, se muestra su avance.
  useEffect(() => {
    const controller = new AbortController();
    consultarReenvio(controller.signal)
      .then((current) => {
        if (current?.estado === 'en_curso') {
          setJob(current);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const running = job?.estado === 'en_curso';
  useEffect(() => {
    if (!running) {
      return undefined;
    }
    const timer = setInterval(async () => {
      try {
        const current = await consultarReenvio();
        if (!current) {
          return;
        }
        setJob(current);
        if (current.estado !== 'en_curso') {
          finished.current?.(current);
        }
      } catch {
        // Un fallo de red momentáneo no detiene el seguimiento: se vuelve a consultar en el siguiente turno.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running]);

  // Inicia un reenvío: { modo: 'ids', ids, forzar } o { modo: 'pendientes' }. Devuelve true si arrancó.
  async function start(request) {
    setStarting(true);
    setError('');
    try {
      const data = await reenviarCorreos(request);
      setJob(data.trabajo);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setStarting(false);
    }
  }

  return { job, running, starting, error, start, dismiss: () => setJob(null), clearError: () => setError('') };
}
