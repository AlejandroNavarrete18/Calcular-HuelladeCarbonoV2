import { useState } from 'react';
import { BarChart3, Gauge, Mail, Users } from 'lucide-react';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { loaders, toQuery } from '../adminApi.js';
import { NIVEL_POR_CLAVE } from '../constants.js';
import { formatInteger, formatKg } from '../format.js';
import BarList from '../components/BarList.jsx';
import Card from '../components/Card.jsx';
import DailyChart from '../components/DailyChart.jsx';
import DataState from '../components/DataState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import FormField from '../../components/form/FormField.jsx';

const EMPTY_FILTERS = Object.freeze({ desde: '', hasta: '' });

// Estadísticas generales de las participaciones, con filtro opcional por fechas.
export default function DashboardPage({ onNavigate }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const { data, status, reload } = useRemoteData(loaders.resumen, toQuery(filters));
  const hasFilters = Boolean(filters.desde || filters.hasta);

  const setFilter = (name) => (event) => setFilters((current) => ({ ...current, [name]: event.target.value }));

  return (
    <>
      <PageHeader title="Resumen" description="Participaciones y huella promedio. Los filtros de fecha afectan a todas las gráficas." />

      <div className="mb-6 grid grid-cols-2 items-end gap-3 sm:grid-cols-[repeat(2,minmax(0,12rem))_auto]">
        <FormField id="desde" label="Desde" type="date" value={filters.desde} max={filters.hasta || undefined} onChange={setFilter('desde')} className="min-w-0" />
        <FormField id="hasta" label="Hasta" type="date" value={filters.hasta} min={filters.desde || undefined} onChange={setFilter('hasta')} className="min-w-0" />
        {hasFilters && (
          <button type="button" className="btn-ghost btn-sm col-span-2 sm:col-span-1" onClick={() => setFilters(EMPTY_FILTERS)}>
            Quitar filtros
          </button>
        )}
      </div>

      <DataState status={status} onRetry={reload}>
        {data && <Content data={data} onNavigate={onNavigate} />}
      </DataState>
    </>
  );
}

function Content({ data, onNavigate }) {
  const { totales, niveles, porDia, porUnidad, topEscuelas, correo } = data;
  let mailRate = 0;
  if (totales.participaciones > 0) {
    mailRate = Math.round((totales.correosEnviados / totales.participaciones) * 100);
  }

  const levelItems = niveles.map((item) => ({
    key: item.nivel,
    label: NIVEL_POR_CLAVE[item.nivel].label,
    value: item.total,
    barClass: NIVEL_POR_CLAVE[item.nivel].bar,
  }));
  const categoryItems = [
    { key: 'hogar', label: 'Hogar', value: totales.promedioHogar },
    { key: 'transporte', label: 'Transporte', value: totales.promedioTransporte },
    { key: 'consumo', label: 'Alimentación y consumo', value: totales.promedioConsumo },
  ].map((item) => ({ ...item, detail: 'kg CO₂' }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard accent="navy" icon={Users} label="Participaciones" value={formatInteger(totales.participaciones)} />
        <StatCard accent="gold" icon={Gauge} label="Huella promedio" value={formatKg(totales.promedioTotal)} hint={`Mínimo ${formatKg(totales.minimo)} · máximo ${formatKg(totales.maximo)}`} />
        <StatCard
          accent="green"
          icon={Mail}
          label="Correos enviados (total)"
          value={formatInteger(correo.enviadosTotal)}
          hint={`${mailRate}% de las participaciones del periodo recibió su correo`}
        />
        <StatCard accent="sun" icon={BarChart3} label="Participaciones sin correo" value={formatInteger(correo.sinCorreo)} hint="Acumuladas, sin importar el filtro. Se reenvían desde Correo." />
      </div>

      <Card title="Participaciones por día">
        <DailyChart days={porDia} />
      </Card>

      <div className="grid min-w-0 gap-4 sm:gap-6 lg:grid-cols-2">
        <Card title="Nivel de impacto">
          <BarList items={levelItems} />
        </Card>
        <Card title="Promedio por categoría">
          <BarList items={categoryItems} />
        </Card>
        <Card title="Por unidad regional">
          <BarList
            items={porUnidad.map((item) => ({ key: item.id, label: item.nombre, value: item.participaciones, detail: `${formatKg(item.promedioTotal)} promedio` }))}
          />
        </Card>
        <Card title="Escuelas y facultades con más participaciones">
          <BarList
            items={topEscuelas.map((item) => ({ key: item.id, label: item.nombre, value: item.participaciones, detail: `${formatKg(item.promedioTotal)} promedio` }))}
          />
        </Card>
      </div>

      <Card
        title="Correo, últimos 7 días"
        action={
          <button type="button" className="min-h-9 cursor-pointer text-sm font-bold text-navy-700 underline underline-offset-2" onClick={() => onNavigate('correo', 'pendientes')}>
            Ver pendientes
          </button>
        }
      >
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-muted">Enviados</dt>
            <dd className="font-display text-2xl font-extrabold text-emerald-700">{formatInteger(correo.enviados7d)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Fallidos</dt>
            <dd className="font-display text-2xl font-extrabold text-red-700">{formatInteger(correo.fallidos7d)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
