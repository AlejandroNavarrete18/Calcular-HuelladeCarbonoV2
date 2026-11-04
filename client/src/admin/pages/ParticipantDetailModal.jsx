import { useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { useRemoteData } from '../../hooks/useRemoteData.js';
import { eliminarParticipacion, loaders } from '../adminApi.js';
import { errorMessage } from '../errors.js';
import { formatDate, formatDateTime, formatKg } from '../format.js';
import AlertMessage from '../components/AlertMessage.jsx';
import Badge from '../components/Badge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import DataState from '../components/DataState.jsx';
import LevelBadge from '../components/LevelBadge.jsx';
import Modal from '../components/Modal.jsx';

const ESTADO_ENVIO = Object.freeze({
  enviado: { tone: 'green', label: 'Enviado' },
  fallido: { tone: 'red', label: 'Fallido' },
});

// Agrupa las respuestas por pregunta: una pregunta de matriz o de opción múltiple tiene varias líneas.
function groupAnswers(respuestas) {
  const groups = new Map();
  for (const respuesta of respuestas) {
    if (!groups.has(respuesta.numero)) {
      // Los títulos guardados pueden traer su propio número ("1. ¿Qué..."); se quita porque ya se muestra aparte.
      groups.set(respuesta.numero, { numero: respuesta.numero, titulo: respuesta.titulo.replace(/^\d+\.\s*/, ''), lineas: [] });
    }
    let linea = respuesta.opcion;
    if (respuesta.fila) {
      linea = `${respuesta.fila}: ${respuesta.opcion}`;
    }
    groups.get(respuesta.numero).lineas.push(linea);
  }
  return [...groups.values()];
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink break-words">{children}</dd>
    </div>
  );
}

// Detalle de una participación: datos de contacto, resultados, respuestas y correos enviados.
export default function ParticipantDetailModal({ id, canDelete, resend, onClose, onDeleted }) {
  const { data, status, reload } = useRemoteData(loaders.participacion, id);
  const [confirming, setConfirming] = useState(false);
  const [confirmingResend, setConfirmingResend] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleResend(force) {
    const started = await resend.start({ modo: 'ids', ids: [id], forzar: force });
    if (started) {
      setConfirmingResend(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError('');
    try {
      await eliminarParticipacion(id);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal title={`Participación #${id}`} onClose={onClose} wide>
      <DataState status={status} onRetry={reload}>
        {data && (
          <div className="space-y-6">
            <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                {data.nombre} {data.apellidos}
              </Field>
              <Field label="Fecha de participación">{formatDateTime(data.creadoEn)}</Field>
              <Field label="Correo">{data.correo}</Field>
              <Field label="Teléfono">{data.telefono}</Field>
              <Field label="Nacimiento">
                {formatDate(data.fechaNacimiento)} ({data.edad} años)
              </Field>
              <Field label="País">{data.pais}</Field>
              {data.estado && (
                <Field label="Estado y municipio">
                  {data.estado}, {data.municipio}
                </Field>
              )}
              {data.ciudadProvincia && <Field label="Ciudad o provincia">{data.ciudadProvincia}</Field>}
              <Field label="Localidad">{data.localidad}</Field>
              <Field label="Unidad regional">{data.unidad}</Field>
              <Field label="Escuela o institución">{data.escuela}</Field>
            </dl>

            <section aria-label="Resultados" className="rounded-lg bg-navy-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-2xl font-extrabold text-navy-900">{formatKg(data.totalKg)}</p>
                <LevelBadge nivel={data.nivel} />
              </div>
              <p className="mt-2 text-sm text-muted">
                Hogar {formatKg(data.hogarKg)} · Transporte {formatKg(data.transporteKg)} · Alimentación y consumo {formatKg(data.consumoKg)}
              </p>
            </section>

            <section>
              <h3 className="font-display text-sm font-bold text-navy-900 mb-2">Respuestas</h3>
              <ol className="space-y-3">
                {groupAnswers(data.respuestas).map((group) => (
                  <li key={group.numero} className="text-sm">
                    <p className="font-semibold text-ink">
                      {group.numero}. {group.titulo}
                    </p>
                    <ul className="mt-0.5 list-disc pl-5 text-muted">
                      {group.lineas.map((linea) => (
                        <li key={linea}>{linea}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="font-display text-sm font-bold text-navy-900 mb-2">Correos enviados</h3>
              {data.envios.length === 0 && <p className="text-sm text-muted">No se registró ningún intento de envío.</p>}
              <ul className="space-y-1.5">
                {data.envios.map((envio) => (
                  <li key={envio.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={ESTADO_ENVIO[envio.estado].tone}>{ESTADO_ENVIO[envio.estado].label}</Badge>
                    <span className="min-w-0 break-all text-muted">
                      {formatDateTime(envio.creadoEn)} desde {envio.remitente}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-3">
                {resend.running && <AlertMessage type="success">Reenviando el correo… el estado se actualizará al terminar.</AlertMessage>}
                <AlertMessage>{resend.error}</AlertMessage>
                {!data.correoEnviado && (
                  <button type="button" disabled={resend.running || resend.starting} onClick={() => handleResend(false)} className="btn-primary btn-sm w-full sm:w-auto">
                    <Send className="w-4 h-4" aria-hidden="true" />
                    Reenviar correo a {data.correo}
                  </button>
                )}
                {data.correoEnviado === 1 && (
                  <button type="button" disabled={resend.running || resend.starting} onClick={() => setConfirmingResend(true)} className="btn-ghost btn-sm w-full sm:w-auto">
                    <Send className="w-4 h-4" aria-hidden="true" />
                    Volver a enviar (no lo encuentra)
                  </button>
                )}
              </div>
            </section>

            {canDelete && (
              <div className="flex justify-end border-t border-navy-100 pt-4">
                <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold text-red-700 hover:underline">
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  Eliminar participación
                </button>
              </div>
            )}
          </div>
        )}
      </DataState>

      {confirmingResend && (
        <ConfirmDialog
          title="Volver a enviar el correo"
          message="Esta persona ya figura con el correo enviado. Se le enviará de nuevo el mismo mensaje de resultados. Úsalo solo si confirmó que no lo recibió (revisa también su carpeta de spam)."
          confirmLabel="Enviar de nuevo"
          busy={resend.starting}
          error={resend.error}
          onConfirm={() => handleResend(true)}
          onCancel={() => setConfirmingResend(false)}
        />
      )}
      {confirming && (
        <ConfirmDialog
          title="Eliminar participación"
          message="Se borrarán sus datos personales y sus respuestas. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          danger
          busy={busy}
          error={error}
          onConfirm={handleDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Modal>
  );
}
