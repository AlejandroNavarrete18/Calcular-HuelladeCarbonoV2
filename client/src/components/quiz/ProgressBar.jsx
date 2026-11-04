// Barra de progreso del cuestionario
export default function ProgressBar({ currentStep, totalSteps }) {
  const percent = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs sm:text-sm font-bold text-navy-900 mb-2 font-display">
        <span>
          Pregunta {currentStep + 1} de {totalSteps}
        </span>
        <span>{percent}% completado</span>
      </div>
      <div
        className="w-full bg-navy-100 h-3 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-400 to-sun-500 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
