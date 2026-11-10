import { QUESTION_TYPE } from './questionTypes.js';

/**
 * Cantidades de las preguntas que lo permiten (`preguntas.permite_cantidad`): cuántos aparatos o focos tiene la persona.
 */
export const QUANTITY_LIMITS = Object.freeze({ min: 1, max: 999 });

// Opciones que nunca llevan cantidad, aunque la pregunta la pida (por ejemplo "No lo sé" en los focos)
const OPTIONS_WITHOUT_QUANTITY = Object.freeze(['no_se']);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// ¿Esta pregunta pide cantidad? Solo aplica a opción única y múltiple, nunca a matrices.
export function allowsQuantity(question) {
  return Boolean(question.allowQuantity) && question.type !== QUESTION_TYPE.MATRIX;
}

// ¿Esta opción admite cantidad? La pregunta debe pedirla y la opción no puede estar excluida.
export function optionAllowsQuantity(question, optionId) {
  return allowsQuantity(question) && !OPTIONS_WITHOUT_QUANTITY.includes(optionId);
}

// Claves de las opciones elegidas en una pregunta (una lista aunque sea de opción única).
export function getSelectedOptionIds(question, answer) {
  if (question.type === QUESTION_TYPE.CHECKBOX) {
    if (Array.isArray(answer)) {
      return answer;
    }
    return [];
  }
  if (typeof answer === 'string' && answer !== '') {
    return [answer];
  }
  return [];
}

/**
 * Convierte lo que se está escribiendo en un campo de cantidad en una cantidad usable:
 * entero entre el mínimo y el máximo; si está vacío o es inválido vale 1 (el valor por defecto).
 *
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeQuantity(raw) {
  const parsed = Math.trunc(Number(raw));
  if (!Number.isFinite(parsed) || parsed < QUANTITY_LIMITS.min) {
    return QUANTITY_LIMITS.min;
  }
  return Math.min(parsed, QUANTITY_LIMITS.max);
}

/**
 * Cantidades listas para enviar: una por cada opción elegida de las preguntas que piden cantidad (1 si no se escribió).
 * Descarta lo que ya no aplica (opciones desmarcadas, preguntas sin cantidad).
 *
 * @param {ReadonlyArray<object>} questions Cuestionario vigente.
 * @param {Record<string, unknown>} answers Respuestas actuales.
 * @param {Record<string, Record<string, unknown>>} [raw] Cantidades tal como las tiene la pantalla.
 * @returns {Record<string, Record<string, number>>}
 */
export function buildQuantities(questions, answers, raw = {}) {
  const result = {};
  for (const question of questions) {
    if (allowsQuantity(question)) {
      const written = raw[question.id] ?? {};
      result[question.id] = {};
      for (const optionId of getSelectedOptionIds(question, answers[question.id])) {
        if (optionAllowsQuantity(question, optionId)) {
          result[question.id][optionId] = normalizeQuantity(written[optionId] ?? QUANTITY_LIMITS.min);
        }
      }
    }
  }
  return result;
}

/**
 * Una opción elegida sin cantidad vale 1; una cantidad escrita debe ser un entero dentro de los límites.
 * Lo que no corresponde a una opción elegida se ignora.
 *
 * @param {unknown} quantities
 * @param {Record<string, unknown>} answers Respuestas ya validadas.
 * @param {ReadonlyArray<object>} questions Cuestionario vigente.
 * @returns {{errors: string[], value: Record<string, Record<string, number>>}}
 */
export function resolveQuantities(quantities, answers, questions) {
  const errors = [];
  const value = {};

  if (quantities !== undefined && quantities !== null && !isPlainObject(quantities)) {
    return { errors: ['quantities: debe ser un objeto'], value };
  }

  for (const question of questions) {
    if (allowsQuantity(question)) {
      const written = quantities?.[question.id];
      if (written !== undefined && !isPlainObject(written)) {
        errors.push(`${question.id}: cantidades inválidas`);
      } else {
        value[question.id] = {};
        for (const optionId of getSelectedOptionIds(question, answers[question.id])) {
          // Una opción sin cantidad ignora lo que se envíe para ella
          if (optionAllowsQuantity(question, optionId)) {
            const amount = written?.[optionId] ?? QUANTITY_LIMITS.min;
            const isValid = Number.isInteger(amount) && amount >= QUANTITY_LIMITS.min && amount <= QUANTITY_LIMITS.max;
            if (isValid) {
              value[question.id][optionId] = amount;
            } else {
              errors.push(`${question.id}.${optionId}: la cantidad debe ser un entero de ${QUANTITY_LIMITS.min} a ${QUANTITY_LIMITS.max}`);
            }
          }
        }
      }
    }
  }
  return { errors, value };
}
