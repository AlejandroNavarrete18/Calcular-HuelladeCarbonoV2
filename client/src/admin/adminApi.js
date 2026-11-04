import { ApiError, requestBlob, requestJson } from '../services/httpClient.js';

// Llamadas a la API del panel. El token CSRF solo vive en memoria: al recargar la página se vuelve a pedir
let csrfToken = '';
let onSessionLost = () => {};

export function setCsrfToken(token) {
  csrfToken = token;
}

// Registra qué hacer cuando el servidor dice que la sesión terminó (por ejemplo, volver al inicio de sesión).
export function setSessionLostHandler(handler) {
  onSessionLost = handler;
}

// es para la comprobación inicial: no tener sesión al abrir la pagina no es una sesión que termino.
async function request(path, { announceExpiry = true, ...options } = {}) {
  try {
    return await requestJson(`/api/admin${path}`, { ...options, headers: { 'X-CSRF-Token': csrfToken } });
  } catch (error) {
    // Un 401 en el login significa "credenciales incorrectas", no "sesión terminada".
    if (announceExpiry && error instanceof ApiError && error.status === 401 && error.code !== 'INVALID_CREDENTIALS') {
      onSessionLost();
    }
    throw error;
  }
}

// Convierte un objeto de filtros en "a=1&b=2", omitiendo los vacíos
export function toQuery(params) {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== '' && value !== undefined && value !== null) {
      query.set(name, String(value));
    }
  }
  return query.toString();
}

// Funciones de lectura
export const loaders = Object.freeze({
  sesion: async (_param, signal) => {
    const data = await request('/auth/yo', { signal, announceExpiry: false });
    setCsrfToken(data.csrf);
    return data;
  },
  resumen: (query, signal) => request(`/resumen?${query}`, { signal }),
  participaciones: (query, signal) => request(`/participaciones?${query}`, { signal }),
  participacion: async (id, signal) => (await request(`/participaciones/${encodeURIComponent(id)}`, { signal })).participacion,
  cuentasCorreo: async (_param, signal) => (await request('/correo/cuentas', { signal })).items,
  envios: (query, signal) => request(`/correo/envios?${query}`, { signal }),
  resumenCorreo: (_param, signal) => request('/correo/resumen', { signal }),
  pendientesCorreo: (query, signal) => request(`/correo/pendientes?${query}`, { signal }),
  administradores: async (_param, signal) => (await request('/administradores', { signal })).items,
  bitacora: (query, signal) => request(`/bitacora?${query}`, { signal }),
});

export async function iniciarSesion(correo, contrasena) {
  const data = await request('/auth/login', { method: 'POST', body: { correo, contrasena } });
  setCsrfToken(data.csrf);
  await comprobarCookieDeSesion();
  return data;
}

/*
 * El servidor ya abrió la sesión, pero el navegador solo la conserva si acepta la cookie. Si el panel se abre por http
 * y la cookie es "secure", la descarta en silencio y el panel se vería abierto un instante para luego cerrarse solo.
 * Se confirma aquí para avisar el motivo real en vez de dejar a la persona sin explicación.
 */
async function comprobarCookieDeSesion() {
  try {
    await request('/auth/yo', { announceExpiry: false });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setCsrfToken('');
      throw new ApiError('Tu navegador no guardó la sesión. Abre el panel por una dirección https o avisa al responsable del servidor.', {
        status: 401,
        code: 'COOKIE_NOT_STORED',
      });
    }
    throw error;
  }
}

export async function cerrarSesion() {
  await request('/auth/logout', { method: 'POST' });
  setCsrfToken('');
}

// Latido de fondo: dice al servidor que la página sigue abierta. `activo` indica si la persona usó la página desde el anterior.
export const enviarLatido = (activo) => request('/auth/latido', { method: 'POST', body: { activo } });

// Avisa al servidor que la página se está cerrando
export function avisarCierre() {
  if (!csrfToken || !navigator.sendBeacon) {
    return;
  }
  const cuerpo = new Blob([JSON.stringify({ csrf: csrfToken })], { type: 'application/json' });
  navigator.sendBeacon('/api/admin/auth/cerrando', cuerpo);
}

export const cambiarContrasena = (actual, nueva) => request('/auth/cambiar-contrasena', { method: 'POST', body: { actual, nueva } });
export const eliminarParticipacion = (id) => request(`/participaciones/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const crearCuentaCorreo = (cuenta) => request('/correo/cuentas', { method: 'POST', body: cuenta });
export const actualizarCuentaCorreo = (id, cambios) => request(`/correo/cuentas/${encodeURIComponent(id)}`, { method: 'PATCH', body: cambios });
export const crearAdministrador = (administrador) => request('/administradores', { method: 'POST', body: administrador });
export const actualizarAdministrador = (id, cambios) => request(`/administradores/${encodeURIComponent(id)}`, { method: 'PATCH', body: cambios });
export const restablecerContrasena = (id, contrasena) =>
  request(`/administradores/${encodeURIComponent(id)}/contrasena`, { method: 'POST', body: { contrasena } });

export const reenviarCorreos = (peticion) => request('/correo/reenviar', { method: 'POST', body: peticion });
export const consultarReenvio = async (signal) => (await request('/correo/reenvio', { signal })).trabajo;

// Nombre del archivo que propone el servidor
function nombreDeArchivo(headers, formato) {
  const match = /filename="?([^";]+)"?/i.exec(headers.get('Content-Disposition') ?? '');
  if (match) {
    return match[1];
  }
  return `participaciones.${formato}`;
}

/**
 * Pide el archivo exportado (xlsx, pdf o csv) con los filtros aplicados.
 * Se descarga con fetch para poder mostrar un error legible (sesión vencida, límite de exportaciones...)
 * en lugar de guardar un archivo dañado.
 *
 * @returns {Promise<{blob: Blob, filename: string, filas: number, truncado: boolean}>}
 */
export async function descargarExportacion(query, formato) {
  const separador = '&';
  let ruta = `/api/admin/participaciones/exportar?formato=${formato}`;
  if (query) {
    ruta += `${separador}${query}`;
  }
  try {
    const { blob, headers } = await requestBlob(ruta, { headers: { 'X-CSRF-Token': csrfToken } });
    return {
      blob,
      filename: nombreDeArchivo(headers, formato),
      filas: Number(headers.get('X-Filas-Exportadas')) || 0,
      truncado: headers.get('X-Exportacion-Truncada') === 'true',
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      onSessionLost();
    }
    throw error;
  }
}

// Entrega el archivo descargado al navegador (en móvil abre el menú de guardar o compartir).
export function guardarArchivo(blob, filename) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = filename;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
