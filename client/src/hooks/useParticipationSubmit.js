import { useCallback, useEffect, useRef, useState } from 'react';
import { SEND_STATUS } from '../constants.js';
import { enviarParticipacion } from '../services/participacionesApi.js';
import { isAbortError } from '../services/httpClient.js';

/**
 * Envío de la participación al servidor: estado (enviando, error, listo) y mensaje de error.
 * Si la persona sale de la pantalla mientras se envía, la petición se cancela.
 */
export function useParticipationSubmit() {
  const [status, setStatus] = useState(SEND_STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState('');
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  /**
   * @returns {Promise<{results: object, email: object}|null>} La respuesta del servidor, o null si falló.
   */
  const submit = useCallback(async (payload) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus(SEND_STATUS.SENDING);
    setErrorMessage('');

    try {
      const response = await enviarParticipacion(payload, controller.signal);
      setStatus(SEND_STATUS.DONE);
      return response;
    } catch (error) {
      if (!isAbortError(error)) {
        setStatus(SEND_STATUS.ERROR);
        setErrorMessage(error.message);
      }
      return null;
    }
  }, []);

  return { status, errorMessage, submit };
}
