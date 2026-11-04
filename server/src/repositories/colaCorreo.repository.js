const MAX_ERROR = 500;

// Motivo con el que queda registrado el correo que no se encoló porque su destinatario alcanzó el límite por hora.
export const MOTIVO_LIMITE_DESTINATARIO = 'Límite de correos por destinatario alcanzado.';

const recortar = (texto) => String(texto ?? '').slice(0, MAX_ERROR);

/**
 * Acceso a la tabla `cola_correos`: la cola PERSISTENTE de correos por enviar.
 * Vive en MySQL, así que sobrevive a reinicios y caídas del servidor.
 *
 * Ciclo de un trabajo:
 *   pendiente --reclamar--> enviando --> enviado | fallido | omitido
 *                              |-- (error temporal) --> pendiente (con espera)
 * Un trabajo "enviando" tiene un arriendo (`bloqueado_hasta`) que quien lo envía va renovando. Si el servidor
 * cae a la mitad, el arriendo deja de renovarse, vence y otro ciclo lo vuelve a tomar.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createColaCorreoRepository(pool) {
  // Trabajos que ya les toca: pendientes cuya espera terminó, o "enviando" con el arriendo vencido (servidor caído).
  const LISTO = `(
    (estado = 'pendiente' AND siguiente_intento_en <= NOW())
    OR (estado = 'enviando' AND bloqueado_hasta <= NOW())
  )`;

  function filtroExcluidos(excluir) {
    if (excluir.length === 0) {
      return '';
    }
    return `AND id_cola NOT IN (${excluir.map(() => '?').join(', ')})`;
  }

  // Cierra la transacción sin ocultar el error que la provocó.
  async function deshacer(conexion) {
    try {
      await conexion.rollback();
    } catch {
      // Se conserva el error original.
    }
  }

  return {
    /**
     * Reclama hasta `limite` trabajos. Es atómico: el UPDATE solo se aplica si el trabajo sigue "listo",
     * así dos procesos (o dos ciclos) nunca toman el mismo.
     *
     * @param {number} limite
     * @param {number} arriendoSegundos cuánto tiempo es "suyo" el trabajo antes de considerarlo abandonado.
     * @param {number[]} [excluir] ids que este proceso ya tiene en marcha y que no deben reclamarse otra vez.
     * @returns {Promise<Array<{id: number, idParticipacion: number, intentos: number}>>}
     */
    async reclamar(limite, arriendoSegundos, excluir = []) {
      const tope = Math.max(Math.trunc(Number(limite)), 0);
      if (tope === 0) {
        return [];
      }

      const [candidatos] = await pool.execute(
        `SELECT id_cola FROM cola_correos WHERE ${LISTO} ${filtroExcluidos(excluir)}
          ORDER BY siguiente_intento_en, id_cola LIMIT ${tope}`,
        excluir
      );

      const reclamados = [];
      for (const { id_cola: id } of candidatos) {
        const [resultado] = await pool.execute(
          `UPDATE cola_correos
              SET estado = 'enviando', intentos = intentos + 1,
                  bloqueado_hasta = DATE_ADD(NOW(), INTERVAL ? SECOND)
            WHERE id_cola = ? AND ${LISTO}`,
          [Number(arriendoSegundos), id]
        );
        if (resultado.affectedRows === 1) {
          const [filas] = await pool.execute(
            'SELECT id_cola AS id, id_participacion AS idParticipacion, intentos FROM cola_correos WHERE id_cola = ?',
            [id]
          );
          reclamados.push(filas[0]);
        }
      }
      return reclamados;
    },

    // Alarga el arriendo de un trabajo que sigue enviándose.
    async renovar(id, arriendoSegundos) {
      await pool.execute(
        `UPDATE cola_correos SET bloqueado_hasta = DATE_ADD(NOW(), INTERVAL ? SECOND)
          WHERE id_cola = ? AND estado = 'enviando'`,
        [Number(arriendoSegundos), id]
      );
    },

    /**
     * El correo ya salió: marca la participación y cierra el trabajo en UNA transacción, para que no pueda
     * quedar uno sin el otro (eso provocaría un segundo envío).
     */
    async confirmarEnvio(id, idParticipacion) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();
        await conexion.execute('UPDATE participaciones SET correo_enviado = 1 WHERE id_participacion = ?', [idParticipacion]);
        await conexion.execute(
          "UPDATE cola_correos SET estado = 'enviado', bloqueado_hasta = NULL, ultimo_error = NULL WHERE id_cola = ?",
          [id]
        );
        await conexion.commit();
      } catch (error) {
        await deshacer(conexion);
        throw error;
      } finally {
        conexion.release();
      }
    },

    // El correo no se enviará (la participación ya no existe, ya salió por otra vía o es modo de prueba).
    async marcarOmitido(id, motivo) {
      await pool.execute(
        "UPDATE cola_correos SET estado = 'omitido', bloqueado_hasta = NULL, ultimo_error = ? WHERE id_cola = ?",
        [recortar(motivo), id]
      );
    },

    // Se rindió: queda a la vista del panel para reenviarlo a mano.
    async marcarFallido(id, motivo) {
      await pool.execute(
        "UPDATE cola_correos SET estado = 'fallido', bloqueado_hasta = NULL, ultimo_error = ? WHERE id_cola = ?",
        [recortar(motivo), id]
      );
    },

    /**
     * Lo devuelve a la cola para intentarlo después.
     *
     * @param {number} id
     * @param {number} esperaSegundos
     * @param {string} motivo
     * @param {boolean} [devolverIntento] true si el fallo no fue culpa de este correo (ej. no había cuentas con cupo).
     */
    async reprogramar(id, esperaSegundos, motivo, devolverIntento = false) {
      await pool.execute(
        `UPDATE cola_correos
            SET estado = 'pendiente', bloqueado_hasta = NULL, ultimo_error = ?,
                intentos = IF(? = 1 AND intentos > 0, intentos - 1, intentos),
                siguiente_intento_en = DATE_ADD(NOW(), INTERVAL ? SECOND)
          WHERE id_cola = ?`,
        [recortar(motivo), Number(Boolean(devolverIntento)), Number(esperaSegundos), id]
      );
    },

    /**
     * Toma el trabajo de una participación para enviarlo desde el panel (reenvío manual). Si todavía no tenía
     * trabajo, lo crea. Así el reenvío manual y el despachador nunca envían el mismo correo a la vez.
     *
     * @returns {Promise<number|null>} id del trabajo, o null si ya hay un envío de esa participación en marcha.
     */
    async tomarParaReenvio(idParticipacion, arriendoSegundos) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();
        const [filas] = await conexion.execute(
          `SELECT id_cola, (estado = 'enviando' AND bloqueado_hasta > NOW()) AS ocupado
             FROM cola_correos WHERE id_participacion = ? FOR UPDATE`,
          [idParticipacion]
        );

        let idCola;
        if (filas.length === 0) {
          const [insercion] = await conexion.execute(
            `INSERT INTO cola_correos (id_participacion, estado, intentos, bloqueado_hasta)
             VALUES (?, 'enviando', 1, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
            [idParticipacion, Number(arriendoSegundos)]
          );
          idCola = insercion.insertId;
        } else if (Number(filas[0].ocupado) === 1) {
          await conexion.commit();
          return null;
        } else {
          idCola = filas[0].id_cola;
          await conexion.execute(
            `UPDATE cola_correos
                SET estado = 'enviando', intentos = 1, ultimo_error = NULL,
                    bloqueado_hasta = DATE_ADD(NOW(), INTERVAL ? SECOND)
              WHERE id_cola = ?`,
            [Number(arriendoSegundos), idCola]
          );
        }

        await conexion.commit();
        return idCola;
      } catch (error) {
        await deshacer(conexion);
        // Otro proceso tomó el trabajo en el mismo instante.
        if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_LOCK_DEADLOCK') {
          return null;
        }
        throw error;
      } finally {
        conexion.release();
      }
    },

    // Cuántos trabajos hay en cada estado (para el log y el diagnóstico).
    async contarPorEstado() {
      const [filas] = await pool.execute('SELECT estado, COUNT(*) AS total FROM cola_correos GROUP BY estado');
      const conteo = { pendiente: 0, enviando: 0, enviado: 0, fallido: 0, omitido: 0 };
      for (const fila of filas) {
        conteo[fila.estado] = Number(fila.total);
      }
      return conteo;
    },
  };
}
