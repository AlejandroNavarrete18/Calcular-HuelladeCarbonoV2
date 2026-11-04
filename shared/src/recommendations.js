// Recomendaciones de acción personalizadas según las respuestas del usuario.

const TIPS = Object.freeze({
  led: 'Reemplaza tus focos incandescentes por iluminación LED para optimizar el consumo de energía eléctrica.',
  carpool: 'Considera compartir vehículo o utilizar el transporte público de uno a dos días por semana.',
  beef: 'Reduce el consumo de carne de res para mitigar la huella de carbono derivada de la actividad ganadera.',
  keepGoing: '¡Excelente desempeño! Tu estilo de vida favorece la reducción de la huella ecológica.',
});

/**
 * @param {Record<string, unknown>} answers Respuestas del cuestionario.
 * @returns {string[]} Al menos una recomendación.
 */
export function buildRecommendations(answers) {
  const tips = [];

  if (answers.focos === 'incandescentes' || answers.focos === 'no_se') {
    tips.push(TIPS.led);
  }

  if (Array.isArray(answers.transporte) && answers.transporte.includes('auto')) {
    tips.push(TIPS.carpool);
  }

  const beef = answers.carne_matriz?.res;
  if (beef === 'diario' || beef === '4_6_dias') {
    tips.push(TIPS.beef);
  }

  if (tips.length === 0) {
    tips.push(TIPS.keepGoing);
  }
  return tips;
}