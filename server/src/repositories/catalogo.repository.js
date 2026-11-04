/**
 * Acceso a los catálogos que llenan el formulario: países, estados, municipios, unidades regionales y
 * escuelas/facultades.
 * Solo devuelve registros activos. Todas las consultas son parametrizadas.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createCatalogoRepository(pool) {
  const aItems = (filas) => filas.map(({ id, nombre }) => ({ id, nombre }));

  async function existe(sql, parametros) {
    const [filas] = await pool.execute(sql, parametros);
    return filas.length > 0;
  }

  return {
    async listarUnidades() {
      const [filas] = await pool.execute(
        `SELECT id_unidad_regional AS id, nombre
           FROM unidades_regionales
          WHERE activo = 1
          ORDER BY id_unidad_regional`
      );
      return aItems(filas);
    },

    async existeUnidad(idUnidad) {
      const [filas] = await pool.execute(
        'SELECT 1 AS existe FROM unidades_regionales WHERE id_unidad_regional = ? AND activo = 1',
        [idUnidad]
      );
      return filas.length > 0;
    },

    // Escuelas de UNA unidad regional. La opción "Otra / No aparece..." se muestra al final de la lista.
    async listarEscuelas(idUnidad) {
      const [filas] = await pool.execute(
        `SELECT id_escuela_facultad AS id, nombre
           FROM escuelas_facultades
          WHERE id_unidad_regional = ? AND activo = 1
          ORDER BY nombre LIKE 'Otra%', nombre`,
        [idUnidad]
      );
      return aItems(filas);
    },

    // México siempre va primero; después, los demás países por orden alfabético.
    async listarPaises() {
      const [filas] = await pool.execute(
        `SELECT codigo AS id, nombre FROM paises WHERE activo = 1 ORDER BY codigo = 'MX' DESC, nombre`
      );
      return aItems(filas);
    },

    async listarEstados() {
      const [filas] = await pool.execute('SELECT id_estado AS id, nombre FROM estados WHERE activo = 1 ORDER BY nombre');
      return aItems(filas);
    },

    async existeEstado(idEstado) {
      return existe('SELECT 1 FROM estados WHERE id_estado = ? AND activo = 1', [idEstado]);
    },

    // Municipios de UN estado
    async listarMunicipios(idEstado) {
      const [filas] = await pool.execute(
        'SELECT id_municipio AS id, nombre FROM municipios WHERE id_estado = ? AND activo = 1 ORDER BY nombre',
        [idEstado]
      );
      return aItems(filas);
    },

    /**
     * Comprueba que lo elegido existe y es consistente: el municipio debe ser del estado elegido y la escuela de
     * la unidad elegida (la misma regla que las claves foráneas compuestas de la base). Solo revisa los campos que
     * aplican: estado y municipio si la persona es de México, unidad y escuela si es de la UAS.
     *
     * @returns {Promise<{pais: boolean, estado: boolean, municipio: boolean, unidad: boolean, escuela: boolean}>}
     */
    async validarReferencias({ codigoPais, idEstado, idMunicipio, idUnidadRegional, idEscuelaFacultad }) {
      const resultado = { pais: true, estado: true, municipio: true, unidad: true, escuela: true };
      const consultas = [existe('SELECT 1 FROM paises WHERE codigo = ? AND activo = 1', [codigoPais]).then((v) => (resultado.pais = v))];

      if (idEstado !== null) {
        consultas.push(existe('SELECT 1 FROM estados WHERE id_estado = ? AND activo = 1', [idEstado]).then((v) => (resultado.estado = v)));
        consultas.push(
          existe('SELECT 1 FROM municipios WHERE id_municipio = ? AND id_estado = ? AND activo = 1', [idMunicipio, idEstado]).then(
            (v) => (resultado.municipio = v)
          )
        );
      }
      if (idEscuelaFacultad !== null) {
        consultas.push(
          existe('SELECT 1 FROM unidades_regionales WHERE id_unidad_regional = ? AND activo = 1', [idUnidadRegional]).then(
            (v) => (resultado.unidad = v)
          )
        );
        consultas.push(
          existe('SELECT 1 FROM escuelas_facultades WHERE id_escuela_facultad = ? AND id_unidad_regional = ? AND activo = 1', [
            idEscuelaFacultad,
            idUnidadRegional,
          ]).then((v) => (resultado.escuela = v))
        );
      }
      await Promise.all(consultas);
      return resultado;
    },
  };
}
