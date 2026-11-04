import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { textoAFechaLegible } from '../../utils/fechas.js';
import { ETIQUETA_NIVEL, ETIQUETA_SI_NO } from './columnas.js';

const RUTA_FUENTE = fileURLToPath(new URL('../../../assets/fonts/DejaVuSans.ttf', import.meta.url));
const RUTA_FUENTE_NEGRITA = fileURLToPath(new URL('../../../assets/fonts/DejaVuSans-Bold.ttf', import.meta.url));
const RUTA_LOGO_UAS = fileURLToPath(new URL('../../../assets/email/logo-uas.png', import.meta.url));
const RUTA_LOGO_BIENESTAR = fileURLToPath(new URL('../../../assets/email/logo-bienestar.png', import.meta.url));

const FUENTE = 'Sans';
const FUENTE_NEGRITA = 'Sans-Bold';

// Paleta institucional (la misma de la calculadora).
const COLOR = Object.freeze({
  navy950: '#071A3B',
  navy900: '#0A2352',
  navy800: '#0F2F6B',
  navy100: '#E3EAF7',
  navy50: '#F1F5FC',
  gold400: '#F4C430',
  sun500: '#EF7D17',
  sun600: '#D96A08',
  tinta: '#17223B',
  tenue: '#5B6784',
  blanco: '#FFFFFF',
});

// Fondo y texto de la etiqueta de nivel.
const COLOR_NIVEL = Object.freeze({
  bajo: { fondo: '#D6F0E0', texto: '#14683A' },
  medio: { fondo: '#FDF1C4', texto: '#7A5B00' },
  alto: { fondo: '#FCE0C7', texto: '#9A4A05' },
  muy_alto: { fondo: '#F8D3CD', texto: '#8F1A0A' },
});
const COLOR_BARRA_NIVEL = Object.freeze({ bajo: '#1E8A4C', medio: '#F4C430', alto: '#EF7D17', muy_alto: '#C4250F' });

const MARGEN = 28;
const MARGEN_INFERIOR = 40;
const PADDING_CELDA = 4;
const ALTO_ENCABEZADO_TABLA = 28;
const ALTO_PIE = 24;

const formatoKg = (valor) => Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoEntero = (valor) => Number(valor).toLocaleString('es-MX', { maximumFractionDigits: 0 });

// Columnas del PDF. `flex` reparte el ancho que sobra de la hoja entre las columnas de texto largo.
const COLUMNAS_PDF = Object.freeze([
  { titulo: 'ID', ancho: 34, alinear: 'center', valor: (fila) => String(fila.id) },
  {
    titulo: 'Fecha',
    ancho: 64,
    alinear: 'left',
    valor: (fila) => textoAFechaLegible(fila.creadoEn).slice(0, 10),
    secundario: (fila) => textoAFechaLegible(fila.creadoEn).slice(11),
  },
  { titulo: 'Persona', ancho: 168, flex: 1, alinear: 'left', valor: (fila) => `${fila.nombre} ${fila.apellidos}`, secundario: (fila) => fila.correo },
  { titulo: 'Escuela o institución', ancho: 170, flex: 1, alinear: 'left', valor: (fila) => fila.escuela ?? '', secundario: (fila) => fila.unidad ?? '' },
  { titulo: 'Hogar\n(kg CO₂e)', ancho: 54, alinear: 'right', valor: (fila) => formatoKg(fila.hogarKg) },
  { titulo: 'Transporte\n(kg CO₂e)', ancho: 68, alinear: 'right', valor: (fila) => formatoKg(fila.transporteKg) },
  { titulo: 'Consumo\n(kg CO₂e)', ancho: 62, alinear: 'right', valor: (fila) => formatoKg(fila.consumoKg) },
  { titulo: 'Total\n(kg CO₂e)', ancho: 62, alinear: 'right', negrita: true, valor: (fila) => formatoKg(fila.totalKg) },
  { titulo: 'Nivel', ancho: 58, alinear: 'center', nivel: true, valor: (fila) => ETIQUETA_NIVEL[fila.nivel] ?? '' },
  { titulo: 'Correo', ancho: 48, alinear: 'center', valor: (fila) => ETIQUETA_SI_NO[fila.correoEnviado] ?? '' },
]);

// Quita caracteres de control que podrían romper el texto del PDF.
// eslint-disable-next-line no-control-regex
const limpiar = (texto) => String(texto ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, ' ');

// Reparte el ancho útil de la hoja entre las columnas.
function calcularColumnas(anchoUtil) {
  const fijo = COLUMNAS_PDF.reduce((suma, columna) => suma + columna.ancho, 0);
  const sobrante = anchoUtil - fijo;
  const pesoTotal = COLUMNAS_PDF.reduce((suma, columna) => suma + (columna.flex ?? 0), 0);
  let x = MARGEN;
  return COLUMNAS_PDF.map((columna) => {
    let ancho = columna.ancho;
    if (columna.flex) {
      ancho += (sobrante * columna.flex) / pesoTotal;
    }
    const posicion = { ...columna, x, ancho };
    x += ancho;
    return posicion;
  });
}

function dibujarFranja(doc) {
  const ancho = doc.page.width;
  doc.rect(0, 0, ancho * 0.45, 6).fill(COLOR.navy900);
  doc.rect(ancho * 0.45, 0, ancho * 0.3, 6).fill(COLOR.gold400);
  doc.rect(ancho * 0.75, 0, ancho * 0.25, 6).fill(COLOR.sun500);
}

/**
 * Encabezado de cada página. La primera lleva logos grandes y título; las demás, una versión compacta para dejar
 * más espacio a la tabla. Devuelve la posición vertical donde puede empezar el contenido.
 */
function dibujarEncabezado(doc, { compacto, generadoEn }) {
  dibujarFranja(doc);
  let altoLogo = 42;
  if (compacto) {
    altoLogo = 26;
  }
  const y = 16;
  doc.image(RUTA_LOGO_BIENESTAR, MARGEN, y, { height: altoLogo });
  doc.image(RUTA_LOGO_UAS, MARGEN + altoLogo * 1.18 + 8, y, { height: altoLogo });

  const xTexto = MARGEN + altoLogo * 1.18 + altoLogo * 0.78 + 22;
  doc.font(FUENTE_NEGRITA).fontSize(7).fillColor(COLOR.sun600);
  doc.text('UNIVERSIDAD AUTÓNOMA DE SINALOA', xTexto, y + 2, { lineBreak: false, characterSpacing: 1 });
  doc.font(FUENTE_NEGRITA).fillColor(COLOR.navy900);
  if (compacto) {
    doc.fontSize(11).text('Participaciones · Calculadora de Huella de Carbono', xTexto, y + 13, { lineBreak: false });
  } else {
    doc.fontSize(17).text('Reporte de participaciones', xTexto, y + 13, { lineBreak: false });
    doc.font(FUENTE).fontSize(8).fillColor(COLOR.tenue);
    doc.text('Calculadora de Huella de Carbono · Bienestar Universitario', xTexto, y + 35, { lineBreak: false });
  }

  doc.font(FUENTE).fontSize(7.5).fillColor(COLOR.tenue);
  const textoFecha = `Generado el ${generadoEn}`;
  doc.text(textoFecha, doc.page.width - MARGEN - doc.widthOfString(textoFecha), y + 3, { lineBreak: false });

  const yLinea = y + altoLogo + 8;
  doc.moveTo(MARGEN, yLinea).lineTo(doc.page.width - MARGEN, yLinea).lineWidth(0.75).strokeColor(COLOR.navy100).stroke();
  return yLinea + 10;
}

// Tarjetas con los totales del periodo y la barra de niveles. Devuelve la posición vertical siguiente.
function dibujarResumen(doc, y, resumen) {
  const anchoUtil = doc.page.width - MARGEN * 2;
  const separacion = 8;
  const tarjetas = [
    { etiqueta: 'PARTICIPACIONES', valor: formatoEntero(resumen.totales.participaciones) },
    { etiqueta: 'HUELLA PROMEDIO', valor: `${formatoKg(resumen.totales.promedioTotal)} kg` },
    { etiqueta: 'MÍNIMO · MÁXIMO', valor: `${formatoEntero(resumen.totales.minimo)} · ${formatoEntero(resumen.totales.maximo)} kg` },
    { etiqueta: 'CORREOS ENVIADOS', valor: formatoEntero(resumen.totales.correosEnviados) },
    { etiqueta: 'CORREOS SIN ENVIAR', valor: formatoEntero(resumen.totales.participaciones - resumen.totales.correosEnviados) },
  ];
  const ancho = (anchoUtil - separacion * (tarjetas.length - 1)) / tarjetas.length;
  const alto = 44;

  tarjetas.forEach((tarjeta, indice) => {
    const x = MARGEN + indice * (ancho + separacion);
    doc.roundedRect(x, y, ancho, alto, 6).fill(COLOR.navy50);
    doc.rect(x, y + 6, 3, alto - 12).fill(COLOR.gold400);
    doc.font(FUENTE_NEGRITA).fontSize(6.5).fillColor(COLOR.tenue);
    doc.text(tarjeta.etiqueta, x + 12, y + 9, { lineBreak: false, characterSpacing: 0.6 });
    doc.font(FUENTE_NEGRITA).fontSize(13).fillColor(COLOR.navy900);
    doc.text(tarjeta.valor, x + 12, y + 22, { lineBreak: false, width: ancho - 16 });
  });

  // Barra de niveles: cada tramo mide lo que representa ese nivel.
  const yBarra = y + alto + 10;
  const totalNiveles = resumen.niveles.reduce((suma, item) => suma + item.total, 0);
  doc.font(FUENTE_NEGRITA).fontSize(7).fillColor(COLOR.navy800);
  doc.text('NIVEL DE IMPACTO', MARGEN, yBarra, { lineBreak: false, characterSpacing: 0.6 });
  const yTramo = yBarra + 11;
  if (totalNiveles > 0) {
    let x = MARGEN;
    for (const item of resumen.niveles) {
      const anchoTramo = (item.total / totalNiveles) * anchoUtil;
      if (anchoTramo > 0) {
        doc.rect(x, yTramo, anchoTramo, 8).fill(COLOR_BARRA_NIVEL[item.nivel]);
        x += anchoTramo;
      }
    }
  } else {
    doc.rect(MARGEN, yTramo, anchoUtil, 8).fill(COLOR.navy100);
  }
  let xLeyenda = MARGEN;
  doc.font(FUENTE).fontSize(7.5);
  for (const item of resumen.niveles) {
    doc.circle(xLeyenda + 3, yTramo + 18, 3).fill(COLOR_BARRA_NIVEL[item.nivel]);
    const texto = `${ETIQUETA_NIVEL[item.nivel]}: ${formatoEntero(item.total)}`;
    doc.fillColor(COLOR.tinta).text(texto, xLeyenda + 10, yTramo + 14, { lineBreak: false });
    xLeyenda += 10 + doc.widthOfString(texto) + 18;
  }
  return yTramo + 32;
}

// Línea con los filtros aplicados y avisos (como "mostrando solo las primeras N filas").
function dibujarNotas(doc, y, { filtrosTexto, truncado, limite }) {
  const anchoUtil = doc.page.width - MARGEN * 2;
  let texto = 'Filtros: ninguno (todas las participaciones)';
  if (filtrosTexto.length > 0) {
    texto = `Filtros: ${filtrosTexto.join(' · ')}`;
  }
  doc.font(FUENTE).fontSize(8).fillColor(COLOR.tenue);
  const alto = doc.heightOfString(limpiar(texto), { width: anchoUtil });
  doc.text(limpiar(texto), MARGEN, y, { width: anchoUtil });
  let siguiente = y + alto + 6;

  if (truncado) {
    const aviso = `Aviso: el reporte incluye solo las primeras ${formatoEntero(limite)} participaciones. Usa filtros o la exportación a Excel para obtener todas.`;
    const altoAviso = doc.heightOfString(aviso, { width: anchoUtil - 16 }) + 10;
    doc.roundedRect(MARGEN, siguiente, anchoUtil, altoAviso, 4).fill('#FDF1C4');
    doc.font(FUENTE_NEGRITA).fontSize(8).fillColor('#7A5B00');
    doc.text(aviso, MARGEN + 8, siguiente + 5, { width: anchoUtil - 16 });
    siguiente += altoAviso + 6;
  }
  return siguiente + 2;
}

function dibujarEncabezadoTabla(doc, columnas, y) {
  const anchoUtil = doc.page.width - MARGEN * 2;
  doc.rect(MARGEN, y, anchoUtil, ALTO_ENCABEZADO_TABLA).fill(COLOR.navy900);
  doc.rect(MARGEN, y + ALTO_ENCABEZADO_TABLA - 2, anchoUtil, 2).fill(COLOR.gold400);
  doc.font(FUENTE_NEGRITA).fontSize(7.5).fillColor(COLOR.blanco);
  for (const columna of columnas) {
    const lineas = columna.titulo.split('\n').length;
    const desplazamiento = (ALTO_ENCABEZADO_TABLA - 2 - lineas * 9) / 2;
    doc.text(columna.titulo, columna.x + PADDING_CELDA, y + desplazamiento, {
      width: columna.ancho - PADDING_CELDA * 2,
      align: columna.alinear,
      lineGap: 0,
    });
  }
  return y + ALTO_ENCABEZADO_TABLA;
}

// Alto que necesita una fila: el de su celda con más líneas.
function medirFila(doc, columnas, fila) {
  let maximo = 0;
  for (const columna of columnas) {
    const anchoTexto = columna.ancho - PADDING_CELDA * 2;
    let alto = 12;
    if (!columna.nivel) {
      doc.font(FUENTE).fontSize(8);
      alto = doc.heightOfString(limpiar(columna.valor(fila)) || ' ', { width: anchoTexto });
      if (columna.secundario) {
        doc.font(FUENTE).fontSize(6.5);
        alto += doc.heightOfString(limpiar(columna.secundario(fila)) || ' ', { width: anchoTexto }) + 1;
      }
    }
    maximo = Math.max(maximo, alto);
  }
  return Math.max(maximo + 8, 20);
}

function dibujarFila(doc, columnas, fila, y, alto, franja) {
  const anchoUtil = doc.page.width - MARGEN * 2;
  if (franja) {
    doc.rect(MARGEN, y, anchoUtil, alto).fill(COLOR.navy50);
  }
  doc.moveTo(MARGEN, y + alto).lineTo(MARGEN + anchoUtil, y + alto).lineWidth(0.4).strokeColor(COLOR.navy100).stroke();

  for (const columna of columnas) {
    const anchoTexto = columna.ancho - PADDING_CELDA * 2;
    const x = columna.x + PADDING_CELDA;
    if (columna.nivel) {
      const colores = COLOR_NIVEL[fila.nivel] ?? COLOR_NIVEL.bajo;
      const etiqueta = columna.valor(fila);
      doc.roundedRect(x, y + 3, anchoTexto, 12, 6).fill(colores.fondo);
      doc.font(FUENTE_NEGRITA).fontSize(7).fillColor(colores.texto);
      doc.text(etiqueta, x, y + 6, { width: anchoTexto, align: 'center', lineBreak: false });
      continue;
    }
    let fuente = FUENTE;
    if (columna.negrita) {
      fuente = FUENTE_NEGRITA;
    }
    doc.font(fuente).fontSize(8).fillColor(COLOR.tinta);
    const texto = limpiar(columna.valor(fila));
    doc.text(texto, x, y + 4, { width: anchoTexto, align: columna.alinear });
    if (columna.secundario) {
      const altoPrincipal = doc.heightOfString(texto || ' ', { width: anchoTexto });
      doc.font(FUENTE).fontSize(6.5).fillColor(COLOR.tenue);
      doc.text(limpiar(columna.secundario(fila)), x, y + 5 + altoPrincipal, { width: anchoTexto, align: columna.alinear });
    }
  }
}

// Pie de todas las páginas (se dibuja al final, cuando ya se sabe cuántas hay).
function dibujarPies(doc, { generadoPor }) {
  const { start, count } = doc.bufferedPageRange();
  for (let indice = 0; indice < count; indice += 1) {
    doc.switchToPage(start + indice);
    const y = doc.page.height - ALTO_PIE;
    doc.moveTo(MARGEN, y - 6).lineTo(doc.page.width - MARGEN, y - 6).lineWidth(0.5).strokeColor(COLOR.navy100).stroke();
    doc.font(FUENTE).fontSize(7).fillColor(COLOR.tenue);
    doc.text(`Datos personales protegidos · Uso interno · Exportado por ${limpiar(generadoPor)}`, MARGEN, y, { lineBreak: false });
    const numero = `Página ${indice + 1} de ${count}`;
    doc.text(numero, doc.page.width - MARGEN - doc.widthOfString(numero), y, { lineBreak: false });
  }
}

/**
 * Genera el PDF con las participaciones: encabezado institucional, resumen, tabla con encabezado repetido en cada
 * página, filas que no se cortan entre páginas y numeración "Página X de Y".
 *
 * @param {{filas: object[], resumen: object, filtrosTexto: string[], generadoPor: string, generadoEn: string, truncado: boolean, limite: number}} datos
 * @returns {Promise<Buffer>}
 */
export function generarPdf(datos) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: MARGEN, left: MARGEN, right: MARGEN, bottom: MARGEN_INFERIOR },
    bufferPages: true,
    font: RUTA_FUENTE,
    info: {
      Title: 'Participaciones · Calculadora de Huella de Carbono',
      Author: 'Calculadora de Huella de Carbono · UAS',
      Subject: 'Reporte de participaciones',
    },
  });
  doc.registerFont(FUENTE, RUTA_FUENTE);
  doc.registerFont(FUENTE_NEGRITA, RUTA_FUENTE_NEGRITA);

  const partes = [];
  doc.on('data', (parte) => partes.push(parte));
  const terminado = new Promise((resolver, rechazar) => {
    doc.on('end', () => resolver(Buffer.concat(partes)));
    doc.on('error', rechazar);
  });

  const columnas = calcularColumnas(doc.page.width - MARGEN * 2);
  const limiteInferior = doc.page.height - MARGEN_INFERIOR;

  let y = dibujarEncabezado(doc, { compacto: false, generadoEn: datos.generadoEn });
  y = dibujarResumen(doc, y, datos.resumen);
  y = dibujarNotas(doc, y, datos);

  if (datos.filas.length === 0) {
    doc.font(FUENTE_NEGRITA).fontSize(11).fillColor(COLOR.tenue);
    doc.text('No hay participaciones con estos filtros.', MARGEN, y + 20, { width: doc.page.width - MARGEN * 2, align: 'center' });
  } else {
    y = dibujarEncabezadoTabla(doc, columnas, y);
    datos.filas.forEach((fila, indice) => {
      const alto = medirFila(doc, columnas, fila);
      if (y + alto > limiteInferior) {
        doc.addPage();
        y = dibujarEncabezado(doc, { compacto: true, generadoEn: datos.generadoEn });
        y = dibujarEncabezadoTabla(doc, columnas, y);
      }
      dibujarFila(doc, columnas, fila, y, alto, indice % 2 === 1);
      y += alto;
    });
  }

  dibujarPies(doc, datos);
  doc.end();
  return terminado;
}
