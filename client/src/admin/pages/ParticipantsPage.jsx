import { useEffect, useRef, useState } from 'react';
import { Eye, Search, Send } from 'lucide-react';
import { LIST_STATUS } from '../../constants.js';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { fetchEscuelas, fetchUnidadesRegionales } from '../../services/catalogApi.js';
import { descargarExportacion, guardarArchivo, loaders, toQuery } from '../adminApi.js';
import { NIVELES, PAGE_SIZE } from '../constants.js';
import { errorMessage } from '../errors.js';
import { formatDateTime, formatInteger, formatKg } from '../format.js';
import { useResend } from '../useResend.js';
import AdminSelect from '../components/AdminSelect.jsx';
import AlertMessage from '../components/AlertMessage.jsx';
import Badge from '../components/Badge.jsx';
import Card from '../components/Card.jsx';
import DataState from '../components/DataState.jsx';
import DataTable from '../components/DataTable.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import FilterPanel from '../components/FilterPanel.jsx';
import LevelBadge from '../components/LevelBadge.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import ResendProgress from '../components/ResendProgress.jsx';
import ParticipantDetailModal from './ParticipantDetailModal.jsx';

const SEARCH_DELAY_MS = 350;

const ORDERS = Object.freeze({
  recientes: { orden: 'fecha', direccion: 'desc', label: 'Más recientes' },
  antiguas: { orden: 'fecha', direccion: 'asc', label: 'Más antiguas' },
  mayor: { orden: 'total', direccion: 'desc', label: 'Mayor huella' },
  menor: { orden: 'total', direccion: 'asc', label: 'Menor huella' },
  nombre: { orden: 'nombre', direccion: 'asc', label: 'Nombre (A a Z)' },
});

const EMPTY_FILTERS = Object.freeze({ busqueda: '', nivel: '', idUnidad: '', idEscuela: '', desde: '', hasta: '', correoEnviado: '' });

const ALL = [{ value: '', label: 'Todos' }];

// Valor del filtro de unidad para quienes no son de la UAS
const OTHER_UNIT = 'otros';

// Listado de participaciones con búsqueda, filtros, orden, detalle, reenvío de correo y exportación a Excel, PDF o CSV.
export default function ParticipantsPage({ admin }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchText, setSearchText] = useState('');
  const [order, setOrder] = useState('recientes');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [exporting, setExporting] = useState('');
  const [exportNotice, setExportNotice] = useState({ type: 'success', text: '' });
  const [finishedCount, setFinishedCount] = useState(0);
  const reloadRef = useRef(null);
  // Al terminar un reenvío se recarga el listado y se vuelve a abrir el detalle con el estado nuevo.
  const resend = useResend({
    onFinished: () => {
      reloadRef.current?.();
      setFinishedCount((current) => current + 1);
    },
  });

  // La búsqueda por texto espera a que la persona deje de escribir para no pedir datos en cada letra.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => {
        if (current.busqueda === searchText.trim()) {
          return current;
        }
        return { ...current, busqueda: searchText.trim() };
      });
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const listQuery = toQuery({ ...filters, pagina: page, porPagina: PAGE_SIZE, orden: ORDERS[order].orden, direccion: ORDERS[order].direccion });
  const { data, status, reload } = useRemoteData(loaders.participaciones, listQuery);
  useEffect(() => {
    reloadRef.current = reload;
  });

  const units = useRemoteData(fetchUnidadesRegionales, 'unidades', { emptyValue: [] });
  const isUasUnit = Boolean(filters.idUnidad) && filters.idUnidad !== OTHER_UNIT;
  const schools = useRemoteData(fetchEscuelas, filters.idUnidad, { enabled: isUasUnit, emptyValue: [] });

  const setFilter = (name) => (event) => {
    setFilters((current) => ({ ...current, [name]: event.target.value }));
    setPage(1);
  };
  const changeUnit = (event) => {
    setFilters((current) => ({ ...current, idUnidad: event.target.value, idEscuela: '' }));
    setPage(1);
  };
  async function handleExport(format) {
    setExporting(format);
    setExportNotice({ type: 'success', text: '' });
    try {
      // La exportación respeta los filtros y el orden que se ven en pantalla.
      const exportQuery = toQuery({ ...filters, orden: ORDERS[order].orden, direccion: ORDERS[order].direccion });
      const file = await descargarExportacion(exportQuery, format);
      guardarArchivo(file.blob, file.filename);
      let text = `Se descargó ${file.filename} con ${formatInteger(file.filas)} participaciones.`;
      if (file.truncado) {
        text += ' El archivo quedó incompleto por su tamaño máximo: usa filtros para acotar los datos o exporta por partes.';
      }
      setExportNotice({ type: 'success', text });
    } catch (err) {
      setExportNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setExporting('');
    }
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearchText('');
    setOrder('recientes');
    setPage(1);
  };

  const columns = [
    { key: 'fecha', header: 'Fecha', render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.creadoEn)}</span> },
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
    {
      key: 'escuela',
      header: 'Escuela o institución',
      render: (row) => (
        <>
          <p>{row.escuela}</p>
          <p className="text-xs text-muted">{row.unidad}</p>
        </>
      ),
    },
    { key: 'total', header: 'Huella', className: 'whitespace-nowrap', render: (row) => <strong className="text-navy-900">{formatKg(row.totalKg)}</strong> },
    { key: 'nivel', header: 'Nivel', render: (row) => <LevelBadge nivel={row.nivel} /> },
    {
      key: 'correo',
      header: 'Correo',
      render: (row) => {
        if (row.correoEnviado) {
          return <Badge tone="green">Enviado</Badge>;
        }
        return <Badge tone="yellow">Sin enviar</Badge>;
      },
    },
    {
      key: 'ver',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSelectedId(row.id)} aria-label={`Ver participación ${row.id}`} className="btn-ghost btn-sm">
            <Eye className="w-4 h-4" aria-hidden="true" />
            Ver
          </button>
          {!row.correoEnviado && (
            <button
              type="button"
              disabled={resend.running || resend.starting}
              onClick={() => resend.start({ modo: 'ids', ids: [row.id] })}
              aria-label={`Reenviar correo de la participación ${row.id}`}
              className="btn-ghost btn-sm"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              Reenviar
            </button>
          )}
        </div>
      ),
    },
  ];

  const unitOptions = [...ALL, ...units.data.map((unit) => ({ value: unit.id, label: unit.nombre })), { value: OTHER_UNIT, label: 'Otros (fuera de la UAS)' }];
  const schoolOptions = [...ALL, ...schools.data.map((school) => ({ value: school.id, label: school.nombre }))];
  const levelOptions = [...ALL, ...NIVELES.map((level) => ({ value: level.key, label: level.label }))];
  const mailOptions = [...ALL, { value: '1', label: 'Enviado' }, { value: '0', label: 'Sin enviar' }];
  const orderOptions = Object.entries(ORDERS).map(([value, item]) => ({ value, label: item.label }));

  const activeFilters = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <PageHeader title="Participaciones" description="Datos personales protegidos: cada consulta de detalle y cada exportación queda registrada en la bitácora.">
        <ExportMenu busyFormat={exporting} onExport={handleExport} />
      </PageHeader>

      {exportNotice.text && (
        <div className="mb-4">
          <AlertMessage type={exportNotice.type}>{exportNotice.text}</AlertMessage>
        </div>
      )}
      {resend.error && (
        <div className="mb-4">
          <AlertMessage>{resend.error}</AlertMessage>
        </div>
      )}
      {resend.job && (
        <div className="mb-4">
          <ResendProgress job={resend.job} onDismiss={resend.dismiss} />
        </div>
      )}

      <Card flush className="mb-6">
        <FilterPanel activeCount={activeFilters}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label htmlFor="busqueda" className="field-label">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                <input
                  id="busqueda"
                  type="search"
                  value={searchText}
                  maxLength={100}
                  placeholder="Nombre, correo o teléfono"
                  onChange={(event) => setSearchText(event.target.value)}
                  className="field-input !pl-9"
                />
              </div>
            </div>
            <AdminSelect id="nivel" label="Nivel" value={filters.nivel} options={levelOptions} onChange={setFilter('nivel')} />
            <AdminSelect id="correoEnviado" label="Correo" value={filters.correoEnviado} options={mailOptions} onChange={setFilter('correoEnviado')} />
            <AdminSelect id="idUnidad" label="Unidad regional" value={filters.idUnidad} options={unitOptions} onChange={changeUnit} disabled={units.status !== LIST_STATUS.READY} />
            <AdminSelect
              id="idEscuela"
              label="Escuela o facultad"
              value={filters.idEscuela}
              options={schoolOptions}
              onChange={setFilter('idEscuela')}
              disabled={!isUasUnit || schools.status !== LIST_STATUS.READY}
            />
            <div className="min-w-0">
              <label htmlFor="desde" className="field-label">
                Desde
              </label>
              <input id="desde" type="date" value={filters.desde} max={filters.hasta || undefined} onChange={setFilter('desde')} className="field-input" />
            </div>
            <div className="min-w-0">
              <label htmlFor="hasta" className="field-label">
                Hasta
              </label>
              <input id="hasta" type="date" value={filters.hasta} min={filters.desde || undefined} onChange={setFilter('hasta')} className="field-input" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <AdminSelect
              id="orden"
              label="Ordenar por"
              value={order}
              options={orderOptions}
              onChange={(event) => {
                setOrder(event.target.value);
                setPage(1);
              }}
              className="sm:min-w-56"
            />
            <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        </FilterPanel>
      </Card>

      <Card flush>
        <DataState status={status} onRetry={reload}>
          {data && (
            <>
              <DataTable columns={columns} rows={data.items} rowKey={(row) => row.id} emptyText="No hay participaciones con estos filtros." />
              {data.total > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} />}
            </>
          )}
        </DataState>
      </Card>

      {selectedId && (
        <ParticipantDetailModal
          key={`${selectedId}-${finishedCount}`}
          id={selectedId}
          canDelete={admin.rol === 'superadmin'}
          resend={resend}
          onClose={() => setSelectedId(null)}
          onDeleted={() => {
            setSelectedId(null);
            reload();
          }}
        />
      )}
    </>
  );
}
