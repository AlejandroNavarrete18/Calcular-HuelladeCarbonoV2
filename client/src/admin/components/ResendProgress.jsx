import { CheckCircle2, Loader2, X } from 'lucide-react';
import { MOTIVOS_DETENCION } from '../constants.js';
import { formatInteger } from '../format.js';
import AlertMessage from './AlertMessage.jsx';

/**
 * Avance de un reenvío de correos: barra, conteos y, al terminar, el resumen con los casos que fallaron.
 *
 * @param {{job: object, onDismiss: () => void}} props
 */
export default function ResendProgress({ job, onDismiss }) {
  const running = job.estado === 'en_curso';
  const percent = Math.round((job.procesados / Math.max(job.total, 1)) * 100);
  const stopped = MOTIVOS_DETENCION[job.detenidoPor];

  let tone = 'border-navy-100 bg-navy-50';
  if (!running && job.fallidos === 0 && !job.detenidoPor) {
    tone = 'border-emerald-200 bg-emerald-50';
  }

  return (
    <section aria-live="polite" className={`rounded-2xl border p-4 sm:p-5 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {running && <Loader2 className="w-5 h-5 shrink-0 animate-spin text-navy-700" aria-hidden="true" />}
          {!running && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-700" aria-hidden="true" />}
          <h2 className="font-display text-base font-bold text-navy-900">
            {running && 'Reenviando correos…'}
            {!running && 'Reenvío terminado'}
          </h2>
        </div>
        {!running && (
          <button type="button" onClick={onDismiss} aria-label="Cerrar resumen" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted hover:bg-white/70">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={job.total} aria-valuenow={job.procesados} aria-label="Avance del reenvío">
        <div className="h-full rounded-full bg-gradient-to-r from-navy-700 to-gold-400 transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-sm text-muted">
        {formatInteger(job.procesados)} de {formatInteger(job.total)} procesados ({percent}%)
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="rounded-lg bg-white px-2 py-2">
          <dt className="text-xs font-semibold text-muted">Enviados</dt>
          <dd className="font-display text-xl font-extrabold text-emerald-700">{formatInteger(job.enviados)}</dd>
        </div>
        <div className="rounded-lg bg-white px-2 py-2">
          <dt className="text-xs font-semibold text-muted">Fallidos</dt>
          <dd className="font-display text-xl font-extrabold text-red-700">{formatInteger(job.fallidos)}</dd>
        </div>
        <div className="rounded-lg bg-white px-2 py-2">
          <dt className="text-xs font-semibold text-muted">Omitidos</dt>
          <dd className="font-display text-xl font-extrabold text-navy-900">{formatInteger(job.omitidos)}</dd>
        </div>
        <div className="rounded-lg bg-white px-2 py-2">
          <dt className="text-xs font-semibold text-muted">Pendientes</dt>
          <dd className="font-display text-xl font-extrabold text-sun-600">{formatInteger(job.restantes)}</dd>
        </div>
      </dl>

      {job.simulados > 0 && (
        <p className="mt-3 text-sm text-muted">{formatInteger(job.simulados)} correos se simularon (el servidor está en modo de prueba) y no salieron realmente.</p>
      )}

      {!running && stopped && (
        <div className="mt-3">
          <AlertMessage>{stopped}</AlertMessage>
        </div>
      )}

      {!running && job.errores.length > 0 && (
        <details className="mt-3 rounded-lg bg-white p-3 text-sm">
          <summary className="cursor-pointer font-bold text-navy-900">Ver casos con problemas ({job.errores.length})</summary>
          <ul className="mt-2 space-y-2">
            {job.errores.map((item) => (
              <li key={`${item.idParticipacion}-${item.tipo}`} className="break-words border-t border-navy-100 pt-2">
                <span className="font-semibold">#{item.idParticipacion}</span> {item.correo}
                <span className="block text-xs text-muted">{item.motivo}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
