import { badRequest } from '../utils/errors.js';
import { findPasswordProblem, PASSWORD_MAX_LENGTH } from '../utils/passwords.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NIVELES = ['bajo', 'medio', 'alto', 'muy_alto'];
const ROLES = ['superadmin', 'admin'];
const ESTADOS_ENVIO = ['enviado', 'fallido'];
const TIPOS_ERROR = ['cuota', 'credenciales', 'destinatario', 'temporal'];
const ORDENES = ['fecha', 'nombre', 'total', 'hogar', 'transporte', 'consumo'];
const FORMATOS_EXPORTACION = ['xlsx', 'pdf', 'csv'];
const MODOS_REENVIO = ['ids', 'pendientes'];
const MAX_IDS_REENVIO = 500;

const DEFAULT_POR_PAGINA = 25;
const MAX_POR_PAGINA = 100;
const MAX_ID = 4_294_967_295;
const MAX_BUSQUEDA = 100;
const MAX_CORREO = 254;
const MAX_NOMBRE = 100;
const MAX_CONTRASENA_APP = 64;

function fallar(errors) {
  throw badRequest('VALIDATION_ERROR', 'Revisa los datos enviados.', errors);
}

// El cuerpo debe ser un objeto JSON (no una lista, texto ni vacío).
function cuerpoObjeto(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    fallar([{ field: 'body', message: 'El cuerpo de la petición no es válido.' }]);
  }
  return body;
}

function texto(valor, { campo, etiqueta, max, obligatorio = true }, errors) {
  if (valor === undefined || valor === null || valor === '') {
    if (obligatorio) {
      errors.push({ field: campo, message: `${etiqueta} es obligatorio.` });
    }
    return '';
  }
  if (typeof valor !== 'string') {
    errors.push({ field: campo, message: `${etiqueta} no es válido.` });
    return '';
  }
  const limpio = valor.trim();
  if (limpio.length === 0 && obligatorio) {
    errors.push({ field: campo, message: `${etiqueta} es obligatorio.` });
  }
  if (limpio.length > max) {
    errors.push({ field: campo, message: `${etiqueta} no puede pasar de ${max} caracteres.` });
  }
  return limpio;
}

function correo(valor, errors, campo = 'correo') {
  const limpio = texto(valor, { campo, etiqueta: 'El correo', max: MAX_CORREO }, errors).toLowerCase();
  if (limpio && !EMAIL.test(limpio)) {
    errors.push({ field: campo, message: 'El correo no tiene un formato válido.' });
  }
  return limpio;
}

function entero(valor, { campo, etiqueta, min, max }, errors) {
  const numero = Number(valor);
  if (typeof valor === 'boolean' || valor === '' || valor === null || !Number.isInteger(numero) || numero < min || numero > max) {
    errors.push({ field: campo, message: `${etiqueta} debe ser un número entero entre ${min} y ${max}.` });
    return undefined;
  }
  return numero;
}

function opcion(valor, permitidos, { campo, etiqueta }, errors) {
  if (!permitidos.includes(valor)) {
    errors.push({ field: campo, message: `${etiqueta} no es válido.` });
  }
  return valor;
}

function esFechaValida(valor) {
  if (!DATE.test(valor)) {
    return false;
  }
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
}

// Lee un parámetro de la URL que debe ser un solo texto (no una lista repetida).
function parametroTexto(query, nombre) {
  const valor = query[nombre];
  if (valor === undefined || valor === '') {
    return undefined;
  }
  return valor;
}

function idDeQuery(query, nombre, errors) {
  const valor = parametroTexto(query, nombre);
  if (valor === undefined) {
    return undefined;
  }
  if (typeof valor !== 'string' || !/^[1-9]\d{0,9}$/.test(valor) || Number(valor) > MAX_ID) {
    errors.push({ field: nombre, message: 'El identificador no es válido.' });
    return undefined;
  }
  return Number(valor);
}

export function validarPaginacion(query) {
  const errors = [];
  let pagina = 1;
  let porPagina = DEFAULT_POR_PAGINA;
  if (parametroTexto(query, 'pagina') !== undefined) {
    pagina = entero(query.pagina, { campo: 'pagina', etiqueta: 'La página', min: 1, max: 1_000_000 }, errors) ?? 1;
  }
  if (parametroTexto(query, 'porPagina') !== undefined) {
    porPagina = entero(query.porPagina, { campo: 'porPagina', etiqueta: 'El tamaño de página', min: 1, max: MAX_POR_PAGINA }, errors) ?? DEFAULT_POR_PAGINA;
  }
  if (errors.length > 0) {
    fallar(errors);
  }
  return { pagina, porPagina };
}

// Filtros del listado, del resumen y de la exportación de participaciones.
export function validarFiltrosParticipaciones(query) {
  const errors = [];
  const filtros = {};

  const busqueda = parametroTexto(query, 'busqueda');
  if (busqueda !== undefined) {
    if (typeof busqueda !== 'string' || busqueda.trim().length > MAX_BUSQUEDA) {
      errors.push({ field: 'busqueda', message: 'La búsqueda no es válida.' });
    } else {
      filtros.busqueda = busqueda.trim();
    }
  }

  const nivel = parametroTexto(query, 'nivel');
  if (nivel !== undefined) {
    filtros.nivel = opcion(nivel, NIVELES, { campo: 'nivel', etiqueta: 'El nivel' }, errors);
  }

  // idUnidad acepta además "otros": personas que no son de la UAS
  if (parametroTexto(query, 'idUnidad') === 'otros') {
    filtros.idUnidad = 'otros';
  } else {
    filtros.idUnidad = idDeQuery(query, 'idUnidad', errors);
  }
  filtros.idEscuela = idDeQuery(query, 'idEscuela', errors);

  for (const campo of ['desde', 'hasta']) {
    const valor = parametroTexto(query, campo);
    if (valor !== undefined) {
      if (typeof valor !== 'string' || !esFechaValida(valor)) {
        errors.push({ field: campo, message: 'La fecha debe tener el formato AAAA-MM-DD.' });
      } else {
        filtros[campo] = valor;
      }
    }
  }
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    errors.push({ field: 'desde', message: 'La fecha inicial no puede ser posterior a la final.' });
  }

  const correoEnviado = parametroTexto(query, 'correoEnviado');
  if (correoEnviado !== undefined) {
    if (correoEnviado !== '0' && correoEnviado !== '1') {
      errors.push({ field: 'correoEnviado', message: 'El estado del correo no es válido.' });
    } else {
      filtros.correoEnviado = Number(correoEnviado);
    }
  }

  if (errors.length > 0) {
    fallar(errors);
  }
  return filtros;
}

export function validarOrden(query) {
  const errors = [];
  let orden = 'fecha';
  let direccion = 'desc';
  if (parametroTexto(query, 'orden') !== undefined) {
    orden = opcion(query.orden, ORDENES, { campo: 'orden', etiqueta: 'El orden' }, errors);
  }
  if (parametroTexto(query, 'direccion') !== undefined) {
    direccion = opcion(query.direccion, ['asc', 'desc'], { campo: 'direccion', etiqueta: 'La dirección' }, errors);
  }
  if (errors.length > 0) {
    fallar(errors);
  }
  return { orden, direccion };
}

// Texto de búsqueda opcional (para la bitácora de envíos y la lista de pendientes).
function busquedaOpcional(query, errors) {
  const busqueda = parametroTexto(query, 'busqueda');
  if (busqueda === undefined) {
    return undefined;
  }
  if (typeof busqueda !== 'string' || busqueda.trim().length > MAX_BUSQUEDA) {
    errors.push({ field: 'busqueda', message: 'La búsqueda no es válida.' });
    return undefined;
  }
  return busqueda.trim();
}

export function validarFiltrosEnvios(query) {
  const errors = [];
  const filtros = {};
  const estado = parametroTexto(query, 'estado');
  if (estado !== undefined) {
    filtros.estado = opcion(estado, ESTADOS_ENVIO, { campo: 'estado', etiqueta: 'El estado' }, errors);
  }
  const tipoError = parametroTexto(query, 'tipoError');
  if (tipoError !== undefined) {
    filtros.tipoError = opcion(tipoError, TIPOS_ERROR, { campo: 'tipoError', etiqueta: 'El tipo de error' }, errors);
  }
  filtros.busqueda = busquedaOpcional(query, errors);
  if (errors.length > 0) {
    fallar(errors);
  }
  return filtros;
}

// Filtros de la lista de participaciones con el correo sin enviar.
export function validarFiltrosPendientes(query) {
  const errors = [];
  const filtros = { busqueda: busquedaOpcional(query, errors) };
  if (errors.length > 0) {
    fallar(errors);
  }
  return filtros;
}

// Formato del archivo exportado; sin indicar nada se entrega Excel.
export function validarFormatoExportacion(query) {
  const formato = parametroTexto(query, 'formato');
  if (formato === undefined) {
    return 'xlsx';
  }
  if (!FORMATOS_EXPORTACION.includes(formato)) {
    fallar([{ field: 'formato', message: 'El formato debe ser xlsx, pdf o csv.' }]);
  }
  return formato;
}

/**
 * Petición de reenvío de correos:
 *   { modo: 'ids', ids: [1, 2, 3], forzar?: boolean }  = esas participaciones
 *   { modo: 'pendientes' }                              = todas las que no tienen correo enviado
 */
export function validarReenvio(body) {
  const datos = cuerpoObjeto(body);
  const errors = [];
  const modo = opcion(datos.modo, MODOS_REENVIO, { campo: 'modo', etiqueta: 'El modo de reenvío' }, errors);

  let ids = [];
  if (modo === 'ids') {
    if (!Array.isArray(datos.ids) || datos.ids.length === 0 || datos.ids.length > MAX_IDS_REENVIO) {
      errors.push({ field: 'ids', message: `Elige entre 1 y ${MAX_IDS_REENVIO} participaciones.` });
    } else if (!datos.ids.every((id) => Number.isInteger(id) && id >= 1 && id <= MAX_ID)) {
      errors.push({ field: 'ids', message: 'Alguna de las participaciones elegidas no es válida.' });
    } else {
      ids = datos.ids;
    }
  }

  let forzar = false;
  if (datos.forzar !== undefined) {
    if (typeof datos.forzar !== 'boolean') {
      errors.push({ field: 'forzar', message: 'La opción de reenviar de todos modos no es válida.' });
    } else {
      forzar = datos.forzar;
    }
  }
  if (forzar && modo !== 'ids') {
    errors.push({ field: 'forzar', message: 'Solo se puede reenviar de todos modos a participaciones elegidas.' });
  }

  if (errors.length > 0) {
    fallar(errors);
  }
  return { modo, ids, forzar };
}

export function validarFiltrosBitacora(query) {
  const errors = [];
  const filtros = {};
  const accion = parametroTexto(query, 'accion');
  if (accion !== undefined) {
    if (typeof accion !== 'string' || !/^[a-z_]{1,50}$/.test(accion)) {
      errors.push({ field: 'accion', message: 'La acción no es válida.' });
    } else {
      filtros.accion = accion;
    }
  }
  filtros.idAdministrador = idDeQuery(query, 'idAdministrador', errors);
  if (errors.length > 0) {
    fallar(errors);
  }
  return filtros;
}

export function validarLogin(body) {
  const datos = cuerpoObjeto(body);
  if (typeof datos.correo !== 'string' || typeof datos.contrasena !== 'string' || !datos.correo || !datos.contrasena) {
    fallar([{ field: 'correo', message: 'Escribe tu correo y tu contraseña.' }]);
  }
  // Una contraseña más larga que el máximo permitido al crearla nunca puede ser válida: se rechaza antes de gastar tiempo en calcular su hash.
  if (datos.correo.length > MAX_CORREO || datos.contrasena.length > PASSWORD_MAX_LENGTH) {
    fallar([{ field: 'correo', message: 'Los datos enviados no son válidos.' }]);
  }
  return { correo: datos.correo.trim().toLowerCase(), contrasena: datos.contrasena };
}

export function validarCambioContrasena(body, correoActual) {
  const datos = cuerpoObjeto(body);
  const errors = [];
  if (typeof datos.actual !== 'string' || !datos.actual) {
    errors.push({ field: 'actual', message: 'Escribe tu contraseña actual.' });
  }
  const problema = findPasswordProblem(datos.nueva, { correo: correoActual });
  if (problema) {
    errors.push({ field: 'nueva', message: problema });
  }
  if (datos.nueva === datos.actual && !problema) {
    errors.push({ field: 'nueva', message: 'La contraseña nueva debe ser distinta de la actual.' });
  }
  if (errors.length > 0) {
    fallar(errors);
  }
  return { actual: datos.actual, nueva: datos.nueva };
}

export function validarNuevoAdministrador(body) {
  const datos = cuerpoObjeto(body);
  const errors = [];
  const nombre = texto(datos.nombre, { campo: 'nombre', etiqueta: 'El nombre', max: MAX_NOMBRE }, errors);
  const correoLimpio = correo(datos.correo, errors);
  const rol = opcion(datos.rol, ROLES, { campo: 'rol', etiqueta: 'El rol' }, errors);
  const problema = findPasswordProblem(datos.contrasena, { correo: correoLimpio });
  if (problema) {
    errors.push({ field: 'contrasena', message: problema });
  }
  if (errors.length > 0) {
    fallar(errors);
  }
  return { nombre, correo: correoLimpio, rol, contrasena: datos.contrasena };
}

export function validarCambiosAdministrador(body) {
  const datos = cuerpoObjeto(body);
  const errors = [];
  const cambios = {};
  if (datos.nombre !== undefined) {
    cambios.nombre = texto(datos.nombre, { campo: 'nombre', etiqueta: 'El nombre', max: MAX_NOMBRE }, errors);
  }
  if (datos.rol !== undefined) {
    cambios.rol = opcion(datos.rol, ROLES, { campo: 'rol', etiqueta: 'El rol' }, errors);
  }
  if (datos.activo !== undefined) {
    if (typeof datos.activo !== 'boolean') {
      errors.push({ field: 'activo', message: 'El estado no es válido.' });
    } else {
      cambios.activo = Number(datos.activo);
    }
  }
  if (Object.keys(cambios).length === 0 && errors.length === 0) {
    errors.push({ field: 'body', message: 'No hay cambios que guardar.' });
  }
  if (errors.length > 0) {
    fallar(errors);
  }
  return cambios;
}

export function validarRestablecerContrasena(body, correoObjetivo) {
  const datos = cuerpoObjeto(body);
  const problema = findPasswordProblem(datos.contrasena, { correo: correoObjetivo });
  if (problema) {
    fallar([{ field: 'contrasena', message: problema }]);
  }
  return datos.contrasena;
}

function validarContrasenaApp(valor, errors, obligatoria) {
  if (valor === undefined && !obligatoria) {
    return undefined;
  }
  if (typeof valor !== 'string') {
    errors.push({ field: 'contrasenaApp', message: 'La contraseña de aplicación es obligatoria.' });
    return undefined;
  }
  // Google la muestra en grupos de cuatro letras separados por espacios.
  const limpia = valor.replace(/\s+/g, '');
  if (limpia.length === 0 || limpia.length > MAX_CONTRASENA_APP) {
    errors.push({ field: 'contrasenaApp', message: 'La contraseña de aplicación no es válida.' });
  }
  return limpia;
}

export function validarNuevaCuentaCorreo(body) {
  const datos = cuerpoObjeto(body);
  const errors = [];
  const correoLimpio = correo(datos.correo, errors);
  const nombreRemitente = texto(datos.nombreRemitente, { campo: 'nombreRemitente', etiqueta: 'El nombre del remitente', max: MAX_NOMBRE, obligatorio: false }, errors);
  const contrasenaApp = validarContrasenaApp(datos.contrasenaApp, errors, true);
  const prioridad = entero(datos.prioridad ?? 100, { campo: 'prioridad', etiqueta: 'La prioridad', min: 1, max: 65535 }, errors);
  const limiteDiario = entero(datos.limiteDiario ?? 400, { campo: 'limiteDiario', etiqueta: 'El límite diario', min: 1, max: 100000 }, errors);
  if (errors.length > 0) {
    fallar(errors);
  }
  return { correo: correoLimpio, nombreRemitente: nombreRemitente || null, contrasenaApp, prioridad, limiteDiario };
}

export function validarCambiosCuentaCorreo(body) {
  const datos = cuerpoObjeto(body);
  const errors = [];
  const cambios = {};
  if (datos.nombreRemitente !== undefined) {
    const nombre = texto(datos.nombreRemitente, { campo: 'nombreRemitente', etiqueta: 'El nombre del remitente', max: MAX_NOMBRE, obligatorio: false }, errors);
    cambios.nombreRemitente = nombre || null;
  }
  if (datos.prioridad !== undefined) {
    cambios.prioridad = entero(datos.prioridad, { campo: 'prioridad', etiqueta: 'La prioridad', min: 1, max: 65535 }, errors);
  }
  if (datos.limiteDiario !== undefined) {
    cambios.limiteDiario = entero(datos.limiteDiario, { campo: 'limiteDiario', etiqueta: 'El límite diario', min: 1, max: 100000 }, errors);
  }
  if (datos.activo !== undefined) {
    if (typeof datos.activo !== 'boolean') {
      errors.push({ field: 'activo', message: 'El estado no es válido.' });
    } else {
      cambios.activo = Number(datos.activo);
    }
  }
  const contrasenaApp = validarContrasenaApp(datos.contrasenaApp, errors, false);
  if (Object.keys(cambios).length === 0 && contrasenaApp === undefined && errors.length === 0) {
    errors.push({ field: 'body', message: 'No hay cambios que guardar.' });
  }
  if (errors.length > 0) {
    fallar(errors);
  }
  return { cambios, contrasenaApp };
}
