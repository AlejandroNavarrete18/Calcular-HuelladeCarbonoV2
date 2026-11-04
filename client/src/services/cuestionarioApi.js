import { requestJson } from './httpClient.js';

/**
 * Cuestionario vigente, leído de MySQL a través de la ap
 *
 * @returns {Promise<{version: string, questions: object[]}>} Preguntas con sus opciones sin pesos
 */
export async function fetchCuestionario(_param, signal) {
  const data = await requestJson('/api/cuestionario', { signal });
  return { version: data.version, questions: data.questions };
}
