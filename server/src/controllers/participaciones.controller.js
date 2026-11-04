/**
 * Controlador de POST /api/participaciones.
 * Los datos ya llegan validados (middleware validarParticipacion).
 *
 * @param {{participacionesService: ReturnType<import('../services/participaciones.service.js').createParticipacionesService>,
 *          logger: {warn: Function}}} deps
 */
export function createParticipacionesController({ participacionesService, logger }) {
  return {
    async crear(req, res) {
      // Campo trampa lleno = es un bot: se responde "bien" pero no se guarda nada.
      if (req.esBot) {
        logger.warn('Petición descartada por honeypot.');
        return res.status(200).json({ ok: true });
      }

      const { results, email } = await participacionesService.registrar(req.participacion, req.cuestionario);
      return res.status(201).json({ ok: true, results, email });
    },
  };
}
