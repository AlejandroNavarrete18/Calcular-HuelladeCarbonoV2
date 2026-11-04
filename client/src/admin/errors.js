import { ApiError } from '../services/httpClient.js';

// Mensaje de un error de la API 
export function errorMessage(error) {
  if (error instanceof ApiError) {
    return error.message;
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}

// Errores por campo que devuelve la API ({ campo: mensaje }) 
export function fieldErrors(error) {
  if (!(error instanceof ApiError)) {
    return {};
  }
  return Object.fromEntries(error.errors.map((item) => [item.field, item.message]));
}
