import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { actualizarCuentaCorreo, loaders } from '../adminApi.js';
import { errorMessage } from '../errors.js';
import { formatDateTime, formatInteger } from '../format.js';
import ActionLink from '../components/ActionLink.jsx';
import AlertMessage from '../components/AlertMessage.jsx';
import Badge from '../components/Badge.jsx';
import Card from '../components/Card.jsx';
import DataState from '../components/DataState.jsx';
import DataTable from '../components/DataTable.jsx';
import MailAccountForm from './MailAccountForm.jsx';

const PAUSE_ACTION = Object.freeze({
  0: { tone: 'blue', label: 'Activar' },
  1: { tone: 'red', label: 'Pausar' },
});

// Estado de una cuenta a partir de sus datos; el orden de las condiciones importa.
function accountState(account) {
  if (!account.activo) {
    return { tone: 'gray', label: 'Pausada' };
  }
  if (account.bloqueada) {
    return { tone: 'red', label: 'Bloqueada temporalmente' };
  }
  if (account.enviadosHoy >= account.limiteDiario) {
    return { tone: 'yellow', label: 'Límite de hoy alcanzado' };
  }
  return { tone: 'green', label: 'Activa' };
}

// Cuentas de Gmail con su uso del día. Solo el superadmin puede agregarlas o modificarlas.
export default function MailAccountsTab({ canEdit }) {
  const { data, status, reload } = useRemoteData(loaders.cuentasCorreo, 'cuentas', { emptyValue: [] });
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function togglePause(account) {
    setError('');
    try {
      await actualizarCuentaCorreo(account.id, { activo: !account.activo });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const columns = [
    {
      key: 'cuenta',
      header: 'Cuenta',
      mobileTitle: true,
      render: (row) => (
        <>
          <p className="break-all font-semibold text-ink">{row.correo}</p>
          {row.nombreRemitente && <p className="text-xs text-muted">{row.nombreRemitente}</p>}
        </>
      ),
    },
    { key: 'prioridad', header: 'Prioridad', render: (row) => row.prioridad },
    {
      key: 'uso',
      header: 'Uso de hoy',
      render: (row) => (
        <span className="whitespace-nowrap">
          {formatInteger(row.enviadosHoy)} de {formatInteger(row.limiteDiario)}
        </span>
      ),
    },
    { key: 'total', header: 'Total enviados', render: (row) => formatInteger(row.totalEnviados) },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => {
        const state = accountState(row);
        return <Badge tone={state.tone}>{state.label}</Badge>;
      },
    },
    {
      key: 'error',
      header: 'Último error',
      render: (row) => {
        if (!row.ultimoError) {
          return <span className="text-muted">Ninguno</span>;
        }
        return (
          <>
            <p className="text-xs text-red-700 max-w-xs break-words">{row.ultimoError}</p>
            <p className="text-xs text-muted">{formatDateTime(row.ultimoErrorEn)}</p>
          </>
        );
      },
    },
  ];

  if (canEdit) {
    columns.push({
      key: 'acciones',
      header: '',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <ActionLink onClick={() => setEditing(row)}>Editar</ActionLink>
          <ActionLink tone={PAUSE_ACTION[row.activo].tone} onClick={() => togglePause(row)}>
            {PAUSE_ACTION[row.activo].label}
          </ActionLink>
        </div>
      ),
    });
  }

  return (
    <>
      <Card
        flush
        title="Cuentas de envío"
        action={
          canEdit && (
            <button type="button" className="btn-primary btn-sm" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar cuenta
            </button>
          )
        }
      >
        {error && (
          <div className="p-4 sm:p-5">
            <AlertMessage>{error}</AlertMessage>
          </div>
        )}
        <DataState status={status} onRetry={reload}>
          <DataTable columns={columns} rows={data} rowKey={(row) => row.id} emptyText="No hay cuentas de correo. Sin ellas no se pueden enviar resultados." />
          {data.length > 0 && (
            <p className="border-t border-navy-100 bg-navy-50 px-4 py-3 text-sm font-semibold text-navy-900 sm:px-5">
              Total enviado entre todas las cuentas: {formatInteger(data.reduce((sum, account) => sum + account.totalEnviados, 0))}
            </p>
          )}
        </DataState>
      </Card>

      {(creating || editing) && (
        <MailAccountForm
          account={editing ?? undefined}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}
