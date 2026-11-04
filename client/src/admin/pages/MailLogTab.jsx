import { useEffect, useState } from 'react';
import { Search, Send } from 'lucide-react';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { loaders, toQuery } from '../adminApi.js';
import { PAGE_SIZE, TIPOS_ERROR_CORREO } from '../constants.js';
import { formatDateTime } from '../format.js';
import AdminSelect from '../components/AdminSelect.jsx';
import Badge from '../components/Badge.jsx';
import Card from '../components/Card.jsx';
import DataState from '../components/DataState.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';

const SEARCH_DELAY_MS = 350;
const STATE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'fallido', label: 'Fallidos' },
];
const ERROR_OPTIONS = [{ value: '', label: 'Todos' }, ...Object.entries(TIPOS_ERROR_CORREO).map(([value, label]) => ({ value, label }))];

// Bitácora de correos: cada envío (o intento fallido) de resultados. Un fallo cuya persona sigue sin correo se puede reenviar.
export default function MailLogTab({ resend }) {
  const [filters, setFilters] = useState({ estado: '', tipoError: '' });
  const [searchText, setSearchText] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(1);
  const { data, status, reload } = useRemoteData(loaders.envios, toQuery({ ...filters, busqueda, pagina: page, porPagina: PAGE_SIZE }));
  const busy = resend.running || resend.starting;

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(searchText.trim());
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const setFilter = (name) => (event) => {
    setFilters((current) => ({ ...current, [name]: event.target.value }));
    setPage(1);
  };

  const columns = [
    { key: 'destinatario', header: 'Destinatario', mobileTitle: true, render: (row) => <span className="break-all">{row.destinatario}</span> },
    { key: 'fecha', header: 'Fecha', render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.creadoEn)}</span> },
    { key: 'remitente', header: 'Cuenta de envío', render: (row) => <span className="break-all">{row.remitente}</span> },
    {
      key: 'estado',
      header: 'Estado',
      render: (row) => {
        if (row.estado === 'enviado') {
          return <Badge tone="green">Enviado</Badge>;
        }
        return <Badge tone="red">Fallido</Badge>;
      },
    },
    {
      key: 'motivo',
      header: 'Motivo del fallo',
      render: (row) => {
        if (!row.tipoError) {
          return <span className="text-muted">—</span>;
        }
        return (
          <>
            <p className="font-semibold">{TIPOS_ERROR_CORREO[row.tipoError]}</p>
            {row.mensajeError && <p className="max-w-xs break-words text-xs text-muted">{row.mensajeError}</p>}
          </>
        );
      },
    },
    {
      key: 'acciones',
      header: '',
      render: (row) => {
        // Solo se ofrece reenviar si la persona sigue sin recibir su correo.
        if (row.estado !== 'fallido' || row.participacionEnviada !== 0) {
          return null;
        }
        return (
          <button type="button" disabled={busy} onClick={() => resend.start({ modo: 'ids', ids: [row.idParticipacion] })} className="btn-ghost btn-sm">
            <Send className="w-4 h-4" aria-hidden="true" />
            Reenviar
          </button>
        );
      },
    },
  ];

  return (
    <Card flush title="Correos enviados y fallidos">
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        <div className="relative">
          <label htmlFor="busqueda-envios" className="field-label">
            Buscar
          </label>
          <Search className="pointer-events-none absolute bottom-3.5 left-3 w-4 h-4 text-muted" aria-hidden="true" />
          <input id="busqueda-envios" type="search" value={searchText} maxLength={100} placeholder="Destinatario o cuenta" onChange={(event) => setSearchText(event.target.value)} className="field-input !pl-9" />
        </div>
        <AdminSelect id="estado" label="Estado" value={filters.estado} options={STATE_OPTIONS} onChange={setFilter('estado')} />
        <AdminSelect id="tipoError" label="Tipo de fallo" value={filters.tipoError} options={ERROR_OPTIONS} onChange={setFilter('tipoError')} />
      </div>
      <DataState status={status} onRetry={reload}>
        {data && (
          <>
            <DataTable columns={columns} rows={data.items} rowKey={(row) => row.id} emptyText="No hay correos con estos filtros." />
            {data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
          </>
        )}
      </DataState>
    </Card>
  );
}
