// Arma "WHERE a AND b" a partir de condiciones fijas; devuelve una cadena vacía si no hay ninguna.
export function armarWhere(condiciones) {
  if (condiciones.length === 0) {
    return '';
  }
  return `WHERE ${condiciones.join(' AND ')}`;
}

// Escapa % y _ para que el texto buscado se compare literal dentro de un LIKE.
export const escaparLike = (texto) => texto.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
