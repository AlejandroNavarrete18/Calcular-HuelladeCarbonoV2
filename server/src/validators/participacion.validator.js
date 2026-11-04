import { PARTICIPANT_FIELDS, getAnswerErrors, validateParticipant } from '@huella/shared';

/**
 * Validación de lo que envía el navegador al guardar una participación.
 * Exige TODOS los datos de la persona y TODAS las respuestas del cuestionario VIGENTE (el de MySQL).
 */

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * @param {unknown} body Cuerpo ya interpretado como JSON.
 * @param {ReadonlyArray<object>} questions Cuestionario vigente.
 * @returns {{ok: false, errors: Array<{field: string, message: string}>}
 *   | {ok: true, isBot: boolean, value: object}}
 */
export function validateParticipationRequest(body, questions) {
  if (!isPlainObject(body)) {
    return { ok: false, errors: [{ field: 'body', message: 'Se esperaba un JSON válido.' }] };
  }

  const participant = validateParticipant(body);
  const errors = [];
  for (const { key } of PARTICIPANT_FIELDS) {
    if (participant.errors[key]) {
      errors.push({ field: key, message: participant.errors[key] });
    }
  }
  if (getAnswerErrors(body.answers, questions).length > 0) {
    errors.push({ field: 'answers', message: 'Responde todas las preguntas del cuestionario.' });
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    // website es un campo trampa invisible para las personas: si trae algo, es un bot.
    isBot: typeof body.website === 'string' && body.website.trim() !== '',
    value: { ...participant.value, answers: body.answers },
  };
}
