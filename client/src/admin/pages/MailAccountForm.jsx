import { useState } from 'react';
import FormField from '../../components/form/FormField.jsx';
import { actualizarCuentaCorreo, crearCuentaCorreo } from '../adminApi.js';
import { errorMessage, fieldErrors } from '../errors.js';
import AlertMessage from '../components/AlertMessage.jsx';
import Modal from '../components/Modal.jsx';

/**
 * Formulario para agregar o editar una cuenta de Gmail.
 * Al editar, la contraseña de aplicación se deja vacía para conservar la actual; nunca se muestra la guardada.
 *
 * @param {{account?: object, onClose: () => void, onSaved: () => void}} props
 */
export default function MailAccountForm({ account, onClose, onSaved }) {
  const editing = Boolean(account);
  const [form, setForm] = useState({
    correo: account?.correo ?? '',
    nombreRemitente: account?.nombreRemitente ?? '',
    prioridad: account?.prioridad ?? 100,
    limiteDiario: account?.limiteDiario ?? 400,
    contrasenaApp: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const setField = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setErrors({});
    const common = {
      nombreRemitente: form.nombreRemitente,
      prioridad: Number(form.prioridad),
      limiteDiario: Number(form.limiteDiario),
    };
    try {
      if (editing) {
        const changes = { ...common };
        if (form.contrasenaApp) {
          changes.contrasenaApp = form.contrasenaApp;
        }
        await actualizarCuentaCorreo(account.id, changes);
      } else {
        await crearCuentaCorreo({ ...common, correo: form.correo, contrasenaApp: form.contrasenaApp });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setErrors(fieldErrors(err));
      setBusy(false);
    }
  }

  let passwordLabel = 'Contraseña de aplicación';
  let title = 'Agregar cuenta de Gmail';
  if (editing) {
    passwordLabel = 'Contraseña de aplicación nueva (opcional)';
    title = `Editar ${account.correo}`;
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AlertMessage>{error}</AlertMessage>
        {!editing && <FormField id="correo" label="Correo de Gmail" type="email" value={form.correo} error={errors.correo} maxLength={254} required onChange={setField('correo')} />}
        <FormField id="nombreRemitente" label="Nombre del remitente (opcional)" value={form.nombreRemitente} error={errors.nombreRemitente} maxLength={100} onChange={setField('nombreRemitente')} />
        <FormField
          id="contrasenaApp"
          label={passwordLabel}
          type="password"
          autoComplete="new-password"
          value={form.contrasenaApp}
          error={errors.contrasenaApp}
          maxLength={80}
          required={!editing}
          onChange={setField('contrasenaApp')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="prioridad" label="Prioridad (menor se usa primero)" type="number" min={1} max={65535} value={form.prioridad} error={errors.prioridad} onChange={setField('prioridad')} />
          <FormField id="limiteDiario" label="Límite de envíos por día" type="number" min={1} max={100000} value={form.limiteDiario} error={errors.limiteDiario} onChange={setField('limiteDiario')} />
        </div>
        <p className="text-xs text-muted">La contraseña se guarda cifrada y no se puede volver a ver. Es la contraseña de aplicación de 16 letras que genera Google.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </Modal>
  );
}
