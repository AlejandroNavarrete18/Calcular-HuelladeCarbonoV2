import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { EMAIL_LOGOS, getEmailAttachments } from '../../templates/emailAssets.js';

// Carpeta server/.dry-run/ (termina en "/"). Está en .gitignore.
const PREVIEW_DIR = fileURLToPath(new URL('../../../.dry-run/', import.meta.url));

/**
 * Modo dry-run: en lugar de enviar el correo, lo guarda como HTML y texto para revisarlo en el navegador.
 *
 * @param {{to: string, subject: string, html: string, text: string}} correo
 */
export async function writeDryRunPreview({ to, subject, html, text }) {
  await mkdir(PREVIEW_DIR, { recursive: true });

  for (const attachment of getEmailAttachments()) {
    await copyFile(attachment.path, `${PREVIEW_DIR}${attachment.filename}`);
  }

  // En el correo real los logos van incrustados (cid:); en la vista previa se leen de los archivos copiados.
  let previewHtml = html;
  for (const logo of Object.values(EMAIL_LOGOS)) {
    previewHtml = previewHtml.replaceAll(`cid:${logo.cid}`, logo.filename);
  }

  await writeFile(`${PREVIEW_DIR}ultimo-correo.html`, previewHtml, 'utf8');
  await writeFile(`${PREVIEW_DIR}ultimo-correo.txt`, `Para: ${to}\nAsunto: ${subject}\n\n${text}`, 'utf8');
}
