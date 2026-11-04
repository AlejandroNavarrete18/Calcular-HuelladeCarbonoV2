import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const STYLES = Object.freeze({
  error: { box: 'bg-red-50 border-red-200 text-red-800', Icon: AlertTriangle, role: 'alert' },
  success: { box: 'bg-emerald-50 border-emerald-200 text-emerald-800', Icon: CheckCircle2, role: 'status' },
});

// Aviso de error o de éxito; los de error se anuncian de inmediato a lectores de pantalla.
export default function AlertMessage({ type = 'error', children }) {
  if (!children) {
    return null;
  }
  const { box, Icon, role } = STYLES[type];
  return (
    <div role={role} className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-semibold ${box}`}>
      <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
