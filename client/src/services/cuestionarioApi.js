import { requestJson } from './httpClient.js';

/**
 * Cuestionario vigente (hogar o trabajo), leído de MySQL a través de la api.
 *
 * @param {string} clave Clave del cuestionario elegido (QUESTIONNAIRE_KEY).
 * @param {AbortSignal} signal
 * @returns {Promise<{version: string, questions: object[]}>} Preguntas con sus opciones sin pesos
 */
export async function fetchCuestionario(clave, signal) {
  const data = await requestJson(`/api/cuestionario/${encodeURIComponent(clave)}`, { signal });
  return { version: data.version, questions: data.questions };
}
