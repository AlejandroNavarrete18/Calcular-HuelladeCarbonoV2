import { QUESTION_TYPE, optionAllowsQuantity } from '@huella/shared';
import QuantityControl from './QuantityControl.jsx';

// Clases de una opción según esté marcada o no
function getOptionClassName(checked) {
  const base = 'pop-in flex items-center border-2 rounded-xl transition-all duration-200';
  if (checked) {
    return `${base} border-navy-700 bg-navy-50 shadow-md -translate-y-0.5`;
  }
  return `${base} border-navy-100 bg-white hover:border-gold-400 hover:bg-gold-300/10`;
}

// ¿Está marcada esta opción? (checkbox: está en la lista; radio: es la elegida)
function isOptionSelected(question, answer, optionId) {
  if (question.type === QUESTION_TYPE.CHECKBOX) {
    return Array.isArray(answer) && answer.includes(optionId);
  }
  return answer === optionId;
}

//Tipo de control HTML que corresponde a la pregunta
function getInputType(question) {
  if (question.type === QUESTION_TYPE.CHECKBOX) {
    return 'checkbox';
  }
  return 'radio';
}

/**
 * Preguntas de casillas (varias opciones) y de opción única.
 * Si la pregunta pide cantidad (`allowQuantity`), la opción marcada muestra su campo de cantidad (1 por defecto).
 *
 * @param {{question: object, answer: unknown, quantities?: Record<string, number|string>,
 *          onSelect: Function, onQuantityChange: (optionId: string, value: number|string) => void,
 *          onQuantityCommit: (optionId: string) => void}} props
 */
export default function OptionsQuestion({ question, answer, quantities, onSelect, onQuantityChange, onQuantityCommit }) {
  let gridClassName = 'grid grid-cols-1 sm:grid-cols-2 gap-3 my-6';
  if (question.allowQuantity) {
    gridClassName = 'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 mb-6';
  }

  return (
    <>
      {question.allowQuantity && (
        <p className="mt-5 text-xs sm:text-sm text-muted leading-snug">
          Al marcar una opción podrás indicar cuántos tienes (por defecto 1).
        </p>
      )}
      <div className={gridClassName}>
        {question.options.map((option, index) => {
          const checked = isOptionSelected(question, answer, option.id);
          return (
            <div
              key={option.id}
              style={{ animationDelay: `${0.05 + index * 0.04}s` }}
              className={getOptionClassName(checked)}
            >
              <label className="flex flex-1 min-w-0 items-center gap-3 p-3.5 cursor-pointer">
                <input
                  type={getInputType(question)}
                  name={question.id}
                  checked={checked}
                  onChange={() => onSelect(question, option.id)}
                  className="w-5 h-5 shrink-0"
                />
                <span className="text-navy-900 font-semibold text-sm">{option.label}</span>
              </label>
              {optionAllowsQuantity(question, option.id) && checked && (
                <QuantityControl
                  label={option.label}
                  value={quantities?.[option.id]}
                  onChange={(value) => onQuantityChange(option.id, value)}
                  onCommit={() => onQuantityCommit(option.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
