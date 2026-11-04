import { QUESTION_TYPE } from './questionTypes.js';

// Utilidades para revisar las respuestas del cuestionario.

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * ¿Está respondida esta pregunta? (Revisión ligera, para habilitar el botón "Siguiente".)
 *
 * @param {object} question Pregunta de QUESTIONS.
 * @param {unknown} answer Respuesta guardada para esa pregunta.
 * @returns {boolean}
 */
export function isQuestionAnswered(question, answer) {
  if (!question) {
    return false;
  }
  if (question.type === QUESTION_TYPE.RADIO) {
    return Boolean(answer);
  }
  if (question.type === QUESTION_TYPE.CHECKBOX) {
    return Array.isArray(answer) && answer.length > 0;
  }
  if (question.type === QUESTION_TYPE.MATRIX) {
    if (!isPlainObject(answer)) {
      return false;
    }
    return question.rows.every((row) => Boolean(answer[row.id]));
  }
  return false;
}

// ¿La respuesta de un radio es una opción que existe?
function isValidRadio(question, value) {
  return typeof value === 'string' && question.options.some((option) => option.id === value);
}

// ¿La respuesta de un checkbox es una lista no vacía, sin repetidos y solo con opciones válidas?
function isValidCheckbox(question, value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > question.options.length) {
    return false;
  }
  if (new Set(value).size !== value.length) {
    return false;
  }
  const validIds = new Set(question.options.map((option) => option.id));
  return value.every((id) => typeof id === 'string' && validIds.has(id));
}

// ¿La respuesta de una matriz tiene una columna válida para CADA fila?
function isValidMatrix(question, value) {
  if (!isPlainObject(value)) {
    return false;
  }
  const columnIds = new Set(question.columns.map((column) => column.id));
  return question.rows.every((row) => typeof value[row.id] === 'string' && columnIds.has(value[row.id]));
}

const VALIDATORS_BY_TYPE = Object.freeze({
  [QUESTION_TYPE.RADIO]: isValidRadio,
  [QUESTION_TYPE.CHECKBOX]: isValidCheckbox,
  [QUESTION_TYPE.MATRIX]: isValidMatrix,
});

/**
 * Validación ESTRICTA de todas las respuestas (para datos no confiables, como los del navegador).
 * Exige una respuesta válida para cada pregunta.
 *
 * @param {unknown} answers
 * @param {ReadonlyArray<object>} questions Cuestionario vigente (leído de MySQL).
 * @returns {string[]} Lista de errores; vacía si todo es válido.
 */
export function getAnswerErrors(answers, questions) {
  // Sin preguntas no hay nada que validar: jamás se debe dar por buena una respuesta vacía.
  if (!Array.isArray(questions) || questions.length === 0) {
    return ['cuestionario: no hay preguntas'];
  }
  if (!isPlainObject(answers)) {
    return ['answers: debe ser un objeto'];
  }

  const errors = [];
  for (const question of questions) {
    const isValid = VALIDATORS_BY_TYPE[question.type];
    if (!isValid || !isValid(question, answers[question.id])) {
      errors.push(`${question.id}: respuesta inválida`);
    }
  }
  return errors;
}

/**
 * ¿Están respondidas TODAS las preguntas? (Revisión ligera, para habilitar el formulario final.)
 *
 * @param {Record<string, unknown>} answers
 * @param {ReadonlyArray<object>} questions Cuestionario vigente.
 * @returns {boolean} false también si todavía no hay preguntas cargadas.
 */
export function areAllQuestionsAnswered(answers, questions) {
  if (!Array.isArray(questions) || questions.length === 0 || !isPlainObject(answers)) {
    return false;
  }
  return questions.every((question) => isQuestionAnswered(question, answers[question.id]));
}
