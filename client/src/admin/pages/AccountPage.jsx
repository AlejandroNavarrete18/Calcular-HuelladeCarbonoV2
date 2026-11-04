import { useState } from 'react';
import FormField from '../../components/form/FormField.jsx';
import { cambiarContrasena } from '../adminApi.js';
import { ROLES } from '../constants.js';
import { errorMessage, fieldErrors } from '../errors.js';
import AlertMessage from '../components/AlertMessage.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';

const EMPTY_FORM = Object.freeze({ actual: '', nueva: '', confirmar: '' });

// Datos de la cuenta que inició sesión y cambio de su propia contraseña.
export default function AccountPage({ admin }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const setField = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setErrors({});
    setDone(false);
    if (form.nueva !== form.confirmar) {
      setErrors({ confirmar: 'Las contraseñas no coinciden.' });
      return;
    }
    setBusy(true);
    try {
      await cambiarContrasena(form.actual, form.nueva);
      setForm(EMPTY_FORM);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
      setErrors(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Mi cuenta" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Datos">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">Nombre</dt>
              <dd>{admin.nombre}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">Correo</dt>
              <dd>{admin.correo}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-muted">Rol</dt>
              <dd>{ROLES[admin.rol]}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Cambiar contraseña">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <AlertMessage>{error}</AlertMessage>
            {done && <AlertMessage type="success">Contraseña actualizada. Las demás sesiones abiertas se cerraron.</AlertMessage>}
            <FormField id="actual" label="Contraseña actual" type="password" autoComplete="current-password" value={form.actual} error={errors.actual} maxLength={1024} required onChange={setField('actual')} />
            <FormField id="nueva" label="Contraseña nueva" type="password" autoComplete="new-password" value={form.nueva} error={errors.nueva} maxLength={128} required onChange={setField('nueva')} />
            <FormField id="confirmar" label="Repite la contraseña nueva" type="password" autoComplete="new-password" value={form.confirmar} error={errors.confirmar} maxLength={128} required onChange={setField('confirmar')} />
            <p className="text-xs text-muted">Mínimo 12 caracteres, con al menos tres tipos entre minúsculas, mayúsculas, números y símbolos.</p>
            <button type="submit" disabled={busy || !form.actual || !form.nueva} className="btn-primary">
              Cambiar contraseña
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
