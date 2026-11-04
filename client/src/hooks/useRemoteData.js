import { useCallback, useEffect, useState } from 'react';
import { LIST_STATUS } from '../constants.js';
import { isAbortError } from '../services/httpClient.js';

/**
 * Descarga datos del servidor (una lista, el cuestionario...) y lleva su estado.
 *
 *  - Si "param" cambia (ej. otra unidad regional) se cancela la petición anterior y se pide la nueva,
 *    así una respuesta lenta nunca pisa a una más reciente.
 *  - Al salir de la pantalla la petición pendiente se cancela
 *  - "reload()" vuelve a pedir los datos (reintento tras un error, o para traer cambios nuevos).
 *
 * @template T
 * @param {(param: unknown, signal: AbortSignal) => Promise<T>} loader Función estable (definida fuera del componente).
 * @param {unknown} param Valor que identifica qué datos pedir.
 * @param {{enabled?: boolean, emptyValue?: T}} [options]
 *   `enabled: false` no pide nada (estado "idle"). `emptyValue` es lo que se devuelve mientras no hay datos
 * @returns {{data: T, status: string, reload: () => void}}
 */
export function useRemoteData(loader, param, { enabled = true, emptyValue = null } = {}) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ requestKey: '', data: null, failed: false });
  const requestKey = `${String(param)}#${attempt}`;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const controller = new AbortController();

    loader(param, controller.signal)
      .then((data) => setResult({ requestKey, data, failed: false }))
      .catch((error) => {
        if (!isAbortError(error)) {
          setResult({ requestKey, data: null, failed: true });
        }
      });

    return () => controller.abort();
  }, [loader, param, enabled, requestKey]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  // El estado se deduce de si ya llegó la respuesta de la petición actual sin setState dentro del efecto.
  let status = LIST_STATUS.IDLE;
  if (enabled) {
    if (result.requestKey !== requestKey) {
      status = LIST_STATUS.LOADING;
    } else if (result.failed) {
      status = LIST_STATUS.ERROR;
    } else {
      status = LIST_STATUS.READY;
    }
  }

  let data = emptyValue;
  if (status === LIST_STATUS.READY) {
    data = result.data;
  }
  return { data, status, reload };
}
