// Definición única de las columnas de la exportación: la usan el Excel, el CSV y (en parte) el PDF.

export const ETIQUETA_NIVEL = Object.freeze({ bajo: 'Bajo', medio: 'Medio', alto: 'Alto', muy_alto: 'Muy alto' });
export const ETIQUETA_SI_NO = Object.freeze({ 0: 'No', 1: 'Sí' });

/**
 * Cada columna: clave del dato, título, ancho en caracteres (Excel) y tipo de celda.
 * Los anchos están pensados para que NINGÚN valor se vea como "####": una fecha con hora necesita ~19 caracteres.
 */
export const COLUMNAS = Object.freeze([
  { clave: 'id', titulo: 'ID', ancho: 8, tipo: 'entero' },
  { clave: 'creadoEn', titulo: 'Fecha de participación', ancho: 22, tipo: 'fechaHora' },
  { clave: 'nombre', titulo: 'Nombre', ancho: 20, tipo: 'texto' },
  { clave: 'apellidos', titulo: 'Apellidos', ancho: 24, tipo: 'texto' },
  { clave: 'correo', titulo: 'Correo', ancho: 34, tipo: 'texto' },
  { clave: 'telefono', titulo: 'Teléfono', ancho: 16, tipo: 'texto' },
  { clave: 'fechaNacimiento', titulo: 'Fecha de nacimiento', ancho: 20, tipo: 'fecha' },
  { clave: 'edad', titulo: 'Edad', ancho: 8, tipo: 'entero' },
  { clave: 'pais', titulo: 'País', ancho: 18, tipo: 'texto' },
  { clave: 'estado', titulo: 'Estado', ancho: 18, tipo: 'texto' },
  { clave: 'municipio', titulo: 'Municipio', ancho: 22, tipo: 'texto' },
  { clave: 'ciudadProvincia', titulo: 'Ciudad o provincia', ancho: 22, tipo: 'texto' },
  { clave: 'localidad', titulo: 'Localidad', ancho: 24, tipo: 'texto' },
  { clave: 'unidad', titulo: 'Unidad regional', ancho: 26, tipo: 'texto' },
  { clave: 'escuela', titulo: 'Escuela o institución', ancho: 40, tipo: 'texto' },
  { clave: 'hogarKg', titulo: 'Hogar (kg CO₂e)', ancho: 16, tipo: 'kg' },
  { clave: 'transporteKg', titulo: 'Transporte (kg CO₂e)', ancho: 20, tipo: 'kg' },
  { clave: 'consumoKg', titulo: 'Consumo (kg CO₂e)', ancho: 18, tipo: 'kg' },
  { clave: 'totalKg', titulo: 'Total (kg CO₂e)', ancho: 16, tipo: 'kg' },
  { clave: 'nivel', titulo: 'Nivel', ancho: 12, tipo: 'nivel' },
  { clave: 'correoEnviado', titulo: 'Correo enviado', ancho: 15, tipo: 'sino' },
]);

// Texto de un filtro aplicado, para el encabezado de los archivos ("Nivel: Alto").
const ETIQUETAS_FILTRO = Object.freeze({
  busqueda: 'Búsqueda',
  nivel: 'Nivel',
  desde: 'Desde',
  hasta: 'Hasta',
  correoEnviado: 'Correo',
});

/**
 * Lista legible de los filtros con los que se generó el archivo.
 *
 * @param {object} filtros Filtros ya validados.
 * @param {{unidad?: string, escuela?: string}} [nombres] Nombres de unidad y escuela elegidas (si se conocen).
 * @returns {string[]} Cada elemento es "Etiqueta: valor". Vacía si no hay filtros.
 */
export function describirFiltros(filtros, nombres = {}) {
  const lineas = [];
  for (const [clave, etiqueta] of Object.entries(ETIQUETAS_FILTRO)) {
    const valor = filtros[clave];
    if (valor === undefined || valor === '') {
      continue;
    }
    if (clave === 'nivel') {
      lineas.push(`${etiqueta}: ${ETIQUETA_NIVEL[valor] ?? valor}`);
    } else if (clave === 'correoEnviado') {
      lineas.push(`${etiqueta}: ${ETIQUETA_SI_NO[valor]}`);
    } else {
      lineas.push(`${etiqueta}: ${valor}`);
    }
  }
  if (filtros.idUnidad === 'otros') {
    lineas.push('Unidad regional: Otros (fuera de la UAS)');
  } else if (filtros.idUnidad) {
    lineas.push(`Unidad regional: ${nombres.unidad ?? `#${filtros.idUnidad}`}`);
  }
  if (filtros.idEscuela) {
    lineas.push(`Escuela o facultad: ${nombres.escuela ?? `#${filtros.idEscuela}`}`);
  }
  return lineas;
}
