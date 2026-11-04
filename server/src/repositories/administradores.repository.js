const COLUMNAS_PUBLICAS = `id_administrador AS id, nombre, correo, rol, activo, intentos_fallidos,
  (bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW()) AS bloqueado, ultimo_acceso, creado_en`;

// Campos que se pueden cambiar con `actualizar`; el nombre de la columna nunca viene del exterior.
const COLUMNAS_EDITABLES = Object.freeze({ nombre: 'nombre', rol: 'rol', activo: 'activo' });

/**
 * Acceso a las tablas `administradores` y `sesiones_admin`.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createAdministradoresRepository(pool) {
  return {
    // Fila completa (con el hash de la contraseña) para validar el inicio de sesión.
    async buscarParaLogin(correo) {
      const [filas] = await pool.execute(
        `SELECT id_administrador AS id, nombre, correo, contrasena_hash, rol, activo,
                (bloqueado_hasta IS NOT NULL AND bloqueado_hasta > NOW()) AS bloqueado
           FROM administradores WHERE correo = ?`,
        [correo]
      );
      return filas[0] ?? null;
    },

    async buscarPorId(id) {
      const [filas] = await pool.execute(`SELECT ${COLUMNAS_PUBLICAS} FROM administradores WHERE id_administrador = ?`, [id]);
      return filas[0] ?? null;
    },

    async buscarContrasenaHash(id) {
      const [filas] = await pool.execute('SELECT contrasena_hash FROM administradores WHERE id_administrador = ?', [id]);
      return filas[0]?.contrasena_hash ?? null;
    },

    async listar() {
      const [filas] = await pool.execute(`SELECT ${COLUMNAS_PUBLICAS} FROM administradores ORDER BY nombre, id_administrador`);
      return filas;
    },

    /** @returns {Promise<number>} id del administrador creado (lanza ER_DUP_ENTRY si el correo ya existe) */
    async crear({ nombre, correo, contrasenaHash, rol }) {
      const [resultado] = await pool.execute(
        'INSERT INTO administradores (nombre, correo, contrasena_hash, rol) VALUES (?, ?, ?, ?)',
        [nombre, correo, contrasenaHash, rol]
      );
      return resultado.insertId;
    },

    // Cambia solo los campos permitidos (nombre, rol, activo).
    async actualizar(id, cambios) {
      const columnas = Object.keys(cambios).filter((campo) => campo in COLUMNAS_EDITABLES);
      if (columnas.length === 0) {
        return;
      }
      const asignaciones = columnas.map((campo) => `${COLUMNAS_EDITABLES[campo]} = ?`).join(', ');
      await pool.execute(`UPDATE administradores SET ${asignaciones} WHERE id_administrador = ?`, [
        ...columnas.map((campo) => cambios[campo]),
        id,
      ]);
    },

    async cambiarContrasena(id, contrasenaHash) {
      await pool.execute(
        'UPDATE administradores SET contrasena_hash = ?, intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id_administrador = ?',
        [contrasenaHash, id]
      );
    },

    /*
     * Suma un intento fallido. Al llegar al máximo bloquea la cuenta y reinicia el contador, así al terminar el
     * bloqueo la persona vuelve a tener todos sus intentos. En UPDATE, MySQL evalúa las asignaciones de izquierda
     * a derecha: bloqueado_hasta va primero para leer todavía el contador anterior.
     */
    async registrarFalloDeLogin(id, { maxIntentos, minutosBloqueo }) {
      await pool.execute(
        `UPDATE administradores
            SET bloqueado_hasta = IF(intentos_fallidos + 1 >= ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), bloqueado_hasta),
                intentos_fallidos = IF(intentos_fallidos + 1 >= ?, 0, intentos_fallidos + 1)
          WHERE id_administrador = ?`,
        [maxIntentos, minutosBloqueo, maxIntentos, id]
      );
    },

    async registrarAcceso(id) {
      await pool.execute(
        'UPDATE administradores SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW() WHERE id_administrador = ?',
        [id]
      );
    },

    async contarSuperadminsActivos() {
      const [filas] = await pool.execute("SELECT COUNT(*) AS total FROM administradores WHERE rol = 'superadmin' AND activo = 1");
      return filas[0].total;
    },

    async crearSesion({ idAdministrador, tokenHash, ip, agenteUsuario, horas }) {
      await pool.execute(
        `INSERT INTO sesiones_admin (id_administrador, token_hash, ip, agente_usuario, expira_en)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
        [idAdministrador, tokenHash, ip, agenteUsuario, horas]
      );
    },

    /*
     * Sesión vigente de una cuenta activa, junto con los datos de la persona. Vigente significa:
     * no revocada, dentro de su duración máxima, con actividad reciente (`minutosInactividad`) y sin un aviso
     * de cierre de ventana vencido (la persona cerró la pestaña o el navegador y no volvió).
     */
    async buscarSesionActiva(tokenHash, minutosInactividad) {
      const [filas] = await pool.execute(
        `SELECT s.id_sesion AS idSesion, s.expira_en AS expiraEn,
                a.id_administrador AS id, a.nombre, a.correo, a.rol
           FROM sesiones_admin s
           JOIN administradores a ON a.id_administrador = s.id_administrador
          WHERE s.token_hash = ? AND s.revocada_en IS NULL AND s.expira_en > NOW() AND a.activo = 1
            AND s.ultima_actividad > DATE_SUB(NOW(), INTERVAL ? MINUTE)
            AND (s.cierre_pendiente_en IS NULL OR s.cierre_pendiente_en > NOW())`,
        [tokenHash, minutosInactividad]
      );
      return filas[0] ?? null;
    },

    // Toda petición autenticada demuestra que la página sigue abierta: cancela un aviso de cierre pendiente.
    // `conActividad` además reinicia el reloj de inactividad (el latido de fondo no lo hace).
    async registrarPresencia(idSesion, { conActividad }) {
      await pool.execute(
        `UPDATE sesiones_admin
            SET cierre_pendiente_en = NULL,
                ultima_actividad = IF(?, NOW(), ultima_actividad)
          WHERE id_sesion = ?`,
        [conActividad ? 1 : 0, idSesion]
      );
    },

    // La página avisó que se está cerrando: si no hay señales en `segundos`, la sesión deja de valer.
    async marcarCierrePendiente(tokenHash, segundos) {
      await pool.execute(
        `UPDATE sesiones_admin SET cierre_pendiente_en = DATE_ADD(NOW(), INTERVAL ? SECOND)
          WHERE token_hash = ? AND revocada_en IS NULL`,
        [segundos, tokenHash]
      );
    },

    async revocarSesion(tokenHash) {
      await pool.execute('UPDATE sesiones_admin SET revocada_en = NOW() WHERE token_hash = ? AND revocada_en IS NULL', [tokenHash]);
    },

    // Cierra todas las sesiones de una persona; `conservarTokenHash` deja viva la sesión actual.
    async revocarSesionesDe(idAdministrador, conservarTokenHash = '') {
      await pool.execute(
        'UPDATE sesiones_admin SET revocada_en = NOW() WHERE id_administrador = ? AND revocada_en IS NULL AND token_hash <> ?',
        [idAdministrador, conservarTokenHash]
      );
    },

    // Borra sesiones que ya no sirven (vencidas o revocadas hace más de una semana).
    async limpiarSesiones() {
      await pool.execute(
        `DELETE FROM sesiones_admin
          WHERE expira_en < DATE_SUB(NOW(), INTERVAL 7 DAY) OR revocada_en < DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );
    },
  };
}
