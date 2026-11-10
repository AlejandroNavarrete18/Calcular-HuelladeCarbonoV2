import { useCallback, useMemo, useState } from 'react';
import {
  QUESTION_TYPE,
  areAllQuestionsAnswered,
  buildQuantities,
  isQuestionAnswered,
  normalizeQuantity,
} from '@huella/shared';

// Agrega el elemento a la lista si no está, o lo quita si ya estaba.
function toggleListItem(list, item) {
  if (list.includes(item)) {
    return list.filter((current) => current !== item);
  }
  return [...list, item];
}

// Copia de las cantidades sin las de una pregunta (cuando cambia la opción elegida, la cantidad vuelve a 1).
function withoutQuestion(quantities, questionId) {
  const next = { ...quantities };
  delete next[questionId];
  return next;
}

// Copia de las cantidades sin la de una opción desmarcada.
function withoutOption(quantities, questionId, optionId) {
  const forQuestion = { ...quantities[questionId] };
  delete forQuestion[optionId];
  return { ...quantities, [questionId]: forQuestion };
}

/**
 * Estado del cuestionario: respuestas, cantidades, pregunta actual y validacion.
 *
 * @param {ReadonlyArray<object>} questions Preguntas vigentes (vienen de la API; vacío mientras cargan).
 */
export function useQuiz(questions) {
  const [answers, setAnswers] = useState({});
  // Cantidades tal como las escribe la persona: { clavePregunta: { claveOpcion: cantidad } }. No cuentan en el cálculo.
  const [quantities, setQuantities] = useState({});
  const [currentStep, setCurrentStep] = useState(0);

  const question = questions[currentStep]; // undefined mientras el cuestionario no ha cargado
  const isLastStep = currentStep === questions.length - 1;
  const isStepValid = Boolean(question) && isQuestionAnswered(question, answers[question.id]);
  const isComplete = areAllQuestionsAnswered(answers, questions); // TODAS las preguntas respondidas

  // Cantidades listas para enviar: una por opción elegida (1 si no se escribió), sin las de opciones desmarcadas
  const submissionQuantities = useMemo(
    () => buildQuantities(questions, answers, quantities),
    [questions, answers, quantities]
  );

  // Marca/desmarca una opción checkbox o la elige radio
  const selectOption = useCallback((targetQuestion, optionId) => {
    setAnswers((previous) => {
      if (targetQuestion.type === QUESTION_TYPE.CHECKBOX) {
        const currentList = previous[targetQuestion.id] ?? [];
        return { ...previous, [targetQuestion.id]: toggleListItem(currentList, optionId) };
      }
      return { ...previous, [targetQuestion.id]: optionId };
    });

    // Una opción que se desmarca, o una opción única distinta, empieza de nuevo con cantidad 1.
    setQuantities((previous) => {
      if (targetQuestion.type !== QUESTION_TYPE.CHECKBOX) {
        return withoutQuestion(previous, targetQuestion.id);
      }
      if (previous[targetQuestion.id]?.[optionId] !== undefined) {
        return withoutOption(previous, targetQuestion.id, optionId);
      }
      return previous;
    });
  }, []);

  // Elige la columna de una fila en una pregunta
  const selectMatrixCell = useCallback((questionId, rowId, columnId) => {
    setAnswers((previous) => {
      const currentMatrix = previous[questionId] ?? {};
      return { ...previous, [questionId]: { ...currentMatrix, [rowId]: columnId } };
    });
  }, []);

  // Guarda lo que se escribe en el campo de cantidad de una opción (puede estar vacío mientras se edita).
  const setQuantity = useCallback((questionId, optionId, value) => {
    setQuantities((previous) => ({
      ...previous,
      [questionId]: { ...previous[questionId], [optionId]: value },
    }));
  }, []);

  // Al salir del campo, una cantidad vacía o inválida vuelve a ser válida (1)
  const commitQuantity = useCallback((questionId, optionId) => {
    setQuantities((previous) => {
      const written = previous[questionId]?.[optionId];
      if (written === undefined) {
        return previous;
      }
      return { ...previous, [questionId]: { ...previous[questionId], [optionId]: normalizeQuantity(written) } };
    });
  }, []);

  // Borra todas las respuestas y vuelve a la primera pregunta
  const reset = useCallback(() => {
    setAnswers({});
    setQuantities({});
    setCurrentStep(0);
  }, []);

  return {
    answers,
    quantities,
    submissionQuantities,
    question,
    currentStep,
    totalSteps: questions.length,
    isLastStep,
    isStepValid,
    isComplete,
    selectOption,
    selectMatrixCell,
    setQuantity,
    commitQuantity,
    goToStep: setCurrentStep,
    reset,
  };
}
