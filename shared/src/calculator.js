import { QUESTION_TYPE } from './questionTypes.js';
import { CATEGORIES } from './categories.js';
import { getLevel, getLevelByKey, SEMAPHORE } from './levels.js';
import { buildRecommendations } from './recommendations.js';

/**
 * Cálculo de la huella de carbono. El cuestionario (preguntas, opciones y pesos) NO está en el código:
 * llega como parámetro, leído de MySQL, así que cambiar un peso en la base cambia el resultado.
 *
 *   Cada pregunta suma a SU categoría (la columna `categoria` de la base):
 *     opción única     -> peso de la opción elegida
 *     opción múltiple  -> suma de los pesos de las opciones marcadas
 *     matriz           -> suma del peso elegido en cada fila
 *   Excepción (el recorrido diario):
 *     Transporte = PROMEDIO de los modos con peso >= 1  ×  horas del recorrido
 *     (usa las preguntas con clave COMMUTE_QUESTIONS.modes y COMMUTE_QUESTIONS.time)
 *   Barras por categoría = suma / tope (854, 4080 y 2249 kg), máximo 100 %
 *   Termómetro           = total / 8000, máximo 98 %
 */

/**
 * Claves de las dos preguntas que forman el recorrido diario. Se pueden cambiar sus textos,
 * opciones y pesos en la base, pero estas dos claves deben existir (ver findQuestionnaireProblems).
 */
export const COMMUTE_QUESTIONS = Object.freeze({ modes: 'transporte', time: 'tiempo_recorrido' });

// Tope de cada categoría para calcular el porcentaje de su barra.
const CATEGORY_MAX_KG = Object.freeze({ hogar: 854, transporte: 4080, consumo: 2249 });
const THERMOMETER_MAX_KG = 8000;
const THERMOMETER_CAP_PERCENT = 98;

// Peso (kg CO2e/año) de una opción; 0 si la opción no existe o no tiene peso.
function getOptionWeight(question, optionId) {
  const option = question.options.find((candidate) => candidate.id === optionId);
  if (!option || typeof option.kgCO2 !== 'number') {
    return 0;
  }
  return option.kgCO2;
}

// Suma los pesos de las opciones marcadas en una pregunta de checkbox.
function sumCheckboxWeights(question, selected) {
  if (!Array.isArray(selected)) {
    return 0;
  }
  let total = 0;
  for (const optionId of selected) {
    total += getOptionWeight(question, optionId);
  }
  return total;
}

// Suma el peso elegido en cada fila de una pregunta matricial.
function sumMatrixWeights(question, selection) {
  if (!selection || typeof selection !== 'object') {
    return 0;
  }
  let total = 0;
  for (const row of question.rows) {
    const weight = row.weights[selection[row.id]];
    if (typeof weight === 'number') {
      total += weight;
    }
  }
  return total;
}

// Peso de la respuesta a una pregunta, según su tipo.
function getQuestionWeight(question, answer) {
  if (question.type === QUESTION_TYPE.CHECKBOX) {
    return sumCheckboxWeights(question, answer);
  }
  if (question.type === QUESTION_TYPE.MATRIX) {
    return sumMatrixWeights(question, answer);
  }
  return getOptionWeight(question, answer);
}

// Emisiones del trayecto diario: promedio de los modos de transporte × horas del recorrido.
function calculateCommute(modesQuestion, timeQuestion, answers) {
  if (!modesQuestion || !timeQuestion || !Array.isArray(answers[modesQuestion.id])) {
    return 0;
  }

  let sum = 0;
  let countedModes = 0;
  for (const modeId of answers[modesQuestion.id]) {
    const weight = getOptionWeight(modesQuestion, modeId);
    sum += weight;
    if (weight >= 1) {
      countedModes += 1;
    }
  }
  if (countedModes === 0) {
    return 0;
  }

  const hoursOption = timeQuestion.options.find((candidate) => candidate.id === answers[timeQuestion.id]);
  if (!hoursOption || typeof hoursOption.hours !== 'number') {
    return 0;
  }
  return (sum / countedModes) * hoursOption.hours;
}

// Porcentaje entero que representa `sum` respecto de `max`, sin pasar de `cap`.
function toPercent(sum, max, cap = 100) {
  return Math.min(Number((100 * (sum / max)).toFixed()), cap);
}

// Color de la barra según el porcentaje que ocupa.
function getBarColor(percent) {
  if (percent >= 76) {
    return SEMAPHORE.red;
  }
  if (percent >= 51) {
    return SEMAPHORE.orange;
  }
  if (percent >= 26) {
    return SEMAPHORE.yellow;
  }
  return SEMAPHORE.green;
}

const roundTwoDecimals = (value) => Number(value.toFixed(2));

// Suma por categoría (hogar, transporte, consumo) de todas las respuestas.
function sumByCategory(answers, questions) {
  const totals = {};
  for (const { key } of CATEGORIES) {
    totals[key] = 0;
  }

  const modesQuestion = questions.find((question) => question.id === COMMUTE_QUESTIONS.modes);
  const timeQuestion = questions.find((question) => question.id === COMMUTE_QUESTIONS.time);

  for (const question of questions) {
    const isCommuteQuestion = question === modesQuestion || question === timeQuestion;
    if (!isCommuteQuestion && question.category in totals) {
      totals[question.category] += getQuestionWeight(question, answers[question.id]);
    }
  }
  if (modesQuestion && modesQuestion.category in totals) {
    totals[modesQuestion.category] += calculateCommute(modesQuestion, timeQuestion, answers);
  }
  return totals;
}

// Arma el objeto de resultados a partir de las sumas por categoría, el total y el nivel ya decididos.
function assembleResults({ totals, total, totalKg, level, answers }) {
  const percentages = {
    hogar: toPercent(totals.hogar, CATEGORY_MAX_KG.hogar),
    transporte: toPercent(totals.transporte, CATEGORY_MAX_KG.transporte),
    consumo: toPercent(totals.consumo, CATEGORY_MAX_KG.consumo),
  };

  return {
    totalKg,
    breakdown: {
      hogar: roundTwoDecimals(totals.hogar),
      transporte: roundTwoDecimals(totals.transporte),
      consumo: roundTwoDecimals(totals.consumo),
    },
    percentages,
    barColors: {
      hogar: getBarColor(percentages.hogar),
      transporte: getBarColor(percentages.transporte),
      consumo: getBarColor(percentages.consumo),
    },
    termoPercent: toPercent(total, THERMOMETER_MAX_KG, THERMOMETER_CAP_PERCENT),
    levelKey: level.key,
    level: level.name,
    levelColor: level.color,
    title: level.title,
    description: level.description,
    treesText: level.treesText,
    recommendations: buildRecommendations(answers),
  };
}

/**
 * Calcula la huella de carbono a partir de las respuestas.
 *
 * @param {Record<string, unknown>} answers Respuestas del cuestionario (clave de pregunta -> respuesta).
 * @param {ReadonlyArray<object>} questions Cuestionario COMPLETO, con pesos (lo arma el servidor desde MySQL).
 * @returns {{
 *   totalKg: number,
 *   breakdown: {hogar: number, transporte: number, consumo: number},
 *   percentages: {hogar: number, transporte: number, consumo: number},
 *   barColors: {hogar: string, transporte: string, consumo: string},
 *   termoPercent: number,
 *   levelKey: string, level: string, levelColor: string, title: string, description: string[],
 *   treesText: string, recommendations: string[]
 * }}
 */
export function calculateFootprint(answers, questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Se necesita el cuestionario para calcular la huella.');
  }

  const totals = sumByCategory(answers, questions);
  const total = totals.hogar + totals.transporte + totals.consumo;
  return assembleResults({ totals, total, totalKg: roundTwoDecimals(total), level: getLevel(total), answers });
}

/**
 * Reconstruye los resultados de una participación YA guardada, con las cifras que se guardaron (no vuelve a leer
 * pesos del cuestionario). Así un correo reenviado dice exactamente lo mismo que vio la persona, aunque después se
 * hayan editado preguntas o pesos en la base.
 *
 * @param {{hogarKg: number, transporteKg: number, consumoKg: number, totalKg: number, nivel: string}} stored Cifras guardadas.
 * @param {Record<string, unknown>} answers Respuestas guardadas de la participación.
 * @returns {ReturnType<typeof calculateFootprint>} Mismo formato que calculateFootprint.
 */
export function rebuildFootprint(stored, answers) {
  const totals = {
    hogar: Number(stored.hogarKg),
    transporte: Number(stored.transporteKg),
    consumo: Number(stored.consumoKg),
  };
  const total = Number(stored.totalKg);
  return assembleResults({ totals, total, totalKg: roundTwoDecimals(total), level: getLevelByKey(stored.nivel), answers });
}
