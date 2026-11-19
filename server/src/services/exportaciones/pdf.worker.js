import { parentPort, workerData } from 'node:worker_threads';
import { generarPdf } from './pdf.js';

try {
  const buffer = await generarPdf(workerData);
  // Copia propia para poder transferirla al hilo principal sin volver a copiarla
  const copia = new Uint8Array(buffer);
  parentPort.postMessage({ ok: true, bytes: copia }, [copia.buffer]);
} catch (error) {
  parentPort.postMessage({ ok: false, mensaje: error?.message ?? String(error) });
}