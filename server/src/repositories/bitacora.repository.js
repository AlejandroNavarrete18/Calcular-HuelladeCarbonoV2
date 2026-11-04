import { armarWhere } from './sql.js';

const MAX_DETALLE_BYTES = 4000;

/**
 * Acceso a la tabla `bitacora_admin`: registro de lo que hace cada administrador.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createBitacoraRepository(pool) {
  return {
    // Guarda un movimiento. `detalle` nunca debe incluir contraseñas ni tokens.
    async registrar({ idAdministrador = null, accion, entidad = null, idEntidad = null, detalle = null, ip = null }) {
      let detalleJson = null;
      if (detalle) {
        detalleJson = JSON.stringify(detalle);
        if (detalleJson.length > MAX_DETALLE_BYTES) {
          detalleJson = JSON.stringify({ truncado: true });
        }
      }
      await pool.execute(
        'INSERT INTO bitacora_admin (id_administrador, accion, entidad, id_entidad, detalle, ip) VALUES (?, ?, ?, ?, ?, ?)',
        [idAdministrador, accion, entidad, idEntidad, detalleJson, ip]
      );
    },

    async listar({ pagina, porPagina, accion, idAdministrador }) {
      const condiciones = [];
      const parametros = [];
      if (accion) {
        condiciones.push('b.accion = ?');
        parametros.push(accion);
      }
      if (idAdministrador) {
        condiciones.push('b.id_administrador = ?');
        parametros.push(idAdministrador);
      }
      const where = armarWhere(condiciones);

      const [filas] = await pool.execute(
        `SELECT b.id_bitacora AS id, b.accion, b.entidad, b.id_entidad AS idEntidad, b.detalle, b.ip, b.creado_en AS creadoEn,
                a.nombre AS administrador, a.correo AS correoAdministrador
           FROM bitacora_admin b
           LEFT JOIN administradores a ON a.id_administrador = b.id_administrador
           ${where}
          ORDER BY b.id_bitacora DESC
          LIMIT ${Number(porPagina)} OFFSET ${Number((pagina - 1) * porPagina)}`,
        parametros
      );
      const [conteo] = await pool.execute(`SELECT COUNT(*) AS total FROM bitacora_admin b ${where}`, parametros);
      return { items: filas, total: conteo[0].total };
    },

    // Acciones distintas registradas, para el filtro de la pantalla.
    async listarAcciones() {
      const [filas] = await pool.execute('SELECT DISTINCT accion FROM bitacora_admin ORDER BY accion');
      return filas.map((fila) => fila.accion);
    },
  };
}
