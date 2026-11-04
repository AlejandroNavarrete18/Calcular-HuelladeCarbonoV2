import { MOTIVO_LIMITE_DESTINATARIO } from './colaCorreo.repository.js';

const COLUMNAS_RESPUESTA = 4;

/**
 * Acceso a las tablas `participaciones` y `respuestas`.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createParticipacionesRepository(pool) {
  // "(?, ?, ?, ?), (?, ?, ?, ?)..." — solo se genera la forma; los datos siempre viajan como parámetros.
  function placeholdersRespuestas(cantidad) {
    const grupo = `(${Array(COLUMNAS_RESPUESTA).fill('?').join(', ')})`;
    return Array(cantidad).fill(grupo).join(', ');
  }

  return {
    /**
     * Guarda la participación y TODAS sus respuestas en una sola transacción:
     * o se guarda todo, o no se guarda nada.
     *
     * @param {{
     *   participacion: {nombre, apellidos, correo, telefono, fechaNacimiento, codigoPais, idEstado, idMunicipio,
     *                   ciudadProvincia, localidadComunidad, idUnidadRegional, idEscuelaFacultad,
     *                   institucionExterna, hogarKg, transporteKg, consumoKg, totalKg, nivel, respuestasJson},
     *   respuestas: Array<{idPregunta: number, idFila: number|null, idOpcion: number}>
     * }} datos
     * @param {boolean} [datos.encolarCorreo] si es true, el correo de resultados queda en la cola PERSISTENTE en la
     *   misma transacción: o se guarda todo (participación, respuestas y correo en cola) o no se guarda nada.
     *   Si es false (el destinatario alcanzó su límite por hora) se deja el trabajo como "omitido", para que el
     *   reenvío masivo del panel no lo mande por su cuenta.
     * @returns {Promise<number>} id de la participación creada
     */
    async guardar({ participacion, respuestas, encolarCorreo = false }) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();

        const [insercion] = await conexion.execute(
          `INSERT INTO participaciones
             (nombre, apellidos, correo, telefono, fecha_nacimiento, codigo_pais, id_estado, id_municipio,
              ciudad_provincia, localidad_comunidad, id_unidad_regional, id_escuela_facultad, institucion_externa,
              hogar_kg, transporte_kg, consumo_kg, total_kg, nivel, respuestas_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            participacion.nombre,
            participacion.apellidos,
            participacion.correo,
            participacion.telefono,
            participacion.fechaNacimiento,
            participacion.codigoPais,
            participacion.idEstado,
            participacion.idMunicipio,
            participacion.ciudadProvincia,
            participacion.localidadComunidad,
            participacion.idUnidadRegional,
            participacion.idEscuelaFacultad,
            participacion.institucionExterna,
            participacion.hogarKg,
            participacion.transporteKg,
            participacion.consumoKg,
            participacion.totalKg,
            participacion.nivel,
            participacion.respuestasJson,
          ]
        );
        const idParticipacion = insercion.insertId;

        const parametros = respuestas.flatMap((r) => [idParticipacion, r.idPregunta, r.idFila, r.idOpcion]);
        await conexion.execute(
          `INSERT INTO respuestas (id_participacion, id_pregunta, id_fila, id_opcion)
           VALUES ${placeholdersRespuestas(respuestas.length)}`,
          parametros
        );

        if (encolarCorreo) {
          await conexion.execute('INSERT INTO cola_correos (id_participacion) VALUES (?)', [idParticipacion]);
        } else {
          await conexion.execute(
            "INSERT INTO cola_correos (id_participacion, estado, ultimo_error) VALUES (?, 'omitido', ?)",
            [idParticipacion, MOTIVO_LIMITE_DESTINATARIO]
          );
        }

        await conexion.commit();
        return idParticipacion;
      } catch (error) {
        try {
          await conexion.rollback();
        } catch {
          // Si el rollback también falla, se conserva el error original (el importante).
        }
        throw error;
      } finally {
        conexion.release();
      }
    },

    /**
     * Lo necesario para volver a armar y enviar el correo de resultados de una participación.
     * Las respuestas se guardan en JSON; mysql2 las entrega ya convertidas a objeto.
     *
     * @returns {Promise<object|null>} null si la participación ya no existe.
     */
    async buscarParaReenvio(idParticipacion) {
      const [filas] = await pool.execute(
        `SELECT id_participacion AS id, nombre, apellidos, correo, respuestas_json AS respuestas,
                hogar_kg AS hogarKg, transporte_kg AS transporteKg, consumo_kg AS consumoKg,
                total_kg AS totalKg, nivel, correo_enviado AS correoEnviado
           FROM participaciones WHERE id_participacion = ?`,
        [idParticipacion]
      );
      return filas[0] ?? null;
    },

    /**
     * Ids de las participaciones cuyo correo no salió y que NO están ya en la cola (esas saldrán solas) ni fueron
     * descartadas por el límite por destinatario (esas se reenvían solo si alguien las elige a propósito).
     */
    async idsPendientes(limite) {
      const [filas] = await pool.execute(
        `SELECT p.id_participacion AS id FROM participaciones p
          WHERE p.correo_enviado = 0
            AND NOT EXISTS (SELECT 1 FROM cola_correos c
                             WHERE c.id_participacion = p.id_participacion
                               AND (c.estado IN ('pendiente', 'enviando')
                                    OR (c.estado = 'omitido' AND c.ultimo_error = ?)))
          ORDER BY p.id_participacion LIMIT ${Math.trunc(Number(limite))}`,
        [MOTIVO_LIMITE_DESTINATARIO]
      );
      return filas.map((fila) => fila.id);
    },
  };
}
