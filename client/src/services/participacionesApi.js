import { ApiError, requestJson } from './httpClient.js';

/**
 * Guarda la participación (datos + respuestas) y devuelve los resultados que calculó el servidor.
 * El servidor valida todo otra vez si falta algo responde 400 y no entrega resultados.
 *
 * @param {object} payload Datos de la persona + `answers` (ver useParticipantForm.buildPayload).
 * @param {AbortSignal} [signal]
 * @returns {Promise<{results: object, email: {state: string, to: string}}>}
 * @throws {ApiError}
 */
export async function enviarParticipacion(payload, signal) {
  const data = await requestJson('/api/participaciones', { method: 'POST', body: payload, signal });

  // Sin resultados no hay nada que mostrar
  if (!data?.results) {
    throw new ApiError('No pudimos procesar tu participación. Revisa tus datos e inténtalo de nuevo.');
  }
  return data;
}
