import { useState } from 'react';
import FormField from '../../components/form/FormField.jsx';
import { crearAdministrador } from '../adminApi.js';
import { ROLES } from '../constants.js';
import { errorMessage, fieldErrors } from '../errors.js';
import AdminSelect from '../components/AdminSelect.jsx';
import AlertMessage from '../components/AlertMessage.jsx';
import Modal from '../components/Modal.jsx';

const ROLE_OPTIONS = Object.entries(ROLES).map(([value, label]) => ({ value, label }));

// Formulario para dar de alta a un administrador.
export default function AdminForm({ onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', correo: '', rol: 'admin', contrasena: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const setField = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setErrors({});
    try {
      await crearAdministrador(form);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setErrors(fieldErrors(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="Nuevo administrador" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AlertMessage>{error}</AlertMessage>
        <FormField id="nombre" label="Nombre completo" value={form.nombre} error={errors.nombre} maxLength={100} required onChange={setField('nombre')} />
        <FormField id="correo" label="Correo" type="email" autoComplete="off" value={form.correo} error={errors.correo} maxLength={254} required onChange={setField('correo')} />
        <AdminSelect id="rol" label="Rol" value={form.rol} options={ROLE_OPTIONS} onChange={setField('rol')} />
        <FormField
          id="contrasena"
          label="Contraseña inicial"
          type="password"
          autoComplete="new-password"
          value={form.contrasena}
          error={errors.contrasena}
          maxLength={128}
          required
          onChange={setField('contrasena')}
        />
        <p className="text-xs text-muted">Mínimo 12 caracteres, con al menos tres tipos entre minúsculas, mayúsculas, números y símbolos. Compártela por un canal seguro; la persona puede cambiarla en Mi cuenta.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            Crear administrador
          </button>
        </div>
      </form>
    </Modal>
  );
}
