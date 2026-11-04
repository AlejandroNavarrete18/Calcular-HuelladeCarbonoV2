export class HttpError extends Error {
  /**
   * @param {number} status Código HTTP.
   * @param {string} code Código estable para el cliente (ej. "VALIDATION_ERROR").
   * @param {string} message Mensaje listo para mostrar.
   * @param {Array<{field: string, message: string}>} [errors] Detalle por campo.
   */
  constructor(status, code, message, errors = []) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export const badRequest = (code, message, errors) => new HttpError(400, code, message, errors);
export const notFound = (code, message) => new HttpError(404, code, message);
export const unauthorized = (code, message) => new HttpError(401, code, message);
export const forbidden = (code, message) => new HttpError(403, code, message);
export const conflict = (code, message) => new HttpError(409, code, message);
