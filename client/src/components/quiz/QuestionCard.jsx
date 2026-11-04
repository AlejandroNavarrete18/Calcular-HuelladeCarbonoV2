import { QUESTION_TYPE } from '@huella/shared';
import StepIcon from './StepIcon.jsx';
import OptionsQuestion from './OptionsQuestion.jsx';
import MatrixQuestion from './MatrixQuestion.jsx';

// Título, subtítulo y cuerpo de una pregunta (tabla o lista de opciones según su tipo)
export default function QuestionCard({ question, answer, onSelectOption, onSelectCell }) {
  let body = <OptionsQuestion question={question} answer={answer} onSelect={onSelectOption} />;
  if (question.type === QUESTION_TYPE.MATRIX) {
    body = <MatrixQuestion question={question} answer={answer} onSelectCell={onSelectCell} />;
  }

  return (
    <>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-11 h-11 rounded-full bg-navy-900 flex items-center justify-center">
          <StepIcon questionId={question.id} className="w-6 h-6 text-gold-400" />
        </div>
        <div>
          <h2 className="font-display text-base sm:text-xl font-extrabold text-navy-900 uppercase leading-snug">
            {question.title}
          </h2>
          {question.subtitle && <p className="mt-1 text-xs font-bold text-sun-600 tracking-wider">{question.subtitle}</p>}
        </div>
      </div>
      {body}
    </>
  );
}
