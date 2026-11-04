import { useState } from 'react';
import FormField from '../../components/form/FormField.jsx';
import { restablecerContrasena } from '../adminApi.js';
import { errorMessage, fieldErrors } from '../errors.js';
import AlertMessage from '../components/AlertMessage.jsx';
import Modal from '../components/Modal.jsx';

// Asigna una contraseña nueva a otro administrador y cierra sus sesiones abiertas.
export default function ResetPasswordModal({ administrator, onClose, onSaved }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setErrors({});
    try {
      await restablecerContrasena(administrator.id, password);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setErrors(fieldErrors(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={`Restablecer contraseña de ${administrator.nombre}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AlertMessage>{error}</AlertMessage>
        <FormField
          id="contrasena"
          label="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          value={password}
          error={errors.contrasena}
          maxLength={128}
          required
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-xs text-muted">Se cerrarán todas sus sesiones abiertas y también se desbloqueará la cuenta.</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            Restablecer
          </button>
        </div>
      </form>
    </Modal>
  );
}
