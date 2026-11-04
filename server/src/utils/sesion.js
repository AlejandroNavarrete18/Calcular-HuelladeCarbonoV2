import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const COOKIE_NAME = 'huella_admin';
// La cookie solo viaja hacia la API del panel, no hacia el resto del sitio.
export const COOKIE_PATH = '/api/admin';

const TOKEN_BYTES = 32;
// Largo en texto (base64url) de un token de TOKEN_BYTES bytes.
const TOKEN_LENGTH = 43;

// Token aleatorio de la sesión: es lo único que viaja en la cookie.
export function generarToken() {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

// En la base solo se guarda el hash del token: si se filtrara la tabla, las sesiones no se podrían usar.
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Token anti-CSRF ligado a la sesión: el navegador lo recibe en el JSON y lo reenvía en una cabecera.
export function tokenCsrf(token) {
  return createHash('sha256').update(`csrf:${token}`).digest('base64url');
}

export function tokensIguales(a, b) {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

// Lee el token de la cookie de sesión; devuelve una cadena vacía si no hay o si no tiene el formato esperado.
export function leerTokenDeCookie(req) {
  const cabecera = req.headers.cookie ?? '';
  for (const parte of cabecera.split(';')) {
    const indice = parte.indexOf('=');
    if (indice !== -1 && parte.slice(0, indice).trim() === COOKIE_NAME) {
      const valor = parte.slice(indice + 1).trim();
      if (valor.length === TOKEN_LENGTH && /^[A-Za-z0-9_-]+$/.test(valor)) {
        return valor;
      }
    }
  }
  return '';
}

// Opciones de la cookie de sesión.
export function opcionesCookie({ secureCookies }) {
  return { httpOnly: true, sameSite: 'strict', secure: secureCookies, path: COOKIE_PATH };
}
