import { Worker } from 'node:worker_threads';

// Maximo de PDFs generandose al mismo tiempo 
const MAXIMO_SIMULTANEOS = 2;
const URL_WORKER = new URL('./pdf.worker.js', import.meta.url);

let activos = 0;
const espera = [];

function liberar() {
  activos -= 1;
  const siguiente = espera.shift();
  if (siguiente) {
    siguiente();
  }
}

function ejecutar(datos) {
  return new Promise((resolver, rechazar) => {
    const worker = new Worker(URL_WORKER, { workerData: datos });
    let terminado = false;
    const cerrar = (accion) => {
      if (!terminado) {
        terminado = true;
        accion();
      }
    };
    worker.once('message', (mensaje) => {
      if (mensaje.ok) {
        cerrar(() => resolver(Buffer.from(mensaje.bytes.buffer, mensaje.bytes.byteOffset, mensaje.bytes.byteLength)));
      } else {
        cerrar(() => rechazar(new Error(mensaje.mensaje)));
      }
    });
    worker.once('error', (error) => cerrar(() => rechazar(error)));
    worker.once('exit', (codigo) => {
      cerrar(() => rechazar(new Error(`El worker del PDF terminó con código ${codigo}`)));
    });
  });
}

/** Si ya hay MAXIMO_SIMULTANEOS exportaciones en curso, las demas esperan su turno
 * @returns {Promise<Buffer>}
 */
export async function generarPdfEnHilo(datos) {
  if (activos >= MAXIMO_SIMULTANEOS) {
    await new Promise((resolver) => espera.push(resolver));
  }
  activos += 1;
  try {
    return await ejecutar(datos);
  } finally {
    liberar();
  }
}