/**
 * Controlador del cuestionario: lo que el navegador necesita para dibujar las preguntas.
 * No incluye pesos: el resultado siempre lo calcula el servidor.
 *
 * @param {{cuestionarioService: {obtener: () => Promise<{version: string, publico: object[]}>}}} deps
 */
export function createCuestionarioController({ cuestionarioService }) {
  return {
    async obtener(_req, res) {
      const { version, publico } = await cuestionarioService.obtener();
      // Sin caché del navegador: una edición en la base debe verse en la siguiente carga.
      res.set('Cache-Control', 'no-store');
      res.json({ ok: true, version, questions: publico });
    },
  };
}
