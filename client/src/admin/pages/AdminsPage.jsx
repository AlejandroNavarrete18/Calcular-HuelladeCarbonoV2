import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { actualizarAdministrador, loaders } from '../adminApi.js';
import { ROLES } from '../constants.js';
import { errorMessage } from '../errors.js';
import { formatDateTime } from '../format.js';
import ActionLink from '../components/ActionLink.jsx';
import AlertMessage from '../components/AlertMessage.jsx';
import Badge from '../components/Badge.jsx';
import Card from '../components/Card.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataState from '../components/DataState.jsx';
import DataTable from '../components/DataTable.jsx';
import PageHeader from '../components/PageHeader.jsx';
import AdminForm from './AdminForm.jsx';
import ResetPasswordModal from './ResetPasswordModal.jsx';

const TOGGLE_ACTIVE = Object.freeze({
  0: { label: 'Reactivar', tone: 'blue', next: true },
  1: { label: 'Desactivar', tone: 'red', next: false },
});

// Alta, cambio de rol y desactivación de administradores (solo superadmin).
export default function AdminsPage({ admin }) {
  const { data, status, reload } = useRemoteData(loaders.administradores, 'administradores', { emptyValue: [] });
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');

  async function applyChange(target, changes, { fromDialog = false } = {}) {
    setBusy(true);
    setError('');
    setDialogError('');
    try {
      await actualizarAdministrador(target.id, changes);
      setConfirming(null);
      reload();
    } catch (err) {
      if (fromDialog) {
        setDialogError(errorMessage(err));
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: 'persona',
      header: 'Persona',
      mobileTitle: true,
      render: (row) => (
        <>
          <p className="font-semibold text-ink">{row.nombre}</p>
          <p className="break-all text-xs text-muted">{row.correo}</p>
        </>
      ),
    },
    { key: 'rol', header: 'Rol', render: (row) => <Badge tone="blue">{ROLES[row.rol]}</Badge> },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => {
        if (!row.activo) {
          return <Badge tone="gray">Desactivado</Badge>;
        }
        if (row.bloqueado) {
          return <Badge tone="red">Bloqueado por intentos</Badge>;
        }
        return <Badge tone="green">Activo</Badge>;
      },
    },
    { key: 'acceso', header: 'Último acceso', render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.ultimoAcceso)}</span> },
    {
      key: 'acciones',
      header: '',
      render: (row) => {
        if (row.id === admin.id) {
          return <span className="text-xs text-muted">Tu cuenta</span>;
        }
        const toggle = TOGGLE_ACTIVE[row.activo];
        const otherRole = { superadmin: 'admin', admin: 'superadmin' }[row.rol];
        return (
          <div className="flex flex-col items-start gap-1">
            <ActionLink onClick={() => setResetting(row)}>Restablecer contraseña</ActionLink>
            <ActionLink onClick={() => setConfirming({ target: row, changes: { rol: otherRole }, title: 'Cambiar rol', text: `${row.nombre} pasará a ser ${ROLES[otherRole]}.` })}>
              Hacerlo {ROLES[otherRole].toLowerCase()}
            </ActionLink>
            <ActionLink
              tone={toggle.tone}
              onClick={() => setConfirming({ target: row, changes: { activo: toggle.next }, title: toggle.label, text: `${toggle.label} la cuenta de ${row.nombre}. Si se desactiva, sus sesiones se cierran al instante.` })}
            >
              {toggle.label}
            </ActionLink>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader title="Administradores" description="Quién puede entrar al panel. Los cambios cierran las sesiones abiertas de la persona afectada.">
        <button type="button" className="btn-primary btn-sm" onClick={() => setCreating(true)}>
          <UserPlus className="w-4 h-4" aria-hidden="true" />
          Nuevo administrador
        </button>
      </PageHeader>

      <Card flush>
        {error && (
          <div className="p-4 sm:p-5">
            <AlertMessage>{error}</AlertMessage>
          </div>
        )}
        <DataState status={status} onRetry={reload}>
          <DataTable columns={columns} rows={data} rowKey={(row) => row.id} />
        </DataState>
      </Card>

      {creating && (
        <AdminForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
          }}
        />
      )}
      {resetting && <ResetPasswordModal administrator={resetting} onClose={() => setResetting(null)} onSaved={() => setResetting(null)} />}
      {confirming && (
        <ConfirmDialog
          title={confirming.title}
          message={confirming.text}
          confirmLabel="Confirmar"
          busy={busy}
          error={dialogError}
          onConfirm={() => applyChange(confirming.target, confirming.changes, { fromDialog: true })}
          onCancel={() => {
            setConfirming(null);
            setDialogError('');
          }}
        />
      )}
    </>
  );
}
