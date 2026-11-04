import ExcelJS from 'exceljs';
import { textoAFechaExcel } from '../../utils/fechas.js';
import { COLUMNAS, ETIQUETA_NIVEL, ETIQUETA_SI_NO } from './columnas.js';

// Paleta institucional (la misma de la calculadora).
const COLOR = Object.freeze({
  navy900: 'FF0A2352',
  navy800: 'FF0F2F6B',
  navy100: 'FFE3EAF7',
  navy50: 'FFF1F5FC',
  gold400: 'FFF4C430',
  sun500: 'FFEF7D17',
  blanco: 'FFFFFFFF',
  tinta: 'FF17223B',
});

// Relleno y texto de la celda de nivel (colores suaves para que se lea bien impreso).
const COLOR_NIVEL = Object.freeze({
  bajo: { fondo: 'FFD6F0E0', texto: 'FF14683A' },
  medio: { fondo: 'FFFDF1C4', texto: 'FF7A5B00' },
  alto: { fondo: 'FFFCE0C7', texto: 'FF9A4A05' },
  muy_alto: { fondo: 'FFF8D3CD', texto: 'FF8F1A0A' },
});

const FORMATO = Object.freeze({
  fechaHora: 'dd/mm/yyyy hh:mm',
  fecha: 'dd/mm/yyyy',
  kg: '#,##0.00',
  entero: '0',
  texto: '@',
});

const BORDE_FINO = Object.freeze({ style: 'thin', color: { argb: COLOR.navy100 } });
const BORDES = Object.freeze({ top: BORDE_FINO, left: BORDE_FINO, bottom: BORDE_FINO, right: BORDE_FINO });

const FILA_TITULO = 1;
const FILA_SUBTITULO = 2;
const FILA_FILTROS = 3;
const FILA_ENCABEZADO = 5;

// Valor de una celda según el tipo de columna. Las fechas son fechas reales (no texto) para que Excel pueda ordenarlas y filtrarlas.
function valorDeCelda(columna, fila) {
  const valor = fila[columna.clave];
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }
  if (columna.tipo === 'fechaHora' || columna.tipo === 'fecha') {
    return textoAFechaExcel(valor);
  }
  if (columna.tipo === 'kg' || columna.tipo === 'entero') {
    return Number(valor);
  }
  if (columna.tipo === 'nivel') {
    return ETIQUETA_NIVEL[valor] ?? String(valor);
  }
  if (columna.tipo === 'sino') {
    return ETIQUETA_SI_NO[valor] ?? String(valor);
  }
  return String(valor);
}

function alineacionDe(columna) {
  if (columna.tipo === 'kg') {
    return { vertical: 'middle', horizontal: 'right' };
  }
  if (columna.tipo === 'fechaHora' || columna.tipo === 'fecha' || columna.tipo === 'entero' || columna.tipo === 'nivel' || columna.tipo === 'sino') {
    return { vertical: 'middle', horizontal: 'center' };
  }
  return { vertical: 'middle', horizontal: 'left' };
}

function agregarHojaParticipaciones(libro, { filas, filtrosTexto, generadoPor, generadoEn, truncado, limite }) {
  const hoja = libro.addWorksheet('Participaciones', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: FILA_ENCABEZADO, showGridLines: false }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // Los anchos se fijan SIEMPRE: sin ellos Excel usa el ancho por defecto y las fechas se ven como "########".
  hoja.columns = COLUMNAS.map((columna) => ({ key: columna.clave, width: columna.ancho }));
  const ultimaColumna = COLUMNAS.length;

  hoja.mergeCells(FILA_TITULO, 1, FILA_TITULO, ultimaColumna);
  const titulo = hoja.getCell(FILA_TITULO, 1);
  titulo.value = 'Participaciones · Calculadora de Huella de Carbono';
  titulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR.blanco } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navy900 } };
  titulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  hoja.getRow(FILA_TITULO).height = 30;

  hoja.mergeCells(FILA_SUBTITULO, 1, FILA_SUBTITULO, ultimaColumna);
  const subtitulo = hoja.getCell(FILA_SUBTITULO, 1);
  subtitulo.value = `Universidad Autónoma de Sinaloa · Bienestar Universitario · Generado el ${generadoEn} por ${generadoPor}`;
  subtitulo.font = { name: 'Calibri', size: 10, color: { argb: COLOR.navy100 } };
  subtitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navy800 } };
  subtitulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  hoja.getRow(FILA_SUBTITULO).height = 20;

  hoja.mergeCells(FILA_FILTROS, 1, FILA_FILTROS, ultimaColumna);
  const celdaFiltros = hoja.getCell(FILA_FILTROS, 1);
  let textoFiltros = 'Filtros: ninguno (todas las participaciones)';
  if (filtrosTexto.length > 0) {
    textoFiltros = `Filtros: ${filtrosTexto.join(' · ')}`;
  }
  if (truncado) {
    textoFiltros += `  ·  AVISO: el archivo incluye solo las primeras ${limite.toLocaleString('es-MX')} filas; usa filtros para acotar.`;
  }
  celdaFiltros.value = textoFiltros;
  celdaFiltros.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR.tinta } };
  celdaFiltros.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
  hoja.getRow(FILA_FILTROS).height = 22;

  const encabezado = hoja.getRow(FILA_ENCABEZADO);
  COLUMNAS.forEach((columna, indice) => {
    const celda = encabezado.getCell(indice + 1);
    celda.value = columna.titulo;
    celda.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR.blanco } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navy900 } };
    celda.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    celda.border = { ...BORDES, bottom: { style: 'medium', color: { argb: COLOR.gold400 } } };
  });
  encabezado.height = 32;

  filas.forEach((fila, indice) => {
    const excelFila = hoja.getRow(FILA_ENCABEZADO + 1 + indice);
    const franja = indice % 2 === 1;
    COLUMNAS.forEach((columna, posicion) => {
      const celda = excelFila.getCell(posicion + 1);
      celda.value = valorDeCelda(columna, fila);
      celda.numFmt = FORMATO[columna.tipo] ?? FORMATO.texto;
      celda.alignment = alineacionDe(columna);
      celda.border = BORDES;
      celda.font = { name: 'Calibri', size: 10, color: { argb: COLOR.tinta } };
      if (franja) {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navy50 } };
      }
      if (columna.tipo === 'nivel' && COLOR_NIVEL[fila.nivel]) {
        const colores = COLOR_NIVEL[fila.nivel];
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colores.fondo } };
        celda.font = { name: 'Calibri', size: 10, bold: true, color: { argb: colores.texto } };
      }
      if (columna.clave === 'totalKg') {
        celda.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR.navy900 } };
      }
    });
    excelFila.height = 18;
  });

  const ultimaFila = FILA_ENCABEZADO + Math.max(filas.length, 1);
  hoja.autoFilter = { from: { row: FILA_ENCABEZADO, column: 1 }, to: { row: ultimaFila, column: ultimaColumna } };
  hoja.pageSetup.printTitlesRow = `${FILA_ENCABEZADO}:${FILA_ENCABEZADO}`;
  hoja.headerFooter.oddFooter = '&LCalculadora de Huella de Carbono · UAS&RPágina &P de &N';
}

function agregarHojaResumen(libro, { resumen, filtrosTexto, generadoPor, generadoEn }) {
  const hoja = libro.addWorksheet('Resumen', { views: [{ showGridLines: false }] });
  hoja.columns = [
    { key: 'concepto', width: 34 },
    { key: 'valor', width: 22 },
  ];

  hoja.mergeCells('A1:B1');
  const titulo = hoja.getCell('A1');
  titulo.value = 'Resumen de la exportación';
  titulo.font = { name: 'Calibri', size: 15, bold: true, color: { argb: COLOR.blanco } };
  titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navy900 } };
  titulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  hoja.getRow(1).height = 28;

  let fila = 3;
  const bloque = (nombre, lineas) => {
    hoja.mergeCells(fila, 1, fila, 2);
    const cabecera = hoja.getCell(fila, 1);
    cabecera.value = nombre;
    cabecera.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLOR.navy900 } };
    cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR.navy100 } };
    cabecera.border = { bottom: { style: 'medium', color: { argb: COLOR.gold400 } } };
    fila += 1;
    for (const [concepto, valor, formato] of lineas) {
      const celdaConcepto = hoja.getCell(fila, 1);
      const celdaValor = hoja.getCell(fila, 2);
      celdaConcepto.value = concepto;
      celdaValor.value = valor;
      if (formato) {
        celdaValor.numFmt = formato;
      }
      celdaConcepto.font = { name: 'Calibri', size: 10, color: { argb: COLOR.tinta } };
      celdaValor.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR.navy900 } };
      celdaValor.alignment = { horizontal: 'right' };
      celdaConcepto.border = BORDES;
      celdaValor.border = BORDES;
      fila += 1;
    }
    fila += 1;
  };

  bloque('Generación', [
    ['Generado el', generadoEn],
    ['Generado por', generadoPor],
    ['Filtros aplicados', filtrosTexto.join(' · ') || 'Ninguno'],
  ]);
  bloque('Totales (según los filtros)', [
    ['Participaciones', resumen.totales.participaciones, '#,##0'],
    ['Huella promedio (kg CO₂e)', resumen.totales.promedioTotal, '#,##0.00'],
    ['Huella mínima (kg CO₂e)', resumen.totales.minimo, '#,##0.00'],
    ['Huella máxima (kg CO₂e)', resumen.totales.maximo, '#,##0.00'],
    ['Promedio hogar (kg CO₂e)', resumen.totales.promedioHogar, '#,##0.00'],
    ['Promedio transporte (kg CO₂e)', resumen.totales.promedioTransporte, '#,##0.00'],
    ['Promedio consumo (kg CO₂e)', resumen.totales.promedioConsumo, '#,##0.00'],
  ]);
  bloque(
    'Por nivel de impacto',
    resumen.niveles.map((item) => [ETIQUETA_NIVEL[item.nivel], item.total, '#,##0'])
  );
  bloque('Correo', [
    ['Correos enviados', resumen.totales.correosEnviados, '#,##0'],
    ['Sin enviar', resumen.totales.participaciones - resumen.totales.correosEnviados, '#,##0'],
  ]);
}

/**
 * Genera el archivo de Excel (.xlsx) con las participaciones.
 * A diferencia de un CSV, el .xlsx guarda el ancho de cada columna y el formato de cada celda: las fechas son fechas
 * reales con formato dd/mm/aaaa y nunca aparecen como "####".
 *
 * @param {{filas: object[], resumen: object, filtrosTexto: string[], generadoPor: string, generadoEn: string, truncado: boolean, limite: number}} datos
 * @returns {Promise<Buffer>}
 */
export async function generarExcel(datos) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Calculadora de Huella de Carbono · UAS';
  libro.company = 'Universidad Autónoma de Sinaloa · Bienestar Universitario';
  libro.created = new Date();
  libro.title = 'Participaciones';

  agregarHojaParticipaciones(libro, datos);
  agregarHojaResumen(libro, datos);

  return Buffer.from(await libro.xlsx.writeBuffer());
}
