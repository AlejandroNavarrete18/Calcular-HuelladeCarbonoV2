/**
 * Lectura de los cuestionarios guardados en MySQL (hogar, trabajo...): preguntas, opciones, filas de matriz y sus pesos.
 * Es la ÚNICA fuente de los cuestionarios: lo que se edite en estas tablas es lo que verá y calculará la aplicación.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createCuestionarioRepository(pool) {
  return {
    /** @returns {Promise<{cuestionarios: object[], preguntas: object[], opciones: object[], filas: object[], pesos: object[]}>} */
    async leerCuestionario() {
      const [cuestionarios] = await pool.execute(
        'SELECT id_cuestionario, clave, nombre FROM cuestionarios ORDER BY id_cuestionario'
      );
      const [preguntas] = await pool.execute(
        `SELECT id_pregunta, id_cuestionario, clave, numero, categoria, titulo, subtitulo, tipo, permite_cantidad
           FROM preguntas ORDER BY id_cuestionario, numero, id_pregunta`
      );
      const [opciones] = await pool.execute(
        'SELECT id_opcion, id_pregunta, clave, etiqueta, kg_co2, horas FROM opciones ORDER BY id_pregunta, orden, id_opcion'
      );
      const [filas] = await pool.execute(
        'SELECT id_fila, id_pregunta, clave, etiqueta FROM filas_matriz ORDER BY id_pregunta, orden, id_fila'
      );
      const [pesos] = await pool.execute('SELECT id_fila, id_opcion, kg_co2 FROM pesos_matriz');
      return { cuestionarios, preguntas, opciones, filas, pesos };
    },
  };
}
