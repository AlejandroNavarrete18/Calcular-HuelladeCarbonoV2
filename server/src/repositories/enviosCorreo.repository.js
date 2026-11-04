const MAX_ASUNTO = 255;
const MAX_ID_MENSAJE = 255;
const MAX_CODIGO_ERROR = 50;
const MAX_MENSAJE_ERROR = 500;

// Recorta un texto opcional al largo de su columna; null si no hay texto.
function recortarOpcional(texto, maximo) {
  if (texto === null || texto === undefined) {
    return null;
  }
  return String(texto).slice(0, maximo);
}

/**
 * Acceso a la tabla `envios_correo`: bitácora de cada correo enviado o fallido.
 *
 * @param {import('mysql2/promise').Pool} pool
 */
export function createEnviosCorreoRepository(pool) {
  return {
    // Indica si la bitácora ya tiene un envío exitoso para esa participación (evita mandar el mismo correo dos veces).
    async existeEnviado(idParticipacion) {
      const [filas] = await pool.execute(
        "SELECT 1 FROM envios_correo WHERE id_participacion = ? AND estado = 'enviado' LIMIT 1",
        [idParticipacion]
      );
      return filas.length > 0;
    },

    // Inserta una fila en envios_correo (éxito o fallo).
    async registrarEnvio({
      idParticipacion = null,
      idCuenta = null,
      remitente,
      destinatario,
      asunto = null,
      estado,
      idMensaje = null,
      tipoError = null,
      codigoError = null,
      mensajeError = null,
    }) {
      await pool.execute(
        `INSERT INTO envios_correo
           (id_participacion, id_cuenta_correo, remitente, destinatario, asunto, estado,
            id_mensaje, tipo_error, codigo_error, mensaje_error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idParticipacion,
          idCuenta,
          remitente,
          destinatario,
          recortarOpcional(asunto, MAX_ASUNTO),
          estado,
          recortarOpcional(idMensaje, MAX_ID_MENSAJE),
          tipoError,
          recortarOpcional(codigoError, MAX_CODIGO_ERROR),
          recortarOpcional(mensajeError, MAX_MENSAJE_ERROR),
        ]
      );
    },
  };
}
