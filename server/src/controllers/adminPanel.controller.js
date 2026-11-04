import {
  validarCambiosAdministrador,
  validarCambiosCuentaCorreo,
  validarFiltrosBitacora,
  validarFiltrosEnvios,
  validarFiltrosPendientes,
  validarFormatoExportacion,
  validarFiltrosParticipaciones,
  validarNuevaCuentaCorreo,
  validarNuevoAdministrador,
  validarOrden,
  validarPaginacion,
  validarReenvio,
  validarRestablecerContrasena,
} from '../validators/admin.validator.js';
import { fechaLocal } from '../utils/fechas.js';

/**
 * Controlador del panel de administración: valida lo que llega, llama al servicio y responde.
 *
 * @param {{adminPanelService: ReturnType<import('../services/adminPanel.service.js').createAdminPanelService>,
 *          reenviosService: ReturnType<import('../services/mail/reenvios.service.js').createReenviosService>}} deps
 */
export function createAdminPanelController({ adminPanelService, reenviosService }) {
  const contexto = (req) => ({ admin: req.admin, ip: req.ip });

  return {
    async resumen(req, res) {
      res.json({ ok: true, ...(await adminPanelService.resumen(validarFiltrosParticipaciones(req.query))) });
    },

    async listarParticipaciones(req, res) {
      const resultado = await adminPanelService.listarParticipaciones(
        validarFiltrosParticipaciones(req.query),
        validarPaginacion(req.query),
        validarOrden(req.query)
      );
      res.json({ ok: true, ...resultado });
    },

    async obtenerParticipacion(req, res) {
      res.json({ ok: true, participacion: await adminPanelService.obtenerParticipacion(req.params.id, contexto(req)) });
    },

    async eliminarParticipacion(req, res) {
      await adminPanelService.eliminarParticipacion(req.params.id, contexto(req));
      res.json({ ok: true });
    },

    async exportarParticipaciones(req, res) {
      const archivo = await adminPanelService.exportarParticipaciones(
        validarFiltrosParticipaciones(req.query),
        validarOrden(req.query),
        validarFormatoExportacion(req.query),
        contexto(req)
      );
      const fecha = fechaLocal();
      res.set({
        'Content-Type': archivo.contentType,
        'Content-Disposition': `attachment; filename="participaciones-${fecha}.${archivo.extension}"`,
        'Content-Length': String(archivo.contenido.length),
        'X-Content-Type-Options': 'nosniff',
        // El panel lee estas cabeceras para avisar si el archivo quedó incompleto.
        'X-Filas-Exportadas': String(archivo.filas),
        'X-Exportacion-Truncada': String(archivo.truncado),
        'Access-Control-Expose-Headers': 'Content-Disposition, X-Filas-Exportadas, X-Exportacion-Truncada',
      });
      res.send(archivo.contenido);
    },

    async listarCuentasCorreo(_req, res) {
      res.json({ ok: true, items: await adminPanelService.listarCuentasCorreo() });
    },

    async crearCuentaCorreo(req, res) {
      const id = await adminPanelService.crearCuentaCorreo(validarNuevaCuentaCorreo(req.body), contexto(req));
      res.status(201).json({ ok: true, id });
    },

    async actualizarCuentaCorreo(req, res) {
      await adminPanelService.actualizarCuentaCorreo(req.params.id, validarCambiosCuentaCorreo(req.body), contexto(req));
      res.json({ ok: true });
    },

    async listarEnvios(req, res) {
      res.json({ ok: true, ...(await adminPanelService.listarEnvios(validarFiltrosEnvios(req.query), validarPaginacion(req.query))) });
    },

    async resumenCorreo(_req, res) {
      res.json({ ok: true, ...(await adminPanelService.resumenCorreo()) });
    },

    async listarPendientesCorreo(req, res) {
      res.json({ ok: true, ...(await adminPanelService.listarPendientesCorreo(validarFiltrosPendientes(req.query), validarPaginacion(req.query))) });
    },

    // Inicia el reenvío y responde enseguida (202): el avance se consulta con estadoReenvio.
    async reenviarCorreos(req, res) {
      const trabajo = await reenviosService.iniciar(validarReenvio(req.body), contexto(req));
      res.status(202).json({ ok: true, trabajo });
    },

    async estadoReenvio(_req, res) {
      res.json({ ok: true, trabajo: reenviosService.estado() });
    },

    async listarAdministradores(_req, res) {
      res.json({ ok: true, items: await adminPanelService.listarAdministradores() });
    },

    async crearAdministrador(req, res) {
      const id = await adminPanelService.crearAdministrador(validarNuevoAdministrador(req.body), contexto(req));
      res.status(201).json({ ok: true, id });
    },

    async actualizarAdministrador(req, res) {
      await adminPanelService.actualizarAdministrador(req.params.id, validarCambiosAdministrador(req.body), contexto(req));
      res.json({ ok: true });
    },

    async restablecerContrasena(req, res) {
      const objetivo = await adminPanelService.obtenerAdministrador(req.params.id);
      const contrasena = validarRestablecerContrasena(req.body, objetivo.correo);
      await adminPanelService.restablecerContrasena(req.params.id, contrasena, contexto(req));
      res.json({ ok: true });
    },

    async listarBitacora(req, res) {
      res.json({ ok: true, ...(await adminPanelService.listarBitacora(validarFiltrosBitacora(req.query), validarPaginacion(req.query))) });
    },
  };
}
