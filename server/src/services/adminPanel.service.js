import { cifrar } from '../utils/cifrado.js';
import { toCsvRow } from '../utils/csv.js';
import { fechaHoraLegible, fechaLocal } from '../utils/fechas.js';
import { COLUMNAS, ETIQUETA_NIVEL, ETIQUETA_SI_NO, describirFiltros } from './exportaciones/columnas.js';
import { generarExcel } from './exportaciones/excel.js';
import { generarPdf } from './exportaciones/pdf.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { hashPassword } from '../utils/passwords.js';

const NIVELES = ['bajo', 'medio', 'alto', 'muy_alto'];
const DIAS_SERIE_POR_DEFECTO = 30;
const TOP_ESCUELAS = 10;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

// Formatos de exportación: tipo de contenido, extensión y cuántas filas caben como máximo.
// El PDF y el Excel arman todo el archivo en memoria, por eso su límite es menor que el del CSV.
const FORMATOS_EXPORTACION = Object.freeze({
  xlsx: Object.freeze({
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
    limite: 20_000,
  }),
  pdf: Object.freeze({ contentType: 'application/pdf', extension: 'pdf', limite: 5_000 }),
  csv: Object.freeze({ contentType: 'text/csv; charset=utf-8', extension: 'csv', limite: 50_000 }),
});

// Lista cada día entre `desde` y `hasta` (incluidos) con su total; los días sin datos quedan en cero.
function completarDias(filas, desde, hasta) {
  const totales = new Map(filas.map((fila) => [String(fila.dia).slice(0, 10), fila.total]));
  const serie = [];
  const fin = new Date(`${hasta}T12:00:00`);
  for (let dia = new Date(`${desde}T12:00:00`); dia <= fin; dia = new Date(dia.getTime() + UN_DIA_MS)) {
    const clave = fechaLocal(dia);
    serie.push({ dia: clave, total: totales.get(clave) ?? 0 });
  }
  return serie;
}

function normalizarDetalle(detalle) {
  if (typeof detalle !== 'string') {
    return detalle;
  }
  try {
    return JSON.parse(detalle);
  } catch {
    return null;
  }
}

// CSV 
function armarCsv(filas) {
  const lineas = [toCsvRow(COLUMNAS.map((columna) => columna.titulo))];
  for (const fila of filas) {
    lineas.push(
      toCsvRow(
        COLUMNAS.map((columna) => {
          if (columna.tipo === 'nivel') {
            return ETIQUETA_NIVEL[fila.nivel];
          }
          if (columna.tipo === 'sino') {
            return ETIQUETA_SI_NO[fila.correoEnviado];
          }
          return fila[columna.clave];
        })
      )
    );
  }
  return `\uFEFF${lineas.join('\r\n')}\r\n`;
}

/**
 * Lógica del panel de administración: estadísticas, participaciones, correo, administradores y bitácora.
 * Toda acción que cambia datos o entrega datos personales queda en la bitácora.
 *
 * @param {{repositories: object, auditar: Function, config: {mail: {secretKey?: string}}}} deps
 */
export function createAdminPanelService({ repositories, auditar, config }) {
  const { reportes, administradores, bitacora, correoAdmin } = repositories;

  function cifrarContrasenaApp(contrasenaApp) {
    try {
      return cifrar(contrasenaApp, config.mail.secretKey);
    } catch {
      throw conflict('MAIL_KEY_MISSING', 'El servidor no tiene configurada la llave MAIL_SECRET_KEY, no se pueden guardar contraseñas de correo.');
    }
  }

  async function exigirAdministrador(id) {
    const administrador = await administradores.buscarPorId(id);
    if (!administrador) {
      throw notFound('ADMIN_NOT_FOUND', 'No se encontró al administrador.');
    }
    return administrador;
  }

  // Impide dejar el sistema sin ningún superadministrador activo.
  async function exigirOtroSuperadmin(administrador) {
    if (administrador.rol === 'superadmin' && administrador.activo && (await administradores.contarSuperadminsActivos()) <= 1) {
      throw conflict('LAST_SUPERADMIN', 'Debe quedar al menos un superadministrador activo.');
    }
  }

  return {
    async resumen(filtros) {
      const hoy = fechaLocal(new Date());
      const desdeSerie = filtros.desde ?? fechaLocal(new Date(Date.now() - (DIAS_SERIE_POR_DEFECTO - 1) * UN_DIA_MS));
      const hastaSerie = filtros.hasta ?? hoy;

      const [totales, niveles, porDia, porUnidad, topEscuelas, estadoCorreo] = await Promise.all([
        reportes.totales(filtros),
        reportes.porNivel(filtros),
        reportes.porDia({ ...filtros, desde: desdeSerie, hasta: hastaSerie }),
        reportes.porUnidad(filtros),
        reportes.topEscuelas(filtros, TOP_ESCUELAS),
        reportes.estadoCorreo(),
      ]);

      const totalPorNivel = new Map(niveles.map((fila) => [fila.nivel, fila.total]));
      const enviosPorEstado = new Map(estadoCorreo.envios.map((fila) => [fila.estado, fila.total]));
      return {
        totales,
        niveles: NIVELES.map((nivel) => ({ nivel, total: totalPorNivel.get(nivel) ?? 0 })),
        porDia: completarDias(porDia, desdeSerie, hastaSerie),
        porUnidad,
        topEscuelas,
        correo: {
          enviados7d: enviosPorEstado.get('enviado') ?? 0,
          fallidos7d: enviosPorEstado.get('fallido') ?? 0,
          enviadosTotal: estadoCorreo.enviadosTotal,
          sinCorreo: estadoCorreo.sinCorreo,
        },
      };
    },

    listarParticipaciones(filtros, paginacion, orden) {
      return reportes.listar(filtros, { ...paginacion, ...orden });
    },

    async obtenerParticipacion(id, { admin, ip }) {
      const participacion = await reportes.obtener(id);
      if (!participacion) {
        throw notFound('PARTICIPATION_NOT_FOUND', 'No se encontró la participación.');
      }
      await auditar({ idAdministrador: admin.id, accion: 'ver_participacion', entidad: 'participacion', idEntidad: id, ip });
      return participacion;
    },

    async eliminarParticipacion(id, { admin, ip }) {
      if (!(await reportes.eliminar(id))) {
        throw notFound('PARTICIPATION_NOT_FOUND', 'No se encontró la participación.');
      }
      await auditar({ idAdministrador: admin.id, accion: 'eliminar_participacion', entidad: 'participacion', idEntidad: id, ip });
    },

    /**
     * Genera el archivo de exportación (Excel, PDF o CSV) con los mismos filtros y orden que ve la persona en pantalla
     * y deja constancia en la bitácora.
     *
     * @returns {Promise<{contenido: Buffer, contentType: string, extension: string, filas: number, truncado: boolean}>}
     */
    async exportarParticipaciones(filtros, orden, formato, { admin, ip }) {
      const configuracion = FORMATOS_EXPORTACION[formato];
      const { filas, truncado } = await reportes.exportar(filtros, { ...orden, limite: configuracion.limite });

      let contenido;
      if (formato === 'csv') {
        contenido = Buffer.from(armarCsv(filas), 'utf8');
      } else {
        const [totales, niveles, nombres] = await Promise.all([reportes.totales(filtros), reportes.porNivel(filtros), reportes.nombresDeFiltro(filtros)]);
        const totalPorNivel = new Map(niveles.map((fila) => [fila.nivel, fila.total]));
        const datos = {
          filas,
          resumen: { totales, niveles: NIVELES.map((nivel) => ({ nivel, total: totalPorNivel.get(nivel) ?? 0 })) },
          filtrosTexto: describirFiltros(filtros, nombres),
          generadoPor: admin.nombre,
          generadoEn: fechaHoraLegible(),
          truncado,
          limite: configuracion.limite,
        };
        if (formato === 'pdf') {
          contenido = await generarPdf(datos);
        } else {
          contenido = await generarExcel(datos);
        }
      }

      await auditar({
        idAdministrador: admin.id,
        accion: 'exportar_participaciones',
        entidad: 'participacion',
        detalle: { formato, filas: filas.length, truncado, filtros },
        ip,
      });
      return { contenido, contentType: configuracion.contentType, extension: configuracion.extension, filas: filas.length, truncado };
    },

    listarCuentasCorreo() {
      return correoAdmin.listarCuentas();
    },

    listarEnvios(filtros, paginacion) {
      return correoAdmin.listarEnvios({ ...filtros, ...paginacion });
    },

    // Conteos generales del correo: total enviado, lo de hoy, pendientes y cupo restante.
    resumenCorreo() {
      return correoAdmin.resumen();
    },

    listarPendientesCorreo(filtros, paginacion) {
      return correoAdmin.listarPendientes({ ...filtros, ...paginacion });
    },

    async crearCuentaCorreo({ correo, nombreRemitente, contrasenaApp, prioridad, limiteDiario }, { admin, ip }) {
      const contrasenaCifrada = cifrarContrasenaApp(contrasenaApp);
      let id;
      try {
        id = await correoAdmin.crearCuenta({ correo, nombreRemitente, contrasenaCifrada, prioridad, limiteDiario });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          throw conflict('MAIL_ACCOUNT_EXISTS', 'Ya existe una cuenta con ese correo.');
        }
        throw err;
      }
      await auditar({ idAdministrador: admin.id, accion: 'crear_cuenta_correo', entidad: 'cuenta_correo', idEntidad: id, detalle: { correo }, ip });
      return id;
    },

    async actualizarCuentaCorreo(id, { cambios, contrasenaApp }, { admin, ip }) {
      const cuenta = await correoAdmin.buscarCuenta(id);
      if (!cuenta) {
        throw notFound('MAIL_ACCOUNT_NOT_FOUND', 'No se encontró la cuenta de correo.');
      }
      const cambiosFinales = { ...cambios };
      if (contrasenaApp !== undefined) {
        cambiosFinales.contrasenaCifrada = cifrarContrasenaApp(contrasenaApp);
      }
      await correoAdmin.actualizarCuenta(id, cambiosFinales);

      // La contraseña nunca se escribe en la bitácora: solo se anota que se cambió.
      const detalle = { correo: cuenta.correo, campos: Object.keys(cambios) };
      if (contrasenaApp !== undefined) {
        detalle.contrasenaCambiada = true;
      }
      await auditar({ idAdministrador: admin.id, accion: 'editar_cuenta_correo', entidad: 'cuenta_correo', idEntidad: id, detalle, ip });
    },

    listarAdministradores() {
      return administradores.listar();
    },

    async crearAdministrador({ nombre, correo, rol, contrasena }, { admin, ip }) {
      let id;
      try {
        id = await administradores.crear({ nombre, correo, rol, contrasenaHash: await hashPassword(contrasena) });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          throw conflict('ADMIN_EXISTS', 'Ya existe un administrador con ese correo.');
        }
        throw err;
      }
      await auditar({ idAdministrador: admin.id, accion: 'crear_administrador', entidad: 'administrador', idEntidad: id, detalle: { correo, rol }, ip });
      return id;
    },

    async actualizarAdministrador(id, cambios, { admin, ip }) {
      const objetivo = await exigirAdministrador(id);
      const pierdeAcceso = cambios.activo === 0 || (cambios.rol !== undefined && cambios.rol !== objetivo.rol);

      if (id === admin.id && pierdeAcceso) {
        throw forbidden('SELF_CHANGE', 'No puedes desactivarte ni cambiar tu propio rol.');
      }
      if (pierdeAcceso) {
        await exigirOtroSuperadmin(objetivo);
      }

      await administradores.actualizar(id, cambios);
      // Si cambió su rol o se desactivó, debe volver a iniciar sesión.
      if (pierdeAcceso) {
        await administradores.revocarSesionesDe(id);
      }
      await auditar({ idAdministrador: admin.id, accion: 'editar_administrador', entidad: 'administrador', idEntidad: id, detalle: { campos: Object.keys(cambios) }, ip });
    },

    async restablecerContrasena(id, contrasena, { admin, ip }) {
      if (id === admin.id) {
        throw badRequest('USE_OWN_ACCOUNT', 'Para cambiar tu propia contraseña usa la sección Mi cuenta.');
      }
      await exigirAdministrador(id);
      await administradores.cambiarContrasena(id, await hashPassword(contrasena));
      await administradores.revocarSesionesDe(id);
      await auditar({ idAdministrador: admin.id, accion: 'restablecer_contrasena', entidad: 'administrador', idEntidad: id, ip });
    },

    async obtenerAdministrador(id) {
      return exigirAdministrador(id);
    },

    async listarBitacora(filtros, paginacion) {
      const [resultado, acciones] = await Promise.all([bitacora.listar({ ...filtros, ...paginacion }), bitacora.listarAcciones()]);
      const items = resultado.items.map((item) => ({ ...item, detalle: normalizarDetalle(item.detalle) }));
      return { items, total: resultado.total, acciones };
    },
  };
}
