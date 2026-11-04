//Cliente HTTP mínimo para hablar con la api
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
const DEFAULT_TIMEOUT_MS = 20_000;

// Error de la api con un mensaje listo para mostrar a la persona
export class ApiError extends Error {
  constructor(message, { status, code, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors ?? [];
  }
}

// ¿La petición se canceló a propósito (la pantalla ya no la necesita)? No es un error que mostrar 
export const isAbortError = (error) => error?.name === 'AbortError';

// Lee el cuerpo JSON de la respuesta; devuelve null si no hay JSON
async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

// Opciones de fetch: solo agrega cabecera y cuerpo cuando hay datos que enviar.
function buildFetchOptions({ method, body, signal, headers }) {
  const options = { method, signal, credentials: 'same-origin' };
  const finalHeaders = { ...headers };
  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  if (Object.keys(finalHeaders).length > 0) {
    options.headers = finalHeaders;
  }
  return options;
}

/**
 * Hace una petición a la api devuelve el json de la respuesta.
 *
 * @param {string} path Ruta que empieza con "/api/...".
 * @param {{method?: string, body?: unknown, headers?: Record<string, string>, signal?: AbortSignal, timeoutMs?: number}} [options]
 *   `signal` permite cancelar la petición
 * @throws {ApiError} Si la api devuelve un error, o si no se pudo conectar con el servidor
 * @throws {DOMException} abortado si la petición se canceló a propósito
 */
export async function requestJson(path, { method = 'GET', body, headers, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // Si quien llama cancela, se cancela también la petición real.
  const forwardCancel = () => controller.abort();
  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', forwardCancel, { once: true });
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, buildFetchOptions({ method, body, headers, signal: controller.signal }));
    const data = await readJsonSafely(response);

    if (!response.ok) {
      throw new ApiError(data?.message ?? 'No pudimos completar la solicitud. Inténtalo de nuevo.', {
        status: response.status,
        code: data?.code,
        errors: data?.errors,
      });
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (isAbortError(error)) {
      if (timedOut) {
        throw new ApiError('El servidor tardó demasiado en responder. Inténtalo de nuevo.');
      }
      throw error;
    }
    throw new ApiError('No pudimos conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardCancel);
  }
}

/**
 * Descarga un archivo (Excel, PDF...) de la api. Si la api responde con un error, lo convierte en ApiError
 * con su mensaje (en lugar de guardar un archivo de error con el nombre del reporte).
 *
 * @returns {Promise<{blob: Blob, headers: Headers}>}
 */
export async function requestBlob(path, { headers, signal, timeoutMs = 120_000 } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardCancel = () => controller.abort();
  signal?.addEventListener('abort', forwardCancel, { once: true });

  try {
    const response = await fetch(`${API_BASE}${path}`, { credentials: 'same-origin', headers, signal: controller.signal });
    if (!response.ok) {
      const data = await readJsonSafely(response);
      throw new ApiError(data?.message ?? 'No pudimos generar el archivo. Inténtalo de nuevo.', {
        status: response.status,
        code: data?.code,
        errors: data?.errors,
      });
    }
    return { blob: await response.blob(), headers: response.headers };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (isAbortError(error) && timedOut) {
      throw new ApiError('El servidor tardó demasiado en generar el archivo. Prueba con menos datos o con filtros.');
    }
    if (isAbortError(error)) {
      throw error;
    }
    throw new ApiError('No pudimos conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardCancel);
  }
}
