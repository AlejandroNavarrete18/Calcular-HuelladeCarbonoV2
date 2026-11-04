import { createHash } from 'node:crypto';
import { QUESTION_TYPE, findQuestionnaireProblems, toPublicQuestionnaire } from '@huella/shared';

// Valor del enum `preguntas.tipo` en MySQL -> tipo de pregunta de la aplicación.
const TIPO_APLICACION = Object.freeze({
  opcion_unica: QUESTION_TYPE.RADIO,
  opcion_multiple: QUESTION_TYPE.CHECKBOX,
  matriz: QUESTION_TYPE.MATRIX,
});

const NUMERO_AL_INICIO = /^\s*\d+\s*[.)-]\s*/;

/**
 * El número de la pregunta sale de la columna `numero`, así que se ignora el que algún título traiga escrito
 * ("1. ¿QUÉ APARATOS...") y se vuelve a poner el correcto. Así se pueden reordenar preguntas sin tocar títulos.
 */
function armarTitulo(numero, titulo) {
  return `${numero}. ${titulo.replace(NUMERO_AL_INICIO, '')}`;
}

// Agrupa filas de MySQL por una columna: valor -> arreglo de filas.
function agruparPor(filas, columna) {
  const grupos = new Map();
  for (const fila of filas) {
    if (!grupos.has(fila[columna])) {
      grupos.set(fila[columna], []);
    }
    grupos.get(fila[columna]).push(fila);
  }
  return grupos;
}

// Opción de una pregunta de lista: solo trae kgCO2/hours cuando la base tiene ese valor.
function armarOpcion(fila) {
  const opcion = { id: fila.clave, label: fila.etiqueta };
  if (fila.kg_co2 !== null) {
    opcion.kgCO2 = fila.kg_co2;
  }
  if (fila.horas !== null) {
    opcion.hours = fila.horas;
  }
  return opcion;
}

// Pregunta de matriz: las opciones son las columnas y cada fila lleva su peso por columna.
function armarMatriz(base, opciones, filas, pesoPorPar) {
  return {
    ...base,
    columns: opciones.map((opcion) => ({ id: opcion.clave, label: opcion.etiqueta })),
    rows: filas.map((fila) => {
      const weights = {};
      for (const opcion of opciones) {
        const peso = pesoPorPar.get(`${fila.id_fila}:${opcion.id_opcion}`);
        if (peso !== undefined) {
          weights[opcion.clave] = peso;
        }
      }
      return { id: fila.clave, label: fila.etiqueta, weights };
    }),
  };
}

/**
 * Convierte las filas de MySQL en el cuestionario de la aplicación y en un índice
 * (clave -> ids de la base) para poder guardar las respuestas en la tabla `respuestas`.
 */
function construir({ preguntas, opciones, filas, pesos }) {
  const opcionesPorPregunta = agruparPor(opciones, 'id_pregunta');
  const filasPorPregunta = agruparPor(filas, 'id_pregunta');
  const pesoPorPar = new Map(pesos.map((peso) => [`${peso.id_fila}:${peso.id_opcion}`, peso.kg_co2]));

  const questions = [];
  const indice = new Map();
  const problemas = [];

  for (const pregunta of preguntas) {
    const type = TIPO_APLICACION[pregunta.tipo];
    if (!type) {
      problemas.push(`La pregunta "${pregunta.clave}" tiene un tipo desconocido: "${pregunta.tipo}".`);
      continue;
    }

    const susOpciones = opcionesPorPregunta.get(pregunta.id_pregunta) ?? [];
    const susFilas = filasPorPregunta.get(pregunta.id_pregunta) ?? [];

    const base = {
      id: pregunta.clave,
      category: pregunta.categoria,
      number: pregunta.numero,
      title: armarTitulo(pregunta.numero, pregunta.titulo),
      type,
    };
    if (pregunta.subtitulo) {
      base.subtitle = pregunta.subtitulo;
    }

    if (type === QUESTION_TYPE.MATRIX) {
      questions.push(armarMatriz(base, susOpciones, susFilas, pesoPorPar));
    } else {
      questions.push({ ...base, options: susOpciones.map(armarOpcion) });
    }

    indice.set(pregunta.clave, {
      id: pregunta.id_pregunta,
      opciones: new Map(susOpciones.map((opcion) => [opcion.clave, opcion.id_opcion])),
      filas: new Map(susFilas.map((fila) => [fila.clave, fila.id_fila])),
    });
  }

  problemas.push(...findQuestionnaireProblems(questions));
  return { questions, indice, problemas };
}

// Huella digital corta del contenido: cambia cuando cambia cualquier texto, opción o peso.
function calcularVersion(questions) {
  return createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0, 16);
}

/**
 * Servicio del cuestionario. Lee preguntas, opciones y pesos de MySQL, comprueba que se puedan usar y
 * los guarda en memoria unos segundos para no consultar la base en cada petición.
 *
 *  - Los cambios hechos en la base (por ejemplo desde el panel de administración) se ven en `cacheMs`.
 *  - Si una edición deja el cuestionario inutilizable (un peso faltante...), se registra el problema y se
 *    sigue con la última versión válida, así una edición a medias no tumba el servicio.
 *
 * @param {object} deps
 * @param {ReturnType<import('../repositories/cuestionario.repository.js').createCuestionarioRepository>} deps.cuestionario
 * @param {{error: Function}} deps.logger
 * @param {number} deps.cacheMs Tiempo que se reutiliza el cuestionario leído.
 */
export function createCuestionarioService({ cuestionario, logger, cacheMs }) {
  let actual = null; // { version, questions, publico, indice, leidoEn }
  let lecturaEnCurso = null;

  async function leer() {
    const { questions, indice, problemas } = construir(await cuestionario.leerCuestionario());
    if (problemas.length > 0) {
      return { problemas };
    }
    return {
      problemas,
      snapshot: {
        version: calcularVersion(questions),
        questions,
        publico: toPublicQuestionnaire(questions),
        indice,
        leidoEn: Date.now(),
      },
    };
  }

  // Una sola lectura a la vez, aunque lleguen muchas peticiones juntas.
  function leerUnaVez() {
    if (!lecturaEnCurso) {
      lecturaEnCurso = leer().finally(() => {
        lecturaEnCurso = null;
      });
    }
    return lecturaEnCurso;
  }

  return {
    /**
     * Primera lectura, al arrancar el servidor.
     * @returns {Promise<string[]>} Problemas del cuestionario; vacía si se puede usar.
     */
    async cargar() {
      const { problemas, snapshot } = await leerUnaVez();
      if (snapshot) {
        actual = snapshot;
      }
      return problemas;
    },

    /**
     * Cuestionario vigente: { version, questions (con pesos), publico (sin pesos), indice }.
     * Cada petición debe usar UNA sola instantánea de principio a fin.
     */
    async obtener() {
      if (actual && Date.now() - actual.leidoEn < cacheMs) {
        return actual;
      }
      try {
        const { problemas, snapshot } = await leerUnaVez();
        if (snapshot) {
          actual = snapshot;
          return actual;
        }
        logger.error(`El cuestionario en MySQL tiene problemas; se sigue con la última versión válida:\n - ${problemas.join('\n - ')}`);
      } catch (error) {
        if (!actual) {
          throw error;
        }
        logger.error('No se pudo releer el cuestionario; se sigue con la última versión válida:', error.code ?? '', error.message);
      }
      if (!actual) {
        throw new Error('No hay un cuestionario válido cargado.');
      }
      // Se reintentará pasado `cacheMs`, no en cada petición.
      actual = { ...actual, leidoEn: Date.now() };
      return actual;
    },

    /**
     * Respuestas del navegador (ya validadas) -> filas para la tabla `respuestas`.
     *   - opción única:     una fila
     *   - opción múltiple:  una fila por opción marcada
     *   - matriz:           una fila por cada fila de la matriz (con su id_fila)
     *
     * @param {Record<string, unknown>} answers
     * @param {{questions: object[], indice: Map<string, object>}} snapshot El mismo con el que se validó y calculó.
     * @returns {Array<{idPregunta: number, idFila: number|null, idOpcion: number}>}
     */
    mapearRespuestas(answers, snapshot) {
      const filas = [];
      for (const question of snapshot.questions) {
        const pregunta = snapshot.indice.get(question.id);
        const respuesta = answers[question.id];

        if (question.type === QUESTION_TYPE.RADIO) {
          filas.push({ idPregunta: pregunta.id, idFila: null, idOpcion: pregunta.opciones.get(respuesta) });
        } else if (question.type === QUESTION_TYPE.CHECKBOX) {
          for (const optionId of respuesta) {
            filas.push({ idPregunta: pregunta.id, idFila: null, idOpcion: pregunta.opciones.get(optionId) });
          }
        } else {
          for (const row of question.rows) {
            filas.push({
              idPregunta: pregunta.id,
              idFila: pregunta.filas.get(row.id),
              idOpcion: pregunta.opciones.get(respuesta[row.id]),
            });
          }
        }
      }
      return filas;
    },
  };
}
