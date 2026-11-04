import { requestJson } from './httpClient.js';

// Catálogos del formulario final, leídos de la base de datos
// Cada función devuelve una lista de { id, nombre }.

export async function fetchUnidadesRegionales(_param, signal) {
  const data = await requestJson('/api/catalogo/unidades-regionales', { signal });
  return data.items;
}

export async function fetchPaises(_param, signal) {
  const data = await requestJson('/api/catalogo/paises', { signal });
  return data.items;
}

export async function fetchEstados(_param, signal) {
  const data = await requestJson('/api/catalogo/estados', { signal });
  return data.items;
}

// Municipios de un estado
export async function fetchMunicipios(idEstado, signal) {
  const data = await requestJson(`/api/catalogo/estados/${encodeURIComponent(idEstado)}/municipios`, { signal });
  return data.items;
}

// Escuelas y facultades de una unidad regional 
export async function fetchEscuelas(idUnidadRegional, signal) {
  const data = await requestJson(`/api/catalogo/unidades-regionales/${encodeURIComponent(idUnidadRegional)}/escuelas`, {
    signal,
  });
  return data.items;
}
