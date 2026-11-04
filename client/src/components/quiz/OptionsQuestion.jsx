import { QUESTION_TYPE } from '@huella/shared';

// Clases de una opción según esté marcada o no
function getOptionClassName(checked) {
  const base =
    'pop-in flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all duration-200';
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

// Preguntas de casillas (varias opciones) y de opción única.
export default function OptionsQuestion({ question, answer, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
      {question.options.map((option, index) => {
        const checked = isOptionSelected(question, answer, option.id);
        return (
          <label
            key={option.id}
            style={{ animationDelay: `${0.05 + index * 0.04}s` }}
            className={getOptionClassName(checked)}
          >
            <input
              type={getInputType(question)}
              name={question.id}
              checked={checked}
              onChange={() => onSelect(question, option.id)}
              className="w-5 h-5 shrink-0"
            />
            <span className="text-navy-900 font-semibold text-sm">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
