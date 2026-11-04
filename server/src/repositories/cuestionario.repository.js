/**
 * Lectura del cuestionario guardado en MySQL: preguntas, opciones, filas de matriz y sus pesos.
 * Es la ÚNICA fuente del cuestionario: lo que se edite en estas tablas es lo que verá y calculará la aplicación.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createCuestionarioRepository(pool) {
  return {
    /** @returns {Promise<{preguntas: object[], opciones: object[], filas: object[], pesos: object[]}>} */
    async leerCuestionario() {
      const [preguntas] = await pool.execute(
        'SELECT id_pregunta, clave, numero, categoria, titulo, subtitulo, tipo FROM preguntas ORDER BY numero, id_pregunta'
      );
      const [opciones] = await pool.execute(
        'SELECT id_opcion, id_pregunta, clave, etiqueta, kg_co2, horas FROM opciones ORDER BY id_pregunta, orden, id_opcion'
      );
      const [filas] = await pool.execute(
        'SELECT id_fila, id_pregunta, clave, etiqueta FROM filas_matriz ORDER BY id_pregunta, orden, id_fila'
      );
      const [pesos] = await pool.execute('SELECT id_fila, id_opcion, kg_co2 FROM pesos_matriz');
      return { preguntas, opciones, filas, pesos };
    },
  };
}
