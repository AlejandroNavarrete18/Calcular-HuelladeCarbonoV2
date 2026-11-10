import { PARTICIPANT_FIELDS, getAnswerErrors, resolveQuantities, validateParticipant } from '@huella/shared';

/**
 * Validación de lo que envía el navegador al guardar una participación.
 * Exige TODOS los datos de la persona y TODAS las respuestas del cuestionario VIGENTE que eligió (el de MySQL).
 * Las cantidades (aparatos, focos) son opcionales: lo que no se indica vale 1.
 */

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * @param {unknown} body Cuerpo ya interpretado como JSON.
 * @param {ReadonlyArray<object>} questions Cuestionario vigente que eligió la persona.
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
  const answersAreValid = getAnswerErrors(body.answers, questions).length === 0;
  if (!answersAreValid) {
    errors.push({ field: 'answers', message: 'Responde todas las preguntas del cuestionario.' });
  }

  // Las cantidades solo se revisan cuando las respuestas son válidas: dependen de las opciones elegidas.
  let quantities = {};
  if (answersAreValid) {
    const resolved = resolveQuantities(body.quantities, body.answers, questions);
    quantities = resolved.value;
    if (resolved.errors.length > 0) {
      errors.push({ field: 'quantities', message: 'Revisa las cantidades indicadas.' });
    }
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    // website es un campo trampa invisible para las personas: si trae algo, es un bot.
    isBot: typeof body.website === 'string' && body.website.trim() !== '',
    value: { ...participant.value, answers: body.answers, quantities },
  };
}
