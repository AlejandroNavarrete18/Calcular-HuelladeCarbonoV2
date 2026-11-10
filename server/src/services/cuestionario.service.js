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
 * Convierte las filas de MySQL de UN cuestionario en las preguntas de la aplicación y en un índice
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
    if (pregunta.permite_cantidad) {
      base.allowQuantity = true;
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

// Arma un cuestionario por cada fila de `cuestionarios`, con los problemas de cada uno rotulados con su clave.
function construirTodos(datos) {
  const preguntasPorCuestionario = agruparPor(datos.preguntas, 'id_cuestionario');
  return datos.cuestionarios.map((cuestionario) => {
    const preguntas = preguntasPorCuestionario.get(cuestionario.id_cuestionario) ?? [];
    const { questions, indice, problemas } = construir({ ...datos, preguntas });
    return {
      cuestionario,
      questions,
      indice,
      problemas: problemas.map((problema) => `[${cuestionario.clave}] ${problema}`),
    };
  });
}

// Huella digital corta del contenido: cambia cuando cambia cualquier texto, opción o peso.
function calcularVersion(questions) {
  return createHash('sha256').update(JSON.stringify(questions)).digest('hex').slice(0, 16);
}

/**
 * Servicio de los cuestionarios (hogar, trabajo...). Lee preguntas, opciones y pesos de MySQL, comprueba que se
 * puedan usar y los guarda en memoria unos segundos para no consultar la base en cada petición.
 *
 *  - Los cambios hechos en la base se ven en `cacheMs`.
 *  - Cada cuestionario se valida por separado: si una edición deja UNO inutilizable (un peso faltante...), se
 *    registra el problema y ese cuestionario sigue con su última versión válida; los demás no se ven afectados.
 *
 * @param {object} deps
 * @param {ReturnType<import('../repositories/cuestionario.repository.js').createCuestionarioRepository>} deps.cuestionario
 * @param {{error: Function}} deps.logger
 * @param {number} deps.cacheMs Tiempo que se reutilizan los cuestionarios leídos.
 */
export function createCuestionarioService({ cuestionario, logger, cacheMs }) {
  let actual = null; // { porClave: Map<clave, snapshot>, leidoEn }
  let lecturaEnCurso = null;

  /**
   * @returns {Promise<{problemas: string[], snapshots: Map<string, object>, invalidos: Set<string>}>}
   *   Un snapshot por cuestionario válido: { id, clave, nombre, version, questions, publico, indice }.
   */
  async function leer() {
    const construidos = construirTodos(await cuestionario.leerCuestionario());
    const problemas = [];
    const snapshots = new Map();
    const invalidos = new Set();

    if (construidos.length === 0) {
      problemas.push('No hay cuestionarios en la tabla cuestionarios.');
    }
    for (const construido of construidos) {
      const { cuestionario: fila, questions, indice } = construido;
      if (construido.problemas.length > 0) {
        problemas.push(...construido.problemas);
        invalidos.add(fila.clave);
      } else {
        snapshots.set(fila.clave, {
          id: fila.id_cuestionario,
          clave: fila.clave,
          nombre: fila.nombre,
          version: calcularVersion(questions),
          questions,
          publico: toPublicQuestionnaire(questions),
          indice,
        });
      }
    }
    return { problemas, snapshots, invalidos };
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

  // Vuelve a leer la base y combina: lo válido se actualiza; lo inválido conserva su última versión válida.
  async function refrescar() {
    try {
      const { problemas, snapshots, invalidos } = await leerUnaVez();
      const porClave = new Map(snapshots);
      for (const clave of invalidos) {
        const anterior = actual?.porClave.get(clave);
        if (anterior) {
          porClave.set(clave, anterior);
        }
      }
      if (problemas.length > 0) {
        logger.error(`Hay cuestionarios en MySQL con problemas; siguen con su última versión válida:\n - ${problemas.join('\n - ')}`);
      }
      actual = { porClave, leidoEn: Date.now() };
    } catch (error) {
      if (!actual) {
        throw error;
      }
      logger.error('No se pudo releer los cuestionarios; se sigue con la última versión válida:', error.code ?? '', error.message);
      // Se reintentará pasado `cacheMs`, no en cada petición.
      actual = { ...actual, leidoEn: Date.now() };
    }
  }

  return {
    /**
     * Primera lectura, al arrancar el servidor.
     * @returns {Promise<string[]>} Problemas de los cuestionarios; vacía si todos se pueden usar.
     */
    async cargar() {
      const { problemas, snapshots } = await leerUnaVez();
      if (problemas.length === 0) {
        actual = { porClave: snapshots, leidoEn: Date.now() };
      }
      return problemas;
    },

    /**
     * Cuestionario vigente de esa clave (por ejemplo "hogar" o "trabajo"):
     * { id, clave, nombre, version, questions (con pesos), publico (sin pesos), indice }.
     * Cada petición debe usar UNA sola instantánea de principio a fin.
     *
     * @param {string} clave
     * @returns {Promise<object|undefined>} undefined si no existe un cuestionario con esa clave.
     */
    async obtener(clave) {
      if (!actual || Date.now() - actual.leidoEn >= cacheMs) {
        await refrescar();
      }
      return actual.porClave.get(clave);
    },

    /**
     * Respuestas del navegador (ya validadas) -> filas para la tabla `respuestas`.
     *   - opción única:     una fila
     *   - opción múltiple:  una fila por opción marcada
     *   - matriz:           una fila por cada fila de la matriz (con su id_fila)
     * Cada fila lleva su cantidad (1 si la pregunta no la pide o la persona no la cambió).
     *
     * @param {Record<string, unknown>} answers
     * @param {Record<string, Record<string, number>>} quantities Cantidades ya revisadas (resolveQuantities).
     * @param {{questions: object[], indice: Map<string, object>}} snapshot El mismo con el que se validó y calculó.
     * @returns {Array<{idPregunta: number, idFila: number|null, idOpcion: number, cantidad: number}>}
     */
    mapearRespuestas(answers, quantities, snapshot) {
      const cantidadDe = (question, optionId) => quantities?.[question.id]?.[optionId] ?? 1;
      const filas = [];
      for (const question of snapshot.questions) {
        const pregunta = snapshot.indice.get(question.id);
        const respuesta = answers[question.id];

        if (question.type === QUESTION_TYPE.RADIO) {
          filas.push({
            idPregunta: pregunta.id,
            idFila: null,
            idOpcion: pregunta.opciones.get(respuesta),
            cantidad: cantidadDe(question, respuesta),
          });
        } else if (question.type === QUESTION_TYPE.CHECKBOX) {
          for (const optionId of respuesta) {
            filas.push({
              idPregunta: pregunta.id,
              idFila: null,
              idOpcion: pregunta.opciones.get(optionId),
              cantidad: cantidadDe(question, optionId),
            });
          }
        } else {
          for (const row of question.rows) {
            filas.push({
              idPregunta: pregunta.id,
              idFila: pregunta.filas.get(row.id),
              idOpcion: pregunta.opciones.get(respuesta[row.id]),
              cantidad: 1,
            });
          }
        }
      }
      return filas;
    },
  };
}
