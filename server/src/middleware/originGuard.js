const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defensa extra además de CORS: si la petición declara un origen que no está
 * en la lista autorizada, se rechaza con 403.
 *
 * Cuando el servidor también entrega el cliente (SERVE_CLIENT=true), la página y la API comparten
 * dirección y el navegador manda ese mismo origen en cada petición. Por eso, en ese modo,
 * un origen cuyo host coincide con el de la petición también se acepta.
 *
 * Con `requireOriginOnUnsafe` las peticiones que modifican datos (POST, PATCH, DELETE...) deben traer un origen
 * autorizado: los navegadores siempre lo envían, así que solo se rechazan clientes que no son un navegador.
 * Se usa en el panel de administración.
 *
 * @param {string[]} allowedOrigins
 * @param {{allowSameHost?: boolean, requireOriginOnUnsafe?: boolean}} [options]
 */
export function createOriginGuard(allowedOrigins, { allowSameHost = false, requireOriginOnUnsafe = false } = {}) {
  function isSameHost(origin, host) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  return function originGuard(req, res, next) {
    const origin = req.get('origin');
    if (!origin && !(requireOriginOnUnsafe && !SAFE_METHODS.has(req.method))) {
      return next();
    }
    if (origin && allowedOrigins.includes(origin)) {
      return next();
    }
    if (origin && allowSameHost && isSameHost(origin, req.get('host'))) {
      return next();
    }
    return res.status(403).json({ ok: false, code: 'ORIGIN_NOT_ALLOWED', message: 'Origen no autorizado.' });
  };
}
