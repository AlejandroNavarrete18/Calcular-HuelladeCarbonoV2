import { fileURLToPath } from 'node:url';

// Imágenes del correo (logotipos institucionales).
const ASSETS_DIR = new URL('../../assets/email/', import.meta.url);

export const EMAIL_LOGOS = Object.freeze({
  uas: Object.freeze({ cid: 'logo-uas', filename: 'logo-uas.png', alt: 'Escudo de la Universidad Autónoma de Sinaloa' }),
  bienestar: Object.freeze({
    cid: 'logo-bienestar',
    filename: 'logo-bienestar.png',
    alt: 'Bienestar Universitario',
  }),
});

// Adjuntos de Nodemailer para incrustar los logos dentro del HTML.
export function getEmailAttachments() {
  return Object.values(EMAIL_LOGOS).map((logo) => ({
    filename: logo.filename,
    path: fileURLToPath(new URL(logo.filename, ASSETS_DIR)),
    cid: logo.cid,
    contentType: 'image/png',
    contentDisposition: 'inline',
  }));
}
