import { useState } from 'react';
import { SCREENS } from '../constants.js';
import { fetchCuestionario } from '../services/cuestionarioApi.js';
import { useQuiz } from './useQuiz.js';
import { useRemoteData } from './useRemoteData.js';
import { useScreenTransition } from './useScreenTransition.js';

const NO_QUESTIONNAIRE = Object.freeze({ version: '', questions: Object.freeze([]) });
const QUESTIONNAIRE_OPTIONS = Object.freeze({ emptyValue: NO_QUESTIONNAIRE });

/**
 * Flujo completo de la aplicación: qué pantalla se ve y cómo se navega entre ellas.
 * CANDADO DE RESULTADOS: la pantalla de resultados SOLO existe después de que el servidor guardó la
 * participación y devolvió los resultados (`submission`). Y el formulario final solo se abre con TODAS las
 * preguntas del cuestionario respondidas */

export function useAppFlow() {
  const [screen, setScreen] = useState(SCREENS.INTRO);
  const [submission, setSubmission] = useState(null); // { results, email } que devolvió el servidor
  const questionnaire = useRemoteData(fetchCuestionario, 'cuestionario', QUESTIONNAIRE_OPTIONS);
  const quiz = useQuiz(questionnaire.data.questions);
  const { transition, getAnimationClass } = useScreenTransition();

  let visibleScreen = screen;
  if (visibleScreen === SCREENS.RESULTS && !submission) {
    visibleScreen = SCREENS.CONTACT;
  }
  if (visibleScreen === SCREENS.CONTACT && !quiz.isComplete) {
    visibleScreen = SCREENS.QUIZ;
  }

  const goTo = (target, direction = 'next') => transition(() => setScreen(target), direction);

  const handleStart = () => goTo(SCREENS.THANKS);
  const handleThanksBack = () => goTo(SCREENS.INTRO, 'prev');
  const handleThanksNext = () =>
    transition(() => {
      quiz.goToStep(0);
      setScreen(SCREENS.QUIZ);
    });

  const handleQuizBack = () => {
    if (quiz.currentStep === 0) {
      goTo(SCREENS.THANKS, 'prev');
      return;
    }
    transition(() => quiz.goToStep(quiz.currentStep - 1), 'prev');
  };

  const handleQuizNext = () => {
    if (!quiz.isStepValid) {
      return;
    }
    if (quiz.isLastStep) {
      if (quiz.isComplete) {
        goTo(SCREENS.CONTACT);
      }
      return;
    }
    transition(() => quiz.goToStep(quiz.currentStep + 1));
  };

  const handleContactBack = () =>
    transition(
      () => {
        quiz.goToStep(quiz.totalSteps - 1);
        setScreen(SCREENS.QUIZ);
      },
      'prev'
    );

  // El servidor ya guardó todo: se guardan los resultados que devolvió y se abre la pantalla final
  const handleSubmitted = (response) => {
    setSubmission({ results: response.results, email: response.email });
    goTo(SCREENS.RESULTS);
  };

  const handleRestart = () =>
    transition(
      () => {
        questionnaire.reload(); // trae los cambios que se hayan hecho al cuestionario en la base de datos
        quiz.reset();
        setSubmission(null);
        setScreen(SCREENS.INTRO);
      },
      'prev'
    );

  return {
    screen: visibleScreen,
    quiz,
    questionnaire: { status: questionnaire.status, version: questionnaire.data.version, reload: questionnaire.reload },
    submission,
    animationClass: getAnimationClass(visibleScreen === SCREENS.QUIZ),
    screenKey: quizAwareKey(visibleScreen, quiz.currentStep),
    handlers: {
      handleStart,
      handleThanksBack,
      handleThanksNext,
      handleQuizBack,
      handleQuizNext,
      handleContactBack,
      handleSubmitted,
      handleRestart,
    },
  };
}

// Clave del contenedor: en el cuestionario cambia con cada pregunta para reiniciar la animacion
function quizAwareKey(screen, currentStep) {
  if (screen === SCREENS.QUIZ) {
    return `quiz-${currentStep}`;
  }
  return screen;
}
