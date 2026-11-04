import { CATEGORIES } from '@huella/shared';
import { EMAIL_LOGOS } from './emailAssets.js';

// Plantilla del correo con los resultados (HTML y texto plano).

// Paleta institucional.
const COLOR = Object.freeze({
  navy950: '#071a3b',
  navy900: '#0a2352',
  navy800: '#0f2f6b',
  navy100: '#e3eaf7',
  navy50: '#f1f5fc',
  gold400: '#f4c430',
  sun500: '#ef7d17',
  sun600: '#d96a08',
  ink: '#17223b',
  muted: '#5b6784',
  paper: '#f6f7fb',
  white: '#ffffff',
});

const FONT_TEXT = "Arial,Helvetica,sans-serif";
const FONT_DISPLAY = "Georgia,'Times New Roman',serif";

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escapa caracteres especiales de HTML.
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

// Número con formato mexicano: 10,493.8
const formatKg = (value) => Number(value).toLocaleString('es-MX', { maximumFractionDigits: 2 });

function pillTextColor(background) {
  if (background.toLowerCase() === '#f4c430') {
    return COLOR.ink;
  }
  return COLOR.white;
}

function buildGreeting(name) {
  if (name) {
    return `Hola, ${name}:`;
  }
  return 'Hola:';
}

function renderColorBand(height) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="45%" height="${height}" style="background:${COLOR.navy900};font-size:0;line-height:0;">&nbsp;</td>
    <td width="30%" height="${height}" style="background:${COLOR.gold400};font-size:0;line-height:0;">&nbsp;</td>
    <td width="25%" height="${height}" style="background:${COLOR.sun500};font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>`;
}

function renderLogo(logo, width, height) {
  return `<img src="cid:${logo.cid}" alt="${esc(logo.alt)}" width="${width}" height="${height}"
    style="display:block;border:0;outline:none;width:${width}px;height:${height}px;">`;
}

// logos de Bienestar Universitario y de la UAS + nombre de la universidad.
function renderHeader() {
  return `<tr><td style="background:${COLOR.white};padding:16px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="75" valign="middle">${renderLogo(EMAIL_LOGOS.bienestar, 75, 64)}</td>
      <td width="50" valign="middle" style="padding-left:14px;">${renderLogo(EMAIL_LOGOS.uas, 50, 64)}</td>
      <td valign="middle" style="padding-left:16px;">
        <div style="font-family:${FONT_TEXT};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${COLOR.sun600};">Universidad Autónoma de Sinaloa</div>
        <div style="font-family:${FONT_DISPLAY};font-size:19px;font-weight:bold;line-height:1.25;color:${COLOR.navy900};margin-top:3px;">Bienestar Universitario</div>
      </td>
    </tr></table>
  </td></tr>`;
}

// Banner azul con el título del resultado.
function renderHero(title) {
  return `<tr><td style="background:${COLOR.navy900};padding:24px 28px 26px 28px;">
    <div style="font-family:${FONT_TEXT};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COLOR.gold400};">Calculadora de huella de carbono</div>
    <div style="font-family:${FONT_DISPLAY};font-size:26px;line-height:1.25;font-weight:bold;color:${COLOR.white};margin-top:8px;">${esc(title)}</div>
  </td></tr>
  <tr><td height="5" style="background:${COLOR.gold400};font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

// Tarjeta con el total de kg CO2e, el nivel y la leyenda de árboles.
function renderTotalCard(results) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.navy50};border:1px solid ${COLOR.navy100};border-radius:12px;">
    <tr><td align="center" style="padding:22px 16px;">
      <div style="font-family:${FONT_TEXT};font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:${COLOR.muted};">Tu huella estimada</div>
      <div style="font-family:${FONT_DISPLAY};font-size:40px;font-weight:bold;color:${COLOR.navy900};margin-top:6px;">
        ${esc(formatKg(results.totalKg))} <span style="font-size:18px;color:${COLOR.sun600};">kg CO₂e / año</span>
      </div>
      <div style="margin-top:12px;">
        <span style="display:inline-block;background:${esc(results.levelColor)};color:${pillTextColor(results.levelColor)};font-family:${FONT_TEXT};font-size:13px;font-weight:bold;padding:6px 16px;border-radius:999px;">${esc(results.level)}</span>
      </div>
      <div style="font-family:${FONT_TEXT};font-size:14px;color:${COLOR.navy800};margin-top:12px;">🌳 ${esc(results.treesText)}</div>
    </td></tr>
  </table>`;
}

// Filas con el total y una barra de progreso por categoría.
function renderCategoryRows(results) {
  return CATEGORIES.map(({ key, label }) => {
    const barWidth = Math.max(Number(results.percentages[key]) || 0, 2);
    return `<tr>
      <td style="padding:10px 0 4px 0;font-family:${FONT_TEXT};font-size:14px;color:${COLOR.ink};"><strong>${esc(label)}</strong></td>
      <td align="right" style="padding:10px 0 4px 0;font-family:${FONT_TEXT};font-size:14px;color:${COLOR.ink};">${esc(formatKg(results.breakdown[key]))} kg CO₂e</td>
    </tr>
    <tr><td colspan="2" style="padding:0 0 6px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.navy100};border-radius:6px;">
        <tr>
          <td width="${barWidth}%" height="10" style="background:${esc(results.barColors[key])};border-radius:6px;font-size:0;line-height:0;">&nbsp;</td>
          <td style="font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
    </td></tr>`;
  }).join('');
}

function renderParagraphs(paragraphs) {
  return paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px 0;font-family:${FONT_TEXT};font-size:15px;line-height:1.6;color:${COLOR.ink};">${esc(paragraph)}</p>`
    )
    .join('');
}

function renderRecommendations(recommendations) {
  const items = recommendations.map((tip) => `<li style="margin:0 0 8px 0;">${esc(tip)}</li>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background:${COLOR.navy50};border-left:4px solid ${COLOR.gold400};border-radius:6px;">
    <tr><td style="padding:16px 20px;">
      <div style="font-family:${FONT_DISPLAY};font-size:16px;font-weight:bold;color:${COLOR.navy900};margin-bottom:8px;">Recomendaciones de acción</div>
      <ul style="margin:0;padding-left:20px;font-family:${FONT_TEXT};font-size:14px;line-height:1.55;color:${COLOR.ink};">${items}</ul>
    </td></tr>
  </table>`;
}

// lema universitario, nombre y avisos.
function renderFooter() {
  return `<tr><td height="4" style="background:${COLOR.sun500};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="background:${COLOR.navy950};padding:22px 28px;" align="center">
    <div style="font-family:${FONT_DISPLAY};font-size:13px;font-weight:bold;letter-spacing:5px;text-transform:uppercase;color:${COLOR.gold400};">Sursum Versus</div>
    <div style="font-family:${FONT_TEXT};font-size:12px;color:${COLOR.navy100};margin-top:8px;">Universidad Autónoma de Sinaloa · Bienestar Universitario</div>
    <p style="margin:14px 0 0 0;font-family:${FONT_TEXT};font-size:11px;line-height:1.5;color:#9fb0d3;">
      Este resultado es una estimación orientativa basada en tus respuestas. Recibes este mensaje porque solicitaste
      tus resultados en la Calculadora de Huella de Carbono UAS. Este es un correo automático.
    </p>
  </td></tr>`;
}

/**
 * Construye el correo de resultados.
 *
 * @param {{name: string, results: ReturnType<import('@huella/shared').calculateFootprint>}} params
 * @returns {{subject: string, html: string, text: string}}
 */
export function buildResultsEmail({ name, results }) {
  const greeting = buildGreeting(name);
  const subject = `Tus resultados: ${formatKg(results.totalKg)} kg CO₂e al año · Calculadora de Huella de Carbono UAS`;

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:${COLOR.paper};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Tu huella estimada es de ${esc(formatKg(results.totalKg))} kg CO₂e al año (${esc(results.level)}).
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.paper};padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${COLOR.white};border-radius:14px;overflow:hidden;border:1px solid ${COLOR.navy100};">
          <tr><td>${renderColorBand(6)}</td></tr>
          ${renderHeader()}
          ${renderHero(results.title)}

          <tr><td style="padding:28px;">
            <p style="margin:0 0 14px 0;font-family:${FONT_TEXT};font-size:16px;color:${COLOR.ink};">${esc(greeting)}</p>
            <p style="margin:0 0 18px 0;font-family:${FONT_TEXT};font-size:15px;line-height:1.6;color:${COLOR.ink};">
              Gracias por calcular tu huella de carbono. Te compartimos el resumen de tus resultados:
            </p>

            ${renderTotalCard(results)}

            <h2 style="margin:28px 0 6px 0;font-family:${FONT_DISPLAY};font-size:18px;color:${COLOR.navy900};">Emisiones por categoría</h2>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${renderCategoryRows(results)}</table>

            <div style="margin-top:24px;">${renderParagraphs(results.description)}</div>

            ${renderRecommendations(results.recommendations)}

            <p style="margin:24px 0 0 0;font-family:${FONT_TEXT};font-size:15px;line-height:1.6;color:${COLOR.ink};">
              Cada pequeño cambio cuenta. ¡Gracias por sumarte al cuidado del planeta!
            </p>
            <p style="margin:14px 0 0 0;font-family:${FONT_DISPLAY};font-size:15px;line-height:1.5;color:${COLOR.navy900};">
              <strong>Universidad Autónoma de Sinaloa</strong><br>
              <span style="font-family:${FONT_TEXT};font-size:13px;color:${COLOR.muted};">Bienestar Universitario</span>
            </p>
          </td></tr>

          ${renderFooter()}
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    'UNIVERSIDAD AUTÓNOMA DE SINALOA · BIENESTAR UNIVERSITARIO',
    'Calculadora de Huella de Carbono',
    '',
    greeting,
    '',
    `RESULTADO: ${results.title}`,
    `Tu huella estimada: ${formatKg(results.totalKg)} kg CO2e al año (${results.level}).`,
    results.treesText,
    '',
    'Emisiones por categoría:',
    ...CATEGORIES.map(({ key, label }) => `- ${label}: ${formatKg(results.breakdown[key])} kg CO2e`),
    '',
    ...results.description.flatMap((paragraph) => [paragraph, '']),
    'Recomendaciones de acción:',
    ...results.recommendations.map((tip) => `- ${tip}`),
    '',
    'Cada pequeño cambio cuenta. ¡Gracias por sumarte al cuidado del planeta!',
    '',
    'Bienestar Universitario',
    'Universidad Autónoma de Sinaloa — Sursum Versus',
    '',
    'Este resultado es una estimación orientativa basada en tus respuestas.',
    'Este es un correo automático.',
  ].join('\n');

  return { subject, html, text };
}
