const CLAVE_CUESTIONARIO = /^[a-z][a-z0-9_]{0,29}$/;
const POSITIVE_INTEGER = /^[1-9]\d{0,9}$/;
const MAX_UNSIGNED_INT = 4_294_967_295;

/**
 * Valida que el parámetro de la URL sea un id numérico positivo y lo deja como número en `req.params`.
 *
 * @param {string} nombre Nombre del parámetro (ej. "idUnidad").
 */
export function validarIdParam(nombre) {
  return function validarId(req, res, next) {
    const texto = String(req.params[nombre] ?? '');
    if (!POSITIVE_INTEGER.test(texto) || Number(texto) > MAX_UNSIGNED_INT) {
      return res.status(400).json({ ok: false, code: 'INVALID_ID', message: 'El identificador no es válido.' });
    }
    req.params[nombre] = Number(texto);
    return next();
  };
}

/**
 * Valida que el parámetro de la URL tenga la forma de una clave de cuestionario ("hogar", "trabajo"...).
 * Solo revisa la forma: si el cuestionario existe lo decide el controlador.
 *
 * @param {string} nombre Nombre del parámetro (ej. "clave").
 */
export function validarClaveParam(nombre) {
  return function validarClave(req, res, next) {
    if (!CLAVE_CUESTIONARIO.test(String(req.params[nombre] ?? ''))) {
      return res.status(400).json({ ok: false, code: 'INVALID_KEY', message: 'La clave del cuestionario no es válida.' });
    }
    return next();
  };
}
