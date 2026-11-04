import { validateParticipationRequest } from '../validators/participacion.validator.js';

/**
 * Rechaza con 400 Bad Request cualquier solicitud con datos faltantes o inválidos.
 * Si todo está bien, deja los datos limpios en `req.participacion` y el cuestionario con el que se
 * validaron en `req.cuestionario` (el servicio usa ESA misma instantánea para calcular y guardar).
 *
 * Es la barrera del servidor: aunque alguien se salte el navegador, no recibe resultados ni se guarda nada.
 *
 * @param {{cuestionarioService: {obtener: () => Promise<{version: string, questions: object[]}>}}} deps
 */
export function createValidarParticipacion({ cuestionarioService }) {
  return async function validarParticipacion(req, res, next) {
    const cuestionario = await cuestionarioService.obtener();
    const parsed = validateParticipationRequest(req.body, cuestionario.questions);

    if (!parsed.ok) {
      /*
       * Si las respuestas ya no encajan porque el cuestionario cambió mientras la persona contestaba,
       * se le explica eso (409) en lugar de decirle que le faltan respuestas.
       */
      const respuestasInvalidas = parsed.errors.some((error) => error.field === 'answers');
      const versionEnviada = req.body?.cuestionarioVersion;
      if (respuestasInvalidas && typeof versionEnviada === 'string' && versionEnviada !== cuestionario.version) {
        return res.status(409).json({
          ok: false,
          code: 'QUESTIONNAIRE_CHANGED',
          message: 'El cuestionario se actualizó mientras lo respondías. Recarga la página para contestar la versión nueva.',
        });
      }
      return res.status(400).json({
        ok: false,
        code: 'VALIDATION_ERROR',
        message: 'Completa todos los campos y responde todas las preguntas para ver tus resultados.',
        errors: parsed.errors,
      });
    }

    req.participacion = parsed.value;
    req.esBot = parsed.isBot;
    req.cuestionario = cuestionario;
    return next();
  };
}
