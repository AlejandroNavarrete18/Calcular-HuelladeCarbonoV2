import AlertMessage from './AlertMessage.jsx';
import Modal from './Modal.jsx';

// Pide confirmación antes de una acción que no se puede deshacer.
export default function ConfirmDialog({ title, message, confirmLabel, busy = false, error = '', danger = false, onConfirm, onCancel }) {
  let confirmClass = 'btn-primary';
  if (danger) {
    confirmClass = 'btn-danger';
  }
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-sm text-ink">{message}</p>
      <div className="mt-4">
        <AlertMessage>{error}</AlertMessage>
      </div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={busy} className="btn-ghost">
          Cancelar
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={confirmClass}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
