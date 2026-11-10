import { notFound } from '../utils/errors.js';

/**
 * Controlador de los cuestionarios: lo que el navegador necesita para dibujar las preguntas del cuestionario elegido.
 * No incluye pesos: el resultado siempre lo calcula el servidor.
 *
 * @param {{cuestionarioService: {obtener: (clave: string) => Promise<object|undefined>}}} deps
 */
export function createCuestionarioController({ cuestionarioService }) {
  return {
    async obtener(req, res) {
      const cuestionario = await cuestionarioService.obtener(req.params.clave);
      if (!cuestionario) {
        throw notFound('QUESTIONNAIRE_NOT_FOUND', 'El cuestionario solicitado no existe.');
      }
      // Sin caché del navegador: una edición en la base debe verse en la siguiente carga.
      res.set('Cache-Control', 'no-store');
      res.json({
        ok: true,
        clave: cuestionario.clave,
        nombre: cuestionario.nombre,
        version: cuestionario.version,
        questions: cuestionario.publico,
      });
    },
  };
}
