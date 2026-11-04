import { armarWhere, escaparLike } from './sql.js';

const COLUMNAS_EDITABLES = Object.freeze({
  nombreRemitente: 'nombre_remitente',
  prioridad: 'prioridad',
  limiteDiario: 'limite_diario',
  activo: 'activo',
  contrasenaCifrada: 'contrasena_cifrada',
});

/**
 * Consultas del panel sobre las cuentas de Gmail y la bitácora de correos.
 * La rotación de cuentas al enviar vive en cuentasCorreo.repository.js; aquí solo se administran.
 * Ninguna consulta devuelve la contraseña cifrada.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createCorreoAdminRepository(pool) {
  return {
    async listarCuentas() {
      const [filas] = await pool.execute(
        `SELECT c.id_cuenta_correo AS id, c.correo, c.nombre_remitente AS nombreRemitente, c.prioridad,
                c.limite_diario AS limiteDiario,
                CASE WHEN c.fecha_contador <=> CURDATE() THEN c.enviados_hoy ELSE 0 END AS enviadosHoy,
                c.total_enviados AS totalEnviados, c.activo,
                (c.bloqueada_hasta IS NOT NULL AND c.bloqueada_hasta > NOW()) AS bloqueada,
                c.bloqueada_hasta AS bloqueadaHasta, c.ultimo_envio_en AS ultimoEnvioEn,
                c.ultimo_error AS ultimoError, c.ultimo_error_en AS ultimoErrorEn
           FROM cuentas_correo c
          ORDER BY c.prioridad, c.id_cuenta_correo`
      );
      return filas;
    },

    async buscarCuenta(id) {
      const [filas] = await pool.execute('SELECT id_cuenta_correo AS id, correo FROM cuentas_correo WHERE id_cuenta_correo = ?', [id]);
      return filas[0] ?? null;
    },

    /** @returns {Promise<number>} id de la cuenta creada (lanza ER_DUP_ENTRY si el correo ya existe) */
    async crearCuenta({ correo, nombreRemitente, contrasenaCifrada, prioridad, limiteDiario }) {
      const [resultado] = await pool.execute(
        `INSERT INTO cuentas_correo (correo, nombre_remitente, contrasena_cifrada, prioridad, limite_diario)
         VALUES (?, ?, ?, ?, ?)`,
        [correo, nombreRemitente, contrasenaCifrada, prioridad, limiteDiario]
      );
      return resultado.insertId;
    },

    async actualizarCuenta(id, cambios) {
      const campos = Object.keys(cambios).filter((campo) => campo in COLUMNAS_EDITABLES);
      if (campos.length === 0) {
        return;
      }
      const asignaciones = campos.map((campo) => `${COLUMNAS_EDITABLES[campo]} = ?`).join(', ');
      // Al reactivar o cambiar la contraseña se limpia el bloqueo temporal y el último error.
      let extra = '';
      if ('activo' in cambios || 'contrasenaCifrada' in cambios) {
        extra = ', bloqueada_hasta = NULL, ultimo_error = NULL, ultimo_error_en = NULL';
      }
      await pool.execute(`UPDATE cuentas_correo SET ${asignaciones}${extra} WHERE id_cuenta_correo = ?`, [
        ...campos.map((campo) => cambios[campo]),
        id,
      ]);
    },

    // Bitácora de envíos con filtros. Cada fila indica si la participación sigue sin correo, para ofrecer el reenvío.
    async listarEnvios({ pagina, porPagina, estado, tipoError, busqueda }) {
      const condiciones = [];
      const parametros = [];
      if (estado) {
        condiciones.push('e.estado = ?');
        parametros.push(estado);
      }
      if (tipoError) {
        condiciones.push('e.tipo_error = ?');
        parametros.push(tipoError);
      }
      if (busqueda) {
        const patron = `%${escaparLike(busqueda)}%`;
        condiciones.push('(e.destinatario LIKE ? OR e.remitente LIKE ?)');
        parametros.push(patron, patron);
      }
      const where = armarWhere(condiciones);

      const [items] = await pool.execute(
        `SELECT e.id_envio AS id, e.id_participacion AS idParticipacion, e.remitente, e.destinatario, e.asunto,
                e.estado, e.tipo_error AS tipoError, e.codigo_error AS codigoError, e.mensaje_error AS mensajeError,
                e.creado_en AS creadoEn, p.correo_enviado AS participacionEnviada
           FROM envios_correo e
           LEFT JOIN participaciones p ON p.id_participacion = e.id_participacion ${where}
          ORDER BY e.id_envio DESC
          LIMIT ${Number(porPagina)} OFFSET ${Number((pagina - 1) * porPagina)}`,
        parametros
      );
      const [conteo] = await pool.execute(`SELECT COUNT(*) AS total FROM envios_correo e ${where}`, parametros);
      return { items, total: conteo[0].total };
    },

    /**
     * Conteos generales del correo: total histórico de envíos, lo de hoy, lo que falta por enviar y
     * cuántos envíos más caben hoy entre todas las cuentas disponibles.
     */
    async resumen() {
      const [envios] = await pool.execute(
        `SELECT COALESCE(SUM(estado = 'enviado'), 0) AS enviadosTotal,
                COALESCE(SUM(estado = 'fallido'), 0) AS fallidosTotal,
                COALESCE(SUM(estado = 'enviado' AND creado_en >= CURDATE()), 0) AS enviadosHoy,
                COALESCE(SUM(estado = 'fallido' AND creado_en >= CURDATE()), 0) AS fallidosHoy,
                COUNT(DISTINCT CASE WHEN estado = 'enviado' THEN destinatario END) AS destinatariosUnicos
           FROM envios_correo`
      );
      const [cuentas] = await pool.execute(
        `SELECT COUNT(*) AS cuentasActivas,
                COALESCE(SUM(limite_diario), 0) AS capacidadDiaria,
                COALESCE(SUM(CASE WHEN bloqueada_hasta IS NULL OR bloqueada_hasta <= NOW()
                                  THEN GREATEST(limite_diario - CASE WHEN fecha_contador <=> CURDATE() THEN enviados_hoy ELSE 0 END, 0)
                                  ELSE 0 END), 0) AS cupoDisponibleHoy
           FROM cuentas_correo WHERE activo = 1`
      );
      const [pendientes] = await pool.execute('SELECT COUNT(*) AS total FROM participaciones WHERE correo_enviado = 0');
      return { ...envios[0], ...cuentas[0], participacionesSinCorreo: pendientes[0].total };
    },

    // Participaciones cuyo correo no salió, con el último motivo de fallo y cuántos intentos se hicieron.
    async listarPendientes({ pagina, porPagina, busqueda }) {
      const condiciones = ['p.correo_enviado = 0'];
      const parametros = [];
      if (busqueda) {
        const patron = `%${escaparLike(busqueda)}%`;
        condiciones.push("(p.nombre LIKE ? OR p.apellidos LIKE ? OR CONCAT(p.nombre, ' ', p.apellidos) LIKE ? OR p.correo LIKE ?)");
        parametros.push(patron, patron, patron, patron);
      }
      const where = armarWhere(condiciones);

      const [items] = await pool.execute(
        `SELECT p.id_participacion AS id, p.creado_en AS creadoEn, p.nombre, p.apellidos, p.correo,
                (SELECT COUNT(*) FROM envios_correo e WHERE e.id_participacion = p.id_participacion) AS intentos,
                (SELECT e.tipo_error FROM envios_correo e WHERE e.id_participacion = p.id_participacion
                  ORDER BY e.id_envio DESC LIMIT 1) AS ultimoTipoError,
                (SELECT e.creado_en FROM envios_correo e WHERE e.id_participacion = p.id_participacion
                  ORDER BY e.id_envio DESC LIMIT 1) AS ultimoIntentoEn
           FROM participaciones p ${where}
          ORDER BY p.id_participacion DESC
          LIMIT ${Number(porPagina)} OFFSET ${Number((pagina - 1) * porPagina)}`,
        parametros
      );
      const [conteo] = await pool.execute(`SELECT COUNT(*) AS total FROM participaciones p ${where}`, parametros);
      return { items, total: conteo[0].total };
    },
  };
}
