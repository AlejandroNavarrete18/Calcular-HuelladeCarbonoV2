import { ArrowLeft, ArrowRight, Loader2, TriangleAlert } from 'lucide-react';
import { QUESTION_TYPE } from '@huella/shared';
import ProgressBar from '../components/quiz/ProgressBar.jsx';
import QuestionCard from '../components/quiz/QuestionCard.jsx';
import { LIST_STATUS } from '../constants.js';

// Aviso que explica por qué el botón "Siguiente" está bloqueado 
function getPendingHint(question) {
  if (question.type === QUESTION_TYPE.MATRIX) {
    return '* Responde todas las filas para poder continuar.';
  }
  return '* Selecciona una opción para poder continuar.';
}

// Tarjeta que se muestra mientras el cuestionario se descarga, o si no se pudo descargar.
function QuestionnaireUnavailable({ loading, onRetry, onBack }) {
  return (
    <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg border border-navy-100 text-center">
      {loading && (
        <p role="status" className="flex items-center justify-center gap-3 font-display font-bold text-navy-900">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando el cuestionario…
        </p>
      )}
      {!loading && (
        <div role="alert">
          <TriangleAlert className="w-8 h-8 mx-auto text-red-600" />
          <p className="mt-3 font-display font-bold text-navy-900">No pudimos cargar el cuestionario</p>
          <p className="mt-1 text-sm text-muted">Verifica tu conexión e inténtalo de nuevo.</p>
          <button type="button" onClick={onRetry} className="btn-primary mt-5">
            Reintentar
          </button>
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-navy-100 text-left">
        <button type="button" onClick={onBack} className="btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Atrás
        </button>
      </div>
    </div>
  );
}

/**
 * Pantalla del cuestionario: barra de progreso, pregunta actual y botones de navegación
 *
 * @param {{quiz: object, status: string, onRetry: () => void, onBack: () => void, onNext: () => void}} props
 *   `status` es el estado de descarga del cuestionario (LIST_STATUS).
 */
export default function QuizScreen({ quiz, status, onRetry, onBack, onNext }) {
  const { question, answers, currentStep, totalSteps, isStepValid, selectOption, selectMatrixCell } = quiz;

  if (!question) {
    return <QuestionnaireUnavailable loading={status !== LIST_STATUS.ERROR} onRetry={onRetry} onBack={onBack} />;
  }

  return (
    <>
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-navy-100">
        <QuestionCard
          question={question}
          answer={answers[question.id]}
          onSelectOption={selectOption}
          onSelectCell={selectMatrixCell}
        />

        {!isStepValid && (
          <p role="status" className="text-xs text-sun-600 font-bold text-right mb-2">
            {getPendingHint(question)}
          </p>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-navy-100">
          <button type="button" onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </button>
          <button type="button" disabled={!isStepValid} onClick={onNext} className="btn-primary">
            Siguiente
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
}
