import { useEffect, useState } from 'react';
import { Search, Send } from 'lucide-react';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { loaders, toQuery } from '../adminApi.js';
import { PAGE_SIZE, TIPOS_ERROR_CORREO } from '../constants.js';
import { formatDateTime, formatInteger } from '../format.js';
import AlertMessage from '../components/AlertMessage.jsx';
import Card from '../components/Card.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataState from '../components/DataState.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';

const SEARCH_DELAY_MS = 350;

// Participaciones cuyo correo no salió, con el motivo del último intento. Permite reenviar a quien se elija o a todos.
export default function MailPendingTab({ resend }) {
  const [searchText, setSearchText] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [confirmAll, setConfirmAll] = useState(false);
  const { data, status, reload } = useRemoteData(loaders.pendientesCorreo, toQuery({ busqueda, pagina: page, porPagina: PAGE_SIZE }));

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(searchText.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const rows = data?.items ?? [];
  const busy = resend.running || resend.starting;

  function toggleRow(row) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return next;
    });
  }

  // Marca o desmarca todas las filas de la página actual.
  function toggleAll() {
    setSelected((current) => {
      const next = new Set(current);
      const allMarked = rows.every((row) => next.has(row.id));
      for (const row of rows) {
        if (allMarked) {
          next.delete(row.id);
        } else {
          next.add(row.id);
        }
      }
      return next;
    });
  }

  async function resendSelected() {
    const started = await resend.start({ modo: 'ids', ids: [...selected] });
    if (started) {
      setSelected(new Set());
    }
  }

  async function resendAll() {
    const started = await resend.start({ modo: 'pendientes' });
    if (started) {
      setConfirmAll(false);
      setSelected(new Set());
    }
  }

  const columns = [
    {
      key: 'persona',
      header: 'Persona',
      mobileTitle: true,
      render: (row) => (
        <>
          <p className="font-semibold text-ink">
            {row.nombre} {row.apellidos}
          </p>
          <p className="break-all text-xs text-muted">{row.correo}</p>
        </>
      ),
    },
    { key: 'fecha', header: 'Participó', render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.creadoEn)}</span> },
    {
      key: 'intentos',
      header: 'Intentos',
      render: (row) => {
        if (row.intentos === 0) {
          return <span className="text-muted">Sin intentos</span>;
        }
        return `${formatInteger(row.intentos)}`;
      },
    },
    {
      key: 'motivo',
      header: 'Último fallo',
      render: (row) => {
        if (!row.ultimoTipoError) {
          return <span className="text-muted">—</span>;
        }
        return (
          <>
            <p className="font-semibold">{TIPOS_ERROR_CORREO[row.ultimoTipoError]}</p>
            <p className="text-xs text-muted">{formatDateTime(row.ultimoIntentoEn)}</p>
          </>
        );
      },
    },
    {
      key: 'acciones',
      header: '',
      render: (row) => (
        <button type="button" disabled={busy} onClick={() => resend.start({ modo: 'ids', ids: [row.id] })} className="btn-ghost btn-sm">
          <Send className="w-4 h-4" aria-hidden="true" />
          Reenviar
        </button>
      ),
    },
  ];

  return (
    <>
      <Card
        flush
        title="Correos pendientes de enviar"
        action={
          <div className="flex w-full flex-col gap-2 min-[480px]:w-auto min-[480px]:flex-row">
            <button type="button" className="btn-ghost btn-sm" disabled={busy || selected.size === 0} onClick={resendSelected}>
              <Send className="w-4 h-4" aria-hidden="true" />
              Reenviar elegidos ({selected.size})
            </button>
            <button type="button" className="btn-primary btn-sm" disabled={busy || !data || data.total === 0} onClick={() => setConfirmAll(true)}>
              <Send className="w-4 h-4" aria-hidden="true" />
              Reenviar todos{data && ` (${formatInteger(data.total)})`}
            </button>
          </div>
        }
      >
        <div className="space-y-3 border-b border-navy-100 p-4 sm:p-5">
          <p className="text-sm text-muted">
            Son personas que participaron pero a las que no les llegó su correo (por ejemplo, porque se agotaron los envíos del día). Al reenviar se usan las cuentas con cupo disponible.
          </p>
          <AlertMessage>{resend.error}</AlertMessage>
          <div className="relative max-w-md">
            <label htmlFor="busqueda-pendientes" className="field-label">
              Buscar
            </label>
            <Search className="pointer-events-none absolute bottom-3.5 left-3 w-4 h-4 text-muted" aria-hidden="true" />
            <input
              id="busqueda-pendientes"
              type="search"
              value={searchText}
              maxLength={100}
              placeholder="Nombre o correo"
              onChange={(event) => setSearchText(event.target.value)}
              className="field-input !pl-9"
            />
          </div>
        </div>
        <DataState status={status} onRetry={reload}>
          {data && (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                emptyText="No hay correos pendientes. Todos los participantes recibieron sus resultados."
                selection={{ selected, onToggle: toggleRow, onToggleAll: toggleAll }}
              />
              {data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
            </>
          )}
        </DataState>
      </Card>

      {confirmAll && (
        <ConfirmDialog
          title="Reenviar todos los pendientes"
          message={`Se enviará el correo de resultados a ${formatInteger(data?.total ?? 0)} personas, usando las cuentas con cupo disponible hoy. Si el cupo se acaba, el envío se detiene y el resto sigue pendiente. ¿Continuar?`}
          confirmLabel="Reenviar"
          busy={resend.starting}
          error={resend.error}
          onConfirm={resendAll}
          onCancel={() => setConfirmAll(false)}
        />
      )}
    </>
  );
}
