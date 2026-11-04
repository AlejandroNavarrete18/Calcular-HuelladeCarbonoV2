import { armarWhere, escaparLike } from './sql.js';

// Columnas por las que se puede ordenar el listado; el valor que llega del exterior solo elige una de estas claves.
const ORDEN_PARTICIPACIONES = Object.freeze({
  fecha: 'p.creado_en',
  nombre: 'p.apellidos, p.nombre',
  total: 'p.total_kg',
  hogar: 'p.hogar_kg',
  transporte: 'p.transporte_kg',
  consumo: 'p.consumo_kg',
});

// Quien no es de la UAS no tiene unidad regional ni escuela: por eso esos catálogos van con LEFT JOIN.
const FROM_PARTICIPACIONES = `
  FROM participaciones p
  JOIN paises pa ON pa.codigo = p.codigo_pais
  LEFT JOIN estados es ON es.id_estado = p.id_estado
  LEFT JOIN municipios m ON m.id_municipio = p.id_municipio
  LEFT JOIN unidades_regionales ur ON ur.id_unidad_regional = p.id_unidad_regional
  LEFT JOIN escuelas_facultades ef ON ef.id_escuela_facultad = p.id_escuela_facultad`;

// Escuelas de la UAS (excluye a quienes eligieron "Otros")
const FROM_ESCUELAS_UAS = `
  FROM participaciones p
  JOIN unidades_regionales ur ON ur.id_unidad_regional = p.id_unidad_regional
  JOIN escuelas_facultades ef ON ef.id_escuela_facultad = p.id_escuela_facultad`;

const OTROS = 'Otros (fuera de la UAS)';

// Columnas de ubicación e institución que comparten el listado, el detalle y la exportación
const COLUMNAS_UBICACION = `pa.nombre AS pais, es.nombre AS estado, m.nombre AS municipio,
                p.ciudad_provincia AS ciudadProvincia, p.localidad_comunidad AS localidad,
                COALESCE(ur.nombre, '${OTROS}') AS unidad, COALESCE(ef.nombre, p.institucion_externa) AS escuela`;


/**
 * Construye el WHERE del listado a partir de los filtros ya validados.
 * Solo se agregan condiciones fijas; los valores siempre viajan como parámetros.
 */
function construirFiltros({ busqueda, nivel, idUnidad, idEscuela, desde, hasta, correoEnviado }) {
  const condiciones = [];
  const parametros = [];

  if (busqueda) {
    const patron = `%${escaparLike(busqueda)}%`;
    condiciones.push(
      `(p.nombre LIKE ? OR p.apellidos LIKE ? OR CONCAT(p.nombre, ' ', p.apellidos) LIKE ? OR p.correo LIKE ? OR p.telefono LIKE ?)`
    );
    parametros.push(patron, patron, patron, patron, patron);
  }
  if (nivel) {
    condiciones.push('p.nivel = ?');
    parametros.push(nivel);
  }
  if (idUnidad === 'otros') {
    condiciones.push('p.id_unidad_regional IS NULL');
  } else if (idUnidad) {
    condiciones.push('p.id_unidad_regional = ?');
    parametros.push(idUnidad);
  }
  if (idEscuela) {
    condiciones.push('p.id_escuela_facultad = ?');
    parametros.push(idEscuela);
  }
  if (desde) {
    condiciones.push('p.creado_en >= ?');
    parametros.push(`${desde} 00:00:00`);
  }
  if (hasta) {
    condiciones.push('p.creado_en < DATE_ADD(?, INTERVAL 1 DAY)');
    parametros.push(hasta);
  }
  if (correoEnviado !== undefined) {
    condiciones.push('p.correo_enviado = ?');
    parametros.push(correoEnviado);
  }

  return { where: armarWhere(condiciones), parametros };
}

/**
 * Consultas de solo lectura para el panel de administración (estadísticas y listados de participaciones),
 * más el borrado de una participación.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createReportesRepository(pool) {
  return {
    // Totales y promedios generales del periodo.
    async totales(filtros) {
      const { where, parametros } = construirFiltros(filtros);
      const [filas] = await pool.execute(
        `SELECT COUNT(*) AS participaciones,
                COALESCE(ROUND(AVG(p.total_kg), 2), 0) AS promedioTotal,
                COALESCE(ROUND(AVG(p.hogar_kg), 2), 0) AS promedioHogar,
                COALESCE(ROUND(AVG(p.transporte_kg), 2), 0) AS promedioTransporte,
                COALESCE(ROUND(AVG(p.consumo_kg), 2), 0) AS promedioConsumo,
                COALESCE(MIN(p.total_kg), 0) AS minimo,
                COALESCE(MAX(p.total_kg), 0) AS maximo,
                COALESCE(SUM(p.correo_enviado), 0) AS correosEnviados
           FROM participaciones p ${where}`,
        parametros
      );
      return filas[0];
    },

    async porNivel(filtros) {
      const { where, parametros } = construirFiltros(filtros);
      const [filas] = await pool.execute(
        `SELECT p.nivel, COUNT(*) AS total FROM participaciones p ${where} GROUP BY p.nivel`,
        parametros
      );
      return filas;
    },

    // Participaciones por día.
    async porDia(filtros) {
      const { where, parametros } = construirFiltros(filtros);
      const [filas] = await pool.execute(
        `SELECT DATE(p.creado_en) AS dia, COUNT(*) AS total FROM participaciones p ${where} GROUP BY DATE(p.creado_en) ORDER BY dia`,
        parametros
      );
      return filas;
    },

    async porUnidad(filtros) {
      const { where, parametros } = construirFiltros(filtros);
      const [filas] = await pool.execute(
        `SELECT COALESCE(ur.id_unidad_regional, 0) AS id, COALESCE(ur.nombre, '${OTROS}') AS nombre,
                COUNT(*) AS participaciones, ROUND(AVG(p.total_kg), 2) AS promedioTotal
           FROM participaciones p
           LEFT JOIN unidades_regionales ur ON ur.id_unidad_regional = p.id_unidad_regional
           ${where}
          GROUP BY ur.id_unidad_regional, ur.nombre
          ORDER BY participaciones DESC, nombre`,
        parametros
      );
      return filas;
    },

    async topEscuelas(filtros, limite) {
      const { where, parametros } = construirFiltros(filtros);
      const [filas] = await pool.execute(
        `SELECT ef.id_escuela_facultad AS id, ef.nombre, ur.nombre AS unidad, COUNT(*) AS participaciones,
                ROUND(AVG(p.total_kg), 2) AS promedioTotal
           ${FROM_ESCUELAS_UAS} ${where}
          GROUP BY ef.id_escuela_facultad, ef.nombre, ur.nombre
          ORDER BY participaciones DESC, ef.nombre
          LIMIT ${Number(limite)}`,
        parametros
      );
      return filas;
    },

    // Estado del correo en los últimos 7 días, total histórico enviado y participaciones cuyo correo no salió.
    async estadoCorreo() {
      const [envios] = await pool.execute(
        `SELECT estado, COUNT(*) AS total FROM envios_correo
          WHERE creado_en >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY estado`
      );
      const [historico] = await pool.execute("SELECT COUNT(*) AS total FROM envios_correo WHERE estado = 'enviado'");
      const [pendientes] = await pool.execute('SELECT COUNT(*) AS total FROM participaciones WHERE correo_enviado = 0');
      return { envios, enviadosTotal: historico[0].total, sinCorreo: pendientes[0].total };
    },

    async listar(filtros, { pagina, porPagina, orden, direccion }) {
      const { where, parametros } = construirFiltros(filtros);
      const columnaOrden = ORDEN_PARTICIPACIONES[orden] ?? ORDEN_PARTICIPACIONES.fecha;
      let sentido = 'DESC';
      if (direccion === 'asc') {
        sentido = 'ASC';
      }

      const [items] = await pool.execute(
        `SELECT p.id_participacion AS id, p.creado_en AS creadoEn, p.nombre, p.apellidos, p.correo, p.telefono,
                TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
                ${COLUMNAS_UBICACION},
                p.hogar_kg AS hogarKg, p.transporte_kg AS transporteKg, p.consumo_kg AS consumoKg,
                p.total_kg AS totalKg, p.nivel, p.correo_enviado AS correoEnviado
           ${FROM_PARTICIPACIONES} ${where}
          ORDER BY ${columnaOrden} ${sentido}, p.id_participacion DESC
          LIMIT ${Number(porPagina)} OFFSET ${Number((pagina - 1) * porPagina)}`,
        parametros
      );
      const [conteo] = await pool.execute(`SELECT COUNT(*) AS total FROM participaciones p ${where}`, parametros);
      return { items, total: conteo[0].total };
    },

    // Una participación con sus respuestas ya traducidas a texto.
    async obtener(id) {
      const [filas] = await pool.execute(
        `SELECT p.id_participacion AS id, p.creado_en AS creadoEn, p.nombre, p.apellidos, p.correo, p.telefono,
                p.fecha_nacimiento AS fechaNacimiento, TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
                ${COLUMNAS_UBICACION},
                p.hogar_kg AS hogarKg, p.transporte_kg AS transporteKg, p.consumo_kg AS consumoKg,
                p.total_kg AS totalKg, p.nivel, p.correo_enviado AS correoEnviado
           ${FROM_PARTICIPACIONES}
          WHERE p.id_participacion = ?`,
        [id]
      );
      if (filas.length === 0) {
        return null;
      }

      const [respuestas] = await pool.execute(
        `SELECT pr.numero, pr.titulo, pr.categoria, fm.etiqueta AS fila, op.etiqueta AS opcion
           FROM respuestas r
           JOIN preguntas pr ON pr.id_pregunta = r.id_pregunta
           JOIN opciones op ON op.id_opcion = r.id_opcion
           LEFT JOIN filas_matriz fm ON fm.id_fila = r.id_fila
          WHERE r.id_participacion = ?
          ORDER BY pr.numero, fm.orden, op.orden`,
        [id]
      );
      const [envios] = await pool.execute(
        `SELECT id_envio AS id, remitente, estado, tipo_error AS tipoError, creado_en AS creadoEn
           FROM envios_correo WHERE id_participacion = ? ORDER BY id_envio DESC`,
        [id]
      );
      return { ...filas[0], respuestas, envios };
    },

    // Borra la participación y sus respuestas (ON DELETE CASCADE). Devuelve true si existía.
    async eliminar(id) {
      const [resultado] = await pool.execute('DELETE FROM participaciones WHERE id_participacion = ?', [id]);
      return resultado.affectedRows > 0;
    },

    // Nombres de la unidad regional y la escuela elegidas en los filtros, para rotular los archivos exportados.
    async nombresDeFiltro({ idUnidad, idEscuela }) {
      let unidad = null;
      if (typeof idUnidad === 'number') {
        unidad = idUnidad;
      }
      const [filas] = await pool.execute(
        `SELECT (SELECT nombre FROM unidades_regionales WHERE id_unidad_regional = ?) AS unidad,
                (SELECT nombre FROM escuelas_facultades WHERE id_escuela_facultad = ?) AS escuela`,
        [unidad, idEscuela ?? null]
      );
      return filas[0];
    },

    /**
     * Filas para los archivos exportados (Excel, PDF y CSV), en el mismo orden que ve la persona en pantalla.
     * Se piden `limite + 1` filas: si llega la fila de más, se sabe que el archivo quedó incompleto y se avisa.
     *
     * @returns {Promise<{filas: object[], truncado: boolean}>}
     */
    async exportar(filtros, { orden, direccion, limite }) {
      const { where, parametros } = construirFiltros(filtros);
      const columnaOrden = ORDEN_PARTICIPACIONES[orden] ?? ORDEN_PARTICIPACIONES.fecha;
      let sentido = 'DESC';
      if (direccion === 'asc') {
        sentido = 'ASC';
      }

      const [filas] = await pool.execute(
        `SELECT p.id_participacion AS id, p.creado_en AS creadoEn, p.nombre, p.apellidos, p.correo, p.telefono,
                p.fecha_nacimiento AS fechaNacimiento, TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
                ${COLUMNAS_UBICACION},
                p.hogar_kg AS hogarKg, p.transporte_kg AS transporteKg, p.consumo_kg AS consumoKg,
                p.total_kg AS totalKg, p.nivel, p.correo_enviado AS correoEnviado
           ${FROM_PARTICIPACIONES} ${where}
          ORDER BY ${columnaOrden} ${sentido}, p.id_participacion DESC
          LIMIT ${Number(limite) + 1}`,
        parametros
      );
      const truncado = filas.length > limite;
      if (truncado) {
        filas.length = limite;
      }
      return { filas, truncado };
    },
  };
}
