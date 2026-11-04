/**
 * Datos de la persona participante (formulario final) y sus reglas de validación.
 *
 * Estas reglas se usan en DOS lugares con el mismo código:
 *   - el navegador (React) para avisar y bloquear el botón mientras falte algo;
 *   - el servidor (Express) para rechazar con 400 cualquier solicitud incompleta o manipulada.
 *
 * Algunos campos dependen de otros:
 *   - País México: estado y municipio. Cualquier otro país: ciudad o provincia (texto).
 *   - Unidad regional de la UAS: escuela o facultad. Unidad "Otros": nombre de la escuela o institución (texto).
 */

// Código ISO del país donde se piden estado y municipio
export const MEXICO_CODE = 'MX';

// Valor de la lista de unidades regionales para quien no pertenece a la UAS
export const OTHER_INSTITUTION = 'otros';

// Campos del formulario, en el orden en que se muestran. `label` se usa en los avisos.
export const PARTICIPANT_FIELDS = Object.freeze([
  Object.freeze({ key: 'nombre', label: 'Nombre' }),
  Object.freeze({ key: 'apellidos', label: 'Apellidos' }),
  Object.freeze({ key: 'correo', label: 'Correo electrónico' }),
  Object.freeze({ key: 'telefono', label: 'Teléfono' }),
  Object.freeze({ key: 'fechaNacimiento', label: 'Fecha de nacimiento' }),
  Object.freeze({ key: 'codigoPais', label: 'País' }),
  Object.freeze({ key: 'idEstado', label: 'Estado' }),
  Object.freeze({ key: 'idMunicipio', label: 'Municipio' }),
  Object.freeze({ key: 'ciudadProvincia', label: 'Ciudad o provincia' }),
  Object.freeze({ key: 'localidadComunidad', label: 'Localidad / Comunidad' }),
  Object.freeze({ key: 'idUnidadRegional', label: 'Unidad regional' }),
  Object.freeze({ key: 'idEscuelaFacultad', label: 'Escuela / Facultad' }),
  Object.freeze({ key: 'institucionExterna', label: 'Escuela o institución' }),
]);

// Largos máximos: coinciden con las columnas de `participaciones`
export const PARTICIPANT_LIMITS = Object.freeze({
  nombre: 40,
  apellidos: 40,
  correo: 254,
  ciudadProvincia: 120,
  localidadComunidad: 120,
  institucionExterna: 150,
  telefonoMin: 10,
  telefonoMax: 15,
  edadMaxima: 110,
});

const MAX_UNSIGNED_INT = 4_294_967_295;
const MIN_TEXT_LENGTH = 2;

const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;
const LOCALITY_PATTERN = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s.,'’()#/-]*$/u;
const INSTITUTION_PATTERN = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}\s.,'’"()#&/:-]*$/u;
const COUNTRY_CODE = /^[A-Z]{2}$/;
const CONTROL_CHARS = /\p{Cc}/u;
const EMAIL_PATTERN = /^[^\s@<>()[\],;:"\\]{1,64}@[^\s@<>()[\],;:"\\]+\.[^\s@<>()[\],;:"\\]{2,}$/u;
const PHONE_SEPARATORS = /[\s().+-]/g;
const PHONE_DIGITS = /^\d+$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const POSITIVE_INTEGER = /^[1-9]\d{0,9}$/;

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const ok = (value) => ({ value, error: '' });
const fail = (error) => ({ value: '', error });

// Texto sin espacios en los extremos y con los espacios internos normalizados. Si no es texto, ''.
function cleanText(raw) {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.replace(/\s+/g, ' ').trim();
}

function validatePersonName(raw, { max, requiredMessage, invalidMessage }) {
  const text = cleanText(raw);
  if (!text) {
    return fail(requiredMessage);
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > max || !PERSON_NAME_PATTERN.test(text)) {
    return fail(invalidMessage);
  }
  return ok(text);
}

function validateName(raw) {
  return validatePersonName(raw, {
    max: PARTICIPANT_LIMITS.nombre,
    requiredMessage: 'Escribe tu nombre.',
    invalidMessage: 'Escribe un nombre válido (solo letras, máximo 40).',
  });
}

function validateSurnames(raw) {
  return validatePersonName(raw, {
    max: PARTICIPANT_LIMITS.apellidos,
    requiredMessage: 'Escribe tus apellidos.',
    invalidMessage: 'Escribe apellidos válidos (solo letras, máximo 40).',
  });
}

function validateEmail(raw) {
  const text = cleanText(raw).toLowerCase();
  if (!text) {
    return fail('Escribe tu correo electrónico.');
  }
  if (text.length > PARTICIPANT_LIMITS.correo || CONTROL_CHARS.test(text) || !EMAIL_PATTERN.test(text)) {
    return fail('Escribe un correo electrónico válido.');
  }
  return ok(text);
}

// El teléfono se guarda solo con dígitos: "(667) 123-4567" -> "6671234567".
function validatePhone(raw) {
  const digits = cleanText(raw).replace(PHONE_SEPARATORS, '');
  if (!digits) {
    return fail('Escribe tu número de teléfono.');
  }
  const validLength = digits.length >= PARTICIPANT_LIMITS.telefonoMin && digits.length <= PARTICIPANT_LIMITS.telefonoMax;
  if (!PHONE_DIGITS.test(digits) || !validLength) {
    return fail('Escribe un teléfono válido de al menos 10 dígitos.');
  }
  return ok(digits);
}

// Fecha en formato AAAA-MM-DD, real (no 31 de febrero), no futura y no más antigua que `edadMaxima` años.
function validateBirthDate(raw) {
  const text = cleanText(raw);
  const match = ISO_DATE.exec(text);
  if (!match) {
    return fail('Selecciona tu fecha de nacimiento.');
  }

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDate) {
    return fail('La fecha de nacimiento no es válida.');
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  if (date.getTime() > todayUtc) {
    return fail('La fecha de nacimiento no puede ser futura.');
  }
  if (year < now.getFullYear() - PARTICIPANT_LIMITS.edadMaxima) {
    return fail('La fecha de nacimiento no es válida.');
  }
  return ok(text);
}

// Identificador numérico de un catálogo (llega como número o como texto del <select>).
function validateCatalogId(raw, message) {
  const text = String(raw ?? '').trim();
  if (!POSITIVE_INTEGER.test(text) || Number(text) > MAX_UNSIGNED_INT) {
    return { value: null, error: message };
  }
  return { value: Number(text), error: '' };
}

function validateLocality(raw) {
  const text = cleanText(raw);
  if (!text) {
    return fail('Escribe tu localidad o comunidad.');
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > PARTICIPANT_LIMITS.localidadComunidad || !LOCALITY_PATTERN.test(text)) {
    return fail('Escribe una localidad o comunidad válida (máximo 120 caracteres).');
  }
  return ok(text);
}

function validateCountry(raw) {
  const text = cleanText(raw).toUpperCase();
  if (!COUNTRY_CODE.test(text)) {
    return fail('Selecciona tu país.');
  }
  return ok(text);
}

function validateCity(raw) {
  const text = cleanText(raw);
  if (!text) {
    return fail('Escribe tu ciudad o provincia.');
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > PARTICIPANT_LIMITS.ciudadProvincia || !LOCALITY_PATTERN.test(text)) {
    return fail('Escribe una ciudad o provincia válida (máximo 120 caracteres).');
  }
  return ok(text);
}

function validateInstitution(raw) {
  const text = cleanText(raw);
  if (!text) {
    return fail('Escribe el nombre de tu escuela o institución.');
  }
  if (text.length < MIN_TEXT_LENGTH || text.length > PARTICIPANT_LIMITS.institucionExterna || !INSTITUTION_PATTERN.test(text)) {
    return fail('Escribe un nombre de escuela o institución válido (máximo 150 caracteres).');
  }
  return ok(text);
}

// Unidad regional: un id del catálogo o la opción "Otros" (la persona no es de la UAS)
function validateUnit(raw) {
  if (String(raw ?? '').trim() === OTHER_INSTITUTION) {
    return ok(OTHER_INSTITUTION);
  }
  return validateCatalogId(raw, 'Selecciona tu unidad regional o elige Otros.');
}

const NOT_APPLICABLE = Object.freeze({ value: null, error: '' });
const skip = () => NOT_APPLICABLE;

// Devuelve la regla si el campo aplica; si no, una regla que lo deja en null sin error
const onlyIf = (applies, rule) => (applies && rule) || skip;

// Reglas de los campos que siempre se piden
const BASE_RULES = Object.freeze({
  nombre: validateName,
  apellidos: validateSurnames,
  correo: validateEmail,
  telefono: validatePhone,
  fechaNacimiento: validateBirthDate,
  codigoPais: validateCountry,
  localidadComunidad: validateLocality,
  idUnidadRegional: validateUnit,
});

// Reglas de los campos que dependen del país o de la unidad regional
const validateState = (raw) => validateCatalogId(raw, 'Selecciona tu estado.');
const validateMunicipality = (raw) => validateCatalogId(raw, 'Selecciona tu municipio.');
const validateSchool = (raw) => validateCatalogId(raw, 'Selecciona tu escuela o facultad.');

/**
 * Valida y normaliza los datos de la persona participante.
 *
 * @param {unknown} input Objeto con los campos de PARTICIPANT_FIELDS (valores sin confiar).
 * @returns {{ok: boolean, value: Record<string, string|number|null>, errors: Record<string, string>}}
 *   `value` trae cada campo ya normalizado (null si no aplica); `errors` solo tiene los campos con problema.
 */
export function validateParticipant(input) {
  const source = {};
  if (isPlainObject(input)) {
    Object.assign(source, input);
  }

  const value = {};
  const errors = {};
  const run = (key, rule) => {
    const result = rule(source[key]);
    value[key] = result.value;
    if (result.error) {
      errors[key] = result.error;
    }
  };

  for (const [key, rule] of Object.entries(BASE_RULES)) {
    run(key, rule);
  }

  // Ubicación: México pide estado y municipio; otro país, ciudad o provincia. Sin país válido no se pide nada más.
  const isMexico = value.codigoPais === MEXICO_CODE;
  const isForeign = value.codigoPais !== '' && !isMexico;
  run('idEstado', onlyIf(isMexico, validateState));
  run('idMunicipio', onlyIf(isMexico, validateMunicipality));
  run('ciudadProvincia', onlyIf(isForeign, validateCity));

  // Institución: una unidad de la UAS pide escuela; "Otros" pide el nombre de la institución.
  const isOther = value.idUnidadRegional === OTHER_INSTITUTION;
  const isUas = typeof value.idUnidadRegional === 'number';
  run('idEscuelaFacultad', onlyIf(isUas, validateSchool));
  run('institucionExterna', onlyIf(isOther, validateInstitution));

  // Se devuelven en el orden del formulario
  const ordered = {};
  for (const { key } of PARTICIPANT_FIELDS) {
    ordered[key] = value[key];
  }
  return { ok: Object.keys(errors).length === 0, value: ordered, errors };
}
