import { useCallback, useMemo, useState } from 'react';
import { PARTICIPANT_FIELDS, validateParticipant } from '@huella/shared';

const EMPTY_FORM = Object.freeze({
  nombre: '',
  apellidos: '',
  correo: '',
  telefono: '',
  fechaNacimiento: '',
  codigoPais: '',
  idEstado: '',
  idMunicipio: '',
  ciudadProvincia: '',
  localidadComunidad: '',
  idUnidadRegional: '',
  idEscuelaFacultad: '',
  institucionExterna: '',
  website: '', // campo trampa (honeypot): las personas no lo ven ni lo llenan
});

// Al cambiar un campo, los que dependen de él dejan de ser válidos y se vacían
const DEPENDENTS = Object.freeze({
  codigoPais: ['idEstado', 'idMunicipio'],
  idEstado: ['idMunicipio'],
  idUnidadRegional: ['idEscuelaFacultad'],
});

/**
 * Estado y validación del formulario final. Usa las mismas reglas que el servidor
 *  - "isValid" es false mientras falte o esté mal cualquier campo (la pantalla bloquea el envío).
 *  - "errors" solo trae los campos que la persona ya tocó, para no mostrar todo en rojo desde el inicio.
 *  - "missingLabels" lista siempre lo que falta para el aviso.
 */
export function useParticipantForm() {
  const [values, setValues] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});

  const validation = useMemo(() => validateParticipant(values), [values]);

  const setField = useCallback((name, value) => {
    const dependents = DEPENDENTS[name] ?? [];
    setValues((previous) => {
      const next = { ...previous, [name]: value };
      for (const dependent of dependents) {
        next[dependent] = '';
      }
      return next;
    });
    if (dependents.length > 0) {
      setTouched((previous) => ({ ...previous, ...Object.fromEntries(dependents.map((dependent) => [dependent, false])) }));
    }
  }, []);

  const touchField = useCallback((name) => {
    setTouched((previous) => ({ ...previous, [name]: true }));
  }, []);

  const errors = {};
  const missingLabels = [];
  for (const { key, label } of PARTICIPANT_FIELDS) {
    if (validation.errors[key]) {
      missingLabels.push(label);
      if (touched[key]) {
        errors[key] = validation.errors[key];
      }
    }
  }

  /**
   * Datos listos para enviar al servidor junto con las respuestas del cuestionario.
   * "cuestionarioVersion" permite al servidor avisar si el cuestionario cambió mientras la persona contestaba.
   */
  const buildPayload = useCallback(
    (answers, cuestionarioVersion) => ({ ...validation.value, answers, cuestionarioVersion, website: values.website }),
    [validation, values.website]
  );

  return {
    values,
    errors,
    missingLabels,
    isValid: validation.ok,
    setField,
    touchField,
    buildPayload,
  };
}
