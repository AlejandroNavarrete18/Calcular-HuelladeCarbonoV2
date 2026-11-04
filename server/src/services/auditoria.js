/**
 * Registro de la bitácora del panel. Un fallo al escribir en la bitácora se anota en el log del servidor,
 * pero no interrumpe la operación que la persona estaba haciendo.
 *
 * @param {{bitacora: {registrar: Function}, logger: {error: Function}}} deps
 */
export function createAuditoria({ bitacora, logger }) {
  return async function registrar(entrada) {
    try {
      await bitacora.registrar(entrada);
    } catch (err) {
      logger.error('No se pudo escribir en la bitácora:', err.code ?? err.message);
    }
  };
}
