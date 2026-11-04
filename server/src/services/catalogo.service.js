import { notFound } from '../utils/errors.js';

/**
 * Catálogos del formulario (países, estados, municipios, unidades regionales y escuelas).
 *
 * @param {{catalogo: ReturnType<import('../repositories/catalogo.repository.js').createCatalogoRepository>}} deps
 */
export function createCatalogoService({ catalogo }) {
  return {
    listarUnidades: () => catalogo.listarUnidades(),
    listarPaises: () => catalogo.listarPaises(),
    listarEstados: () => catalogo.listarEstados(),

    // Municipios de un estado. 404 si el estado no existe o está desactivado.
    async listarMunicipios(idEstado) {
      const municipios = await catalogo.listarMunicipios(idEstado);
      if (municipios.length === 0 && !(await catalogo.existeEstado(idEstado))) {
        throw notFound('ESTADO_NOT_FOUND', 'El estado no existe.');
      }
      return municipios;
    },

    // Escuelas de una unidad regional. 404 si la unidad no existe o está desactivada.
    async listarEscuelas(idUnidad) {
      const escuelas = await catalogo.listarEscuelas(idUnidad);
      if (escuelas.length === 0 && !(await catalogo.existeUnidad(idUnidad))) {
        throw notFound('UNIDAD_NOT_FOUND', 'La unidad regional no existe.');
      }
      return escuelas;
    },
  };
}
