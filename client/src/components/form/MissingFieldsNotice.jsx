import { TriangleAlert } from 'lucide-react';

/**
 * Aviso visible mientras falte algo por completar: explica por qué el botón está bloqueado
 * y lista exactamente qué falta.
 *
 * @param {{missingLabels: string[], quizIncomplete: boolean}} props
 */
export default function MissingFieldsNotice({ missingLabels, quizIncomplete }) {
  if (!quizIncomplete && missingLabels.length === 0) {
    return null;
  }

  return (
    <div
      role="status"
      className="mt-6 flex items-start gap-3 rounded-lg border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <TriangleAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
      <div>
        <p className="font-bold">Completa todo para ver tus resultados</p>
        {quizIncomplete && <p className="mt-0.5">Regresa y responde todas las preguntas del cuestionario.</p>}
        {missingLabels.length > 0 && (
          <p className="mt-0.5">
            Falta completar o corregir: <strong>{missingLabels.join(', ')}</strong>.
          </p>
        )}
      </div>
    </div>
  );
}
