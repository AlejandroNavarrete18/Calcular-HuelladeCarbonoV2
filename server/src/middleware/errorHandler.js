import { HttpError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

// Códigos de error de red/MySQL que significan "la base de datos no está disponible ahora".
const DATABASE_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
]);

const send = (res, status, code, message, extra = {}) => res.status(status).json({ ok: false, code, message, ...extra });

// 404 en formato JSON para rutas desconocidas.
export function notFoundHandler(_req, res) {
  send(res, 404, 'NOT_FOUND', 'Ruta no encontrada.');
}

/**
 * Manejo centralizado de errores (último middleware de Express).
 *
 * A la persona SOLO le llegan mensajes genéricos: nunca credenciales, rutas internas, consultas SQL ni
 * errores nativos de MySQL. El detalle completo queda únicamente en el log del servidor.
 */
export function errorHandler(err, _req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof HttpError) {
    return send(res, err.status, err.code, err.message, { errors: err.errors });
  }
  if (err?.type === 'entity.parse.failed') {
    return send(res, 400, 'INVALID_JSON', 'El cuerpo de la petición no es un JSON válido.');
  }
  if (err?.type === 'entity.too.large') {
    return send(res, 413, 'PAYLOAD_TOO_LARGE', 'La petición es demasiado grande.');
  }

  logger.error('Error no controlado:', err?.code ?? '', err?.message ?? err);

  if (DATABASE_UNAVAILABLE_CODES.has(err?.code)) {
    return send(res, 503, 'SERVICE_UNAVAILABLE', 'El servicio no está disponible por ahora. Inténtalo en unos minutos.');
  }
  return send(res, 500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado en el servidor.');
}
