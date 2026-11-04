/**
 * Acceso a la tabla `cuentas_correo`: cuentas de Gmail que se turnan para enviar los correos.
 * Es la única parte del código que conoce el SQL de esta tabla.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createCuentasCorreoRepository(pool) {
  /*
   * Condición compartida: la cuenta está activa, no pausada y todavía tiene cupo hoy.
   * (NOT (a <=> b) es "a distinto de b" tratando NULL como un valor: si el contador es de otro día, hay cupo.)
   */
  const CON_CUPO = `
    activo = 1
    AND (bloqueada_hasta IS NULL OR bloqueada_hasta <= NOW())
    AND (NOT (fecha_contador <=> CURDATE()) OR enviados_hoy < limite_diario)`;

  // Fecha de la última reserva como texto con microsegundos (mysql2 solo conserva milisegundos en un Date).
  const FORMATO_RESERVA = "DATE_FORMAT(ultima_reserva_en, '%Y-%m-%d %H:%i:%s.%f')";

  const recortar = (texto) => String(texto).slice(0, 500);

  return {
    /**
     * Reserva UN envío siguiendo un turno rotativo (la cuenta que lleva MÁS tiempo sin usarse va primero).
     *
     * - Orden: primero las cuentas nunca usadas, luego la de `ultima_reserva_en` más antigua; la prioridad
     *   solo desempata. Así los envíos se intercalan entre todas las cuentas con cupo.
     * - Es atómico: el UPDATE solo se aplica si la cuenta sigue con cupo Y nadie la reservó después de que
     *   la leímos (`ultima_reserva_en` igual a la que vimos). Dos peticiones simultáneas nunca obtienen la
     *   misma cuenta: la segunda ve que ya cambió y pasa a la siguiente del turno.
     *
     * @param {number[]} [excluir] ids que no deben usarse (fallaron en este envío o están enviando ahora mismo).
     * @returns {Promise<object|null>} la cuenta reservada, o null si no queda ninguna.
     */
    async reservarCuenta(excluir = []) {
      let filtroExcluidas = '';
      if (excluir.length > 0) {
        filtroExcluidas = `AND id_cuenta_correo NOT IN (${excluir.map(() => '?').join(', ')})`;
      }

      const [candidatas] = await pool.execute(
        `SELECT id_cuenta_correo, ${FORMATO_RESERVA} AS visto
         FROM cuentas_correo
         WHERE ${CON_CUPO} ${filtroExcluidas}
         ORDER BY ultima_reserva_en IS NOT NULL, ultima_reserva_en, prioridad, id_cuenta_correo
         LIMIT 50`,
        excluir
      );

      for (const { id_cuenta_correo: id, visto } of candidatas) {
        /*
         * En MySQL las asignaciones del SET se evalúan de izquierda a derecha: enviados_hoy va
         * ANTES de fecha_contador para que todavía use el valor anterior de la fecha.
         */
        const [resultado] = await pool.execute(
          `UPDATE cuentas_correo
           SET enviados_hoy = IF(fecha_contador <=> CURDATE(), enviados_hoy, 0) + 1,
               fecha_contador = CURDATE(),
               ultima_reserva_en = NOW(6)
           WHERE id_cuenta_correo = ? AND ${CON_CUPO} AND ${FORMATO_RESERVA} <=> ?`,
          [id, visto]
        );
        if (resultado.affectedRows === 1) {
          const [filas] = await pool.execute('SELECT * FROM cuentas_correo WHERE id_cuenta_correo = ?', [id]);
          return filas[0];
        }
        // Otra petición se llevó esta cuenta (o su último cupo): se prueba con la siguiente del turno.
      }
      return null;
    },

    /**
     * Cuántas cuentas pueden enviar ahora mismo y cuántos envíos les caben hoy en total.
     * Es una consulta ligera: no trae contraseñas ni filas completas.
     *
     * @returns {Promise<{cuentas: number, cupo: number}>}
     */
    async resumenDisponible() {
      const [filas] = await pool.execute(
        `SELECT COUNT(*) AS cuentas,
                COALESCE(SUM(limite_diario - IF(fecha_contador <=> CURDATE(), enviados_hoy, 0)), 0) AS cupo
           FROM cuentas_correo
          WHERE ${CON_CUPO}`
      );
      return { cuentas: Number(filas[0].cuentas), cupo: Number(filas[0].cupo) };
    },

    // Devuelve el cupo reservado (el envío no se hizo por un error que no es culpa de la cuenta).
    async liberarCupo(idCuenta) {
      await pool.execute(
        `UPDATE cuentas_correo SET enviados_hoy = IF(enviados_hoy > 0, enviados_hoy - 1, 0)
         WHERE id_cuenta_correo = ? AND fecha_contador <=> CURDATE()`,
        [idCuenta]
      );
    },

    // Marca un envío exitoso.
    async confirmarEnvio(idCuenta) {
      await pool.execute(
        'UPDATE cuentas_correo SET total_enviados = total_enviados + 1, ultimo_envio_en = NOW() WHERE id_cuenta_correo = ?',
        [idCuenta]
      );
    },

    // Pausa la cuenta N minutos (ej. el proveedor dijo "cuota diaria excedida").
    async bloquearCuenta(idCuenta, minutos, motivo) {
      await pool.execute(
        `UPDATE cuentas_correo
         SET bloqueada_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE), ultimo_error = ?, ultimo_error_en = NOW()
         WHERE id_cuenta_correo = ?`,
        [minutos, recortar(motivo), idCuenta]
      );
    },

    // Apaga la cuenta hasta que un administrador la revise (ej. contraseña de aplicación inválida).
    async desactivarCuenta(idCuenta, motivo) {
      await pool.execute(
        'UPDATE cuentas_correo SET activo = 0, ultimo_error = ?, ultimo_error_en = NOW() WHERE id_cuenta_correo = ?',
        [recortar(motivo), idCuenta]
      );
    },

    // Guarda el último error de una cuenta sin pausarla (fallos temporales).
    async registrarError(idCuenta, motivo) {
      await pool.execute(
        'UPDATE cuentas_correo SET ultimo_error = ?, ultimo_error_en = NOW() WHERE id_cuenta_correo = ?',
        [recortar(motivo), idCuenta]
      );
    },

    // Cuentas activas (para verificar credenciales al arrancar).
    async listarActivas() {
      const [filas] = await pool.execute(
        'SELECT * FROM cuentas_correo WHERE activo = 1 ORDER BY prioridad, id_cuenta_correo'
      );
      return filas;
    },
  };
}
