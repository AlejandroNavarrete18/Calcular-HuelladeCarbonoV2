import { MEXICO_CODE, OTHER_INSTITUTION } from '@huella/shared';
import { useRemoteData } from './useRemoteData.js';
import { fetchEscuelas, fetchEstados, fetchMunicipios, fetchPaises, fetchUnidadesRegionales } from '../services/catalogApi.js';

const NO_ITEMS = Object.freeze([]);
const LIST_OPTIONS = Object.freeze({ emptyValue: NO_ITEMS });

// Cada lista se pide solo cuando hace falta y se vuelve a pedir cuando cambia el campo del que depende:
// estados si el país es México, municipios al elegir estado y escuelas al elegir una unidad regional de la UAS.
export function useCatalog({ codigoPais, idEstado, idUnidadRegional }) {
  const isUas = idUnidadRegional !== '' && idUnidadRegional !== OTHER_INSTITUTION;

  const paises = useRemoteData(fetchPaises, 'todos', LIST_OPTIONS);
  const estados = useRemoteData(fetchEstados, 'todos', { emptyValue: NO_ITEMS, enabled: codigoPais === MEXICO_CODE });
  const municipios = useRemoteData(fetchMunicipios, idEstado, { emptyValue: NO_ITEMS, enabled: idEstado !== '' });
  const unidades = useRemoteData(fetchUnidadesRegionales, 'todas', LIST_OPTIONS);
  const escuelas = useRemoteData(fetchEscuelas, idUnidadRegional, { emptyValue: NO_ITEMS, enabled: isUas });

  return { paises, estados, municipios, unidades, escuelas };
}
