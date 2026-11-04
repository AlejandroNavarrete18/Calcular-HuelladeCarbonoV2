import { useState } from 'react';
import { AlertTriangle, CalendarCheck, Gauge, MailCheck, MailX, Send } from 'lucide-react';
import { LIST_STATUS } from '../../constants.js';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { loaders } from '../adminApi.js';
import { formatInteger } from '../format.js';
import { useResend } from '../useResend.js';
import DataState from '../components/DataState.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ResendProgress from '../components/ResendProgress.jsx';
import StatCard from '../components/StatCard.jsx';
import MailAccountsTab from './MailAccountsTab.jsx';
import MailLogTab from './MailLogTab.jsx';
import MailPendingTab from './MailPendingTab.jsx';

const TABS = Object.freeze([
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'envios', label: 'Envíos' },
]);

function SummaryCards({ summary }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <StatCard
        accent="green"
        icon={MailCheck}
        label="Correos enviados (total)"
        value={formatInteger(summary.enviadosTotal)}
        hint={`Destinatarios distintos: ${formatInteger(summary.destinatariosUnicos)}. Suma de todas las cuentas.`}
      />
      <StatCard accent="navy" icon={CalendarCheck} label="Enviados hoy" value={formatInteger(summary.enviadosHoy)} hint={`Fallidos hoy: ${formatInteger(summary.fallidosHoy)}`} />
      <StatCard accent="sun" icon={Send} label="Pendientes de enviar" value={formatInteger(summary.participacionesSinCorreo)} hint="Participaciones cuyo correo no ha salido" />
      <StatCard
        accent="gold"
        icon={Gauge}
        label="Cupo disponible hoy"
        value={formatInteger(summary.cupoDisponibleHoy)}
        hint={`Cuentas activas: ${formatInteger(summary.cuentasActivas)} · capacidad diaria: ${formatInteger(summary.capacidadDiaria)}`}
      />
    </div>
  );
}

// Sección de correo: conteos generales, cuentas de Gmail, correos pendientes (con reenvío) y bitácora de envíos.
export default function MailPage({ admin, sub, onNavigate }) {
  const summary = useRemoteData(loaders.resumenCorreo, 'resumen');
  // Al terminar un reenvío se recargan los conteos y se vuelven a montar las listas para ver el estado nuevo.
  const [refreshKey, setRefreshKey] = useState(0);
  const resend = useResend({
    onFinished: () => {
      summary.reload();
      setRefreshKey((current) => current + 1);
    },
  });

  let tab = 'cuentas';
  if (TABS.some((item) => item.key === sub)) {
    tab = sub;
  }
  const failedTotal = summary.data?.fallidosTotal ?? 0;

  return (
    <>
      <PageHeader title="Correo" description="Los resultados se envían rotando entre las cuentas activas hasta agotar el límite diario de cada una." />

      <DataState status={summary.status} onRetry={summary.reload}>
        {summary.data && <SummaryCards summary={summary.data} />}
      </DataState>

      {resend.job && (
        <div className="mb-6">
          <ResendProgress job={resend.job} onDismiss={resend.dismiss} />
        </div>
      )}

      {summary.status === LIST_STATUS.READY && failedTotal > 0 && (
        <p className="mb-4 flex items-start gap-2 text-sm text-muted">
          <MailX className="mt-0.5 w-4 h-4 shrink-0 text-red-700" aria-hidden="true" />
          <span>
            Intentos de envío fallidos en la bitácora: {formatInteger(failedTotal)}. Si una persona no recibió su correo, reenvíalo desde la pestaña Pendientes.
          </span>
        </p>
      )}

      <div role="tablist" aria-label="Correo" className="scroll-x mb-5 flex gap-1 border-b border-navy-100">
        {TABS.map((item) => {
          let state = 'border-transparent text-muted hover:text-navy-900';
          if (item.key === tab) {
            state = 'border-navy-700 text-navy-900';
          }
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={item.key === tab}
              onClick={() => onNavigate('correo', item.key)}
              className={`-mb-px flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold ${state}`}
            >
              {item.label}
              {item.key === 'pendientes' && summary.data?.participacionesSinCorreo > 0 && (
                <span className="rounded-full bg-sun-500 px-2 py-0.5 text-xs font-extrabold text-white">{formatInteger(summary.data.participacionesSinCorreo)}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'cuentas' && <MailAccountsTab key={refreshKey} canEdit={admin.rol === 'superadmin'} />}
      {tab === 'pendientes' && <MailPendingTab key={refreshKey} resend={resend} />}
      {tab === 'envios' && <MailLogTab key={refreshKey} resend={resend} />}
      {resend.error && tab === 'envios' && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-700">
          <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          {resend.error}
        </p>
      )}
    </>
  );
}
