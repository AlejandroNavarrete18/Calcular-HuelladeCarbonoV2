import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

//Cifrado de las contraseñas de aplicación guardadas en la base de datos.

const ALGORITHM = 'aes-256-gcm';

function parseKey(hexKey) {
  if (typeof hexKey !== 'string' || !/^[0-9a-fA-F]{64}$/.test(hexKey)) {
    throw new Error('MAIL_SECRET_KEY debe tener exactamente 64 caracteres hexadecimales (32 bytes).');
  }
  return Buffer.from(hexKey, 'hex');
}

// Cifra un texto (ej. la contraseña de aplicación) para guardarlo en cuentas_correo.contrasena_cifrada.
export function cifrar(textoPlano, hexKey) {
  const key = parseKey(hexKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const datos = Buffer.concat([cipher.update(String(textoPlano), 'utf8'), cipher.final()]);
  const etiqueta = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), etiqueta.toString('base64'), datos.toString('base64')].join(':');
}

// Descifra un valor producido por cifrar(). Lanza error si la llave es incorrecta o el dato fue alterado.
export function descifrar(textoCifrado, hexKey) {
  const key = parseKey(hexKey);
  const [version, iv, etiqueta, datos] = String(textoCifrado).split(':');
  if (version !== 'v1' || !iv || !etiqueta || !datos) {
    throw new Error('Formato de contraseña cifrada no reconocido.');
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(etiqueta, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(datos, 'base64')), decipher.final()]).toString('utf8');
}
