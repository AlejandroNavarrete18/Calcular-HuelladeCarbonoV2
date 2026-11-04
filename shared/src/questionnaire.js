import { QUESTION_TYPE } from './questionTypes.js';
import { CATEGORIES } from './categories.js';
import { COMMUTE_QUESTIONS } from './calculator.js';

/**
 * Revisión de un cuestionario leído de la base de datos.
 * Como las preguntas y los pesos se editan en MySQL, aquí se detecta lo que dejaría el cálculo
 */

const hasWeight = (option) => typeof option.kgCO2 === 'number';
const hasHours = (option) => typeof option.hours === 'number';

function findCommuteProblems(questions) {
  const problems = [];
  const modes = questions.find((question) => question.id === COMMUTE_QUESTIONS.modes);
  const time = questions.find((question) => question.id === COMMUTE_QUESTIONS.time);

  if (!modes || modes.type !== QUESTION_TYPE.CHECKBOX) {
    problems.push(`Debe existir la pregunta "${COMMUTE_QUESTIONS.modes}" de opción múltiple (modos de transporte).`);
  }
  if (!time || time.type !== QUESTION_TYPE.RADIO) {
    problems.push(`Debe existir la pregunta "${COMMUTE_QUESTIONS.time}" de opción única (tiempo del recorrido).`);
  }
  return problems;
}

function findMatrixProblems(question) {
  const problems = [];
  if (question.columns.length === 0) {
    problems.push(`La pregunta "${question.id}" (matriz) no tiene columnas.`);
  }
  if (question.rows.length === 0) {
    problems.push(`La pregunta "${question.id}" (matriz) no tiene filas.`);
  }
  for (const row of question.rows) {
    for (const column of question.columns) {
      if (typeof row.weights[column.id] !== 'number') {
        problems.push(`Falta el peso de la fila "${row.id}" con la columna "${column.id}" en la pregunta "${question.id}" (pesos_matriz).`);
      }
    }
  }
  return problems;
}

function findOptionProblems(question) {
  const problems = [];
  if (question.options.length === 0) {
    problems.push(`La pregunta "${question.id}" no tiene opciones.`);
  }
  const isTimeQuestion = question.id === COMMUTE_QUESTIONS.time;
  for (const option of question.options) {
    if (isTimeQuestion && !hasHours(option)) {
      problems.push(`La opción "${option.id}" de "${question.id}" no tiene horas.`);
    }
    if (!isTimeQuestion && !hasWeight(option)) {
      problems.push(`La opción "${option.id}" de "${question.id}" no tiene kg_co2 (usa 0 si no emite).`);
    }
  }
  return problems;
}

/**
 * @param {ReadonlyArray<object>} questions Cuestionario completo (con pesos).
 * @returns {string[]} Problemas encontrados; vacía si el cuestionario se puede usar.
 */
export function findQuestionnaireProblems(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return ['No hay preguntas en la tabla preguntas.'];
  }

  const problems = [];
  const categories = CATEGORIES.map((category) => category.key);

  for (const question of questions) {
    if (!categories.includes(question.category)) {
      problems.push(`La pregunta "${question.id}" tiene una categoría desconocida: "${question.category}".`);
    }
    if (question.type === QUESTION_TYPE.MATRIX) {
      problems.push(...findMatrixProblems(question));
    } else {
      problems.push(...findOptionProblems(question));
    }
  }
  problems.push(...findCommuteProblems(questions));
  return problems;
}

/**
 * Versión pública del cuestionario para el navegador: solo lo necesario para dibujarlo y validarlo.
 * NO incluye pesos ni horas: el cálculo ocurre únicamente en el servidor.
 *
 * @param {ReadonlyArray<object>} questions Cuestionario completo.
 */
export function toPublicQuestionnaire(questions) {
  const labelOnly = ({ id, label }) => ({ id, label });

  return questions.map((question) => {
    const publicQuestion = {
      id: question.id,
      category: question.category,
      number: question.number,
      title: question.title,
      type: question.type,
    };
    if (question.subtitle) {
      publicQuestion.subtitle = question.subtitle;
    }
    if (question.type === QUESTION_TYPE.MATRIX) {
      publicQuestion.columns = question.columns.map(labelOnly);
      publicQuestion.rows = question.rows.map(labelOnly);
    } else {
      publicQuestion.options = question.options.map(labelOnly);
    }
    return publicQuestion;
  });
}
