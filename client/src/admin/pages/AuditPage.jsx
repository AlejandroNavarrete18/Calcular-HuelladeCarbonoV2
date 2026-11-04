import { useState } from 'react';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { loaders, toQuery } from '../adminApi.js';
import { ACCIONES_BITACORA, PAGE_SIZE } from '../constants.js';
import { formatDateTime } from '../format.js';
import AdminSelect from '../components/AdminSelect.jsx';
import Card from '../components/Card.jsx';
import DataState from '../components/DataState.jsx';
import DataTable from '../components/DataTable.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';

function describeValue(value) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// Texto corto con el detalle guardado de un movimiento (nunca contiene contraseñas).
function describeDetail(detalle) {
  if (!detalle) {
    return '';
  }
  return Object.entries(detalle)
    .map(([name, value]) => `${name}: ${describeValue(value)}`)
    .join(' · ');
}

const COLUMNS = [
  { key: 'fecha', header: 'Fecha', render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.creadoEn)}</span> },
  {
    key: 'administrador',
    header: 'Administrador',
    mobileTitle: true,
    render: (row) => {
      if (!row.administrador) {
        return <span className="text-muted">Sistema o desconocido</span>;
      }
      return (
        <>
          <p className="font-semibold">{row.administrador}</p>
          <p className="text-xs text-muted">{row.correoAdministrador}</p>
        </>
      );
    },
  },
  { key: 'accion', header: 'Acción', render: (row) => ACCIONES_BITACORA[row.accion] ?? row.accion },
  {
    key: 'objeto',
    header: 'Objeto',
    render: (row) => {
      if (!row.entidad) {
        return <span className="text-muted">—</span>;
      }
      return `${row.entidad} #${row.idEntidad ?? ''}`;
    },
  },
  { key: 'detalle', header: 'Detalle', render: (row) => <span className="break-words text-xs text-muted">{describeDetail(row.detalle)}</span> },
  { key: 'ip', header: 'IP', render: (row) => <span className="whitespace-nowrap text-xs">{row.ip ?? '—'}</span> },
];

// Registro de lo que hace cada administrador (solo superadmin).
export default function AuditPage() {
  const [accion, setAccion] = useState('');
  const [page, setPage] = useState(1);
  const { data, status, reload } = useRemoteData(loaders.bitacora, toQuery({ accion, pagina: page, porPagina: PAGE_SIZE }));

  const options = [{ value: '', label: 'Todas' }, ...(data?.acciones ?? []).map((value) => ({ value, label: ACCIONES_BITACORA[value] ?? value }))];

  return (
    <>
      <PageHeader title="Bitácora" description="Inicios de sesión, consultas de datos personales, exportaciones y cambios. Solo se puede consultar: nadie puede editarla desde el panel." />
      <Card flush>
        <div className="max-w-xs p-4 sm:p-5">
          <AdminSelect
            id="accion"
            label="Acción"
            value={accion}
            options={options}
            onChange={(event) => {
              setAccion(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <DataState status={status} onRetry={reload}>
          {data && (
            <>
              <DataTable columns={COLUMNS} rows={data.items} rowKey={(row) => row.id} emptyText="No hay movimientos registrados." />
              {data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
            </>
          )}
        </DataState>
      </Card>
    </>
  );
}
