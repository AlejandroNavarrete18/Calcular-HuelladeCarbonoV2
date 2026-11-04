/**
 * Niveles de impacto según la huella total anual (kg CO2e).
 * `key` es el identificador estable que se guarda en la base de datos (enum participaciones.nivel).
 */

// Se usan en barras, termómetro y correo.
export const SEMAPHORE = Object.freeze({
  green: '#1E8A4C',
  yellow: '#F4C430',
  orange: '#EF7D17',
  red: '#C4250F',
});

const LEVELS = Object.freeze([
  {
    maxKg: 2000,
    key: 'bajo',
    name: 'Bajo impacto',
    color: SEMAPHORE.green,
    title: '¡Vas por un excelente camino!',
    treesText: 'Tu estilo de vida equivale a conservar aproximadamente 66 árboles al año.',
    description: [
      '¡Felicitaciones! Demuestras una gran responsabilidad en tus decisiones cotidianas. Consideras el bienestar ambiental al realizar compras, elegir tu medio de transporte o rechazar plásticos de un solo uso. Tu constante esfuerzo por minimizar tu huella ecológica te convierte en un auténtico agente de cambio. ¡Gracias por tu compromiso!',
      'Si toda la sociedad adoptara tus hábitos de consumo, podríamos frenar el cambio climático con mayor eficacia y preservar la biodiversidad de nuestro planeta. ¡Continúa siendo un ejemplo!',
    ],
  },
  {
    maxKg: 4000,
    key: 'medio',
    name: 'Impacto medio',
    color: SEMAPHORE.yellow,
    title: '¡Aún tienes oportunidad de mejorar!',
    treesText: 'El impacto de tu consumo equivale a la pérdida de 66 árboles al año.',
    description: [
      'Reconoces la importancia de usar la bicicleta, planificar tus compras, reducir los plásticos desechables e incluir alimentos de temporada, aunque aún te cuesta mantener la constancia. ¡No te desanimes! Lo valioso es que ya has iniciado el cambio y tienes interés en reducir tu huella. Infórmate y apóyate en personas que ya han consolidado estos hábitos.',
      'Si toda la población mantuviera este ritmo de consumo, afrontar la crisis climática resultaría un desafío más complejo. ¡Es el momento perfecto para dar el siguiente paso y transformar tu entorno!',
    ],
  },
  {
    maxKg: 6000,
    key: 'alto',
    name: 'Alto impacto',
    color: SEMAPHORE.orange,
    title: '¡Tus hábitos exigen mayor conciencia ambiental!',
    treesText: 'Tus emisiones anuales equivalen a la tala de 99 árboles.',
    description: [
      'Cada elección en tu alimentación, transporte y compras genera un impacto directo en el planeta. Sin una postura reflexiva sobre tus hábitos, proteger los ecosistemas y la biodiversidad será un reto cada vez más difícil. Aunque realizas pequeños esfuerzos esporádicos, te cuesta trabajo sostener la motivación a largo plazo.',
      'Si todos consumieran al mismo ritmo, el deterioro ambiental se aceleraría drásticamente. ¡Es hora de actuar! Enfócate en metas sencillas e incorpora un cambio sostenible a la vez.',
    ],
  },
  {
    maxKg: Infinity,
    key: 'muy_alto',
    name: 'Impacto muy alto',
    color: SEMAPHORE.red,
    title: '¡Tu nivel de consumo requiere una acción urgente!',
    treesText: 'El impacto de tu huella equivale a talar más de 100 árboles al año.',
    description: [
      '¿Te has detenido a reflexionar sobre cómo tus actividades diarias inciden en el planeta? Tu huella supera el promedio nacional. De generalizarse este nivel de consumo, se requerirían múltiples planetas para sostener la demanda de recursos, acelerando la pérdida irreparable de fauna y hábitats naturales.',
      'Al realizar compras, desplazarte o alimentarte, sueles priorizar la comodidad por encima del costo ecológico. Sin embargo, siempre estás a tiempo de reorientar tus decisiones. ¡Comienza la transformación hoy mismo!',
    ],
  },
]);

/**
 * Devuelve el nivel que corresponde a una huella total.
 * @param {number} totalKg Huella total anual en kg CO2e.
 * @returns {typeof LEVELS[number]}
 */
export function getLevel(totalKg) {
  for (const level of LEVELS) {
    if (totalKg <= level.maxKg) {
      return level;
    }
  }
  return LEVELS[LEVELS.length - 1];
}

/**
 * Devuelve el nivel a partir de su clave guardada en la base de datos (bajo, medio, alto, muy_alto).
 * Se usa al reconstruir resultados ya calculados, para no volver a decidir el nivel.
 * @param {string} key
 * @returns {typeof LEVELS[number]}
 */
export function getLevelByKey(key) {
  const level = LEVELS.find((candidate) => candidate.key === key);
  if (level) {
    return level;
  }
  return LEVELS[LEVELS.length - 1];
}
