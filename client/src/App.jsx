import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import IntroScreen from './screens/IntroScreen.jsx';
import ThanksScreen from './screens/ThanksScreen.jsx';
import QuizScreen from './screens/QuizScreen.jsx';
import ContactScreen from './screens/ContactScreen.jsx';
import ResultsScreen from './screens/ResultsScreen.jsx';
import { useAppFlow } from './hooks/useAppFlow.js';
import { SCREENS } from './constants.js';

// Pantalla que corresponde al paso actual del flujo  
function CurrentScreen({ flow }) {
  const { screen, quiz, questionnaire, submission, handlers } = flow;

  if (screen === SCREENS.INTRO) {
    return <IntroScreen onStart={handlers.handleStart} />;
  }
  if (screen === SCREENS.THANKS) {
    return <ThanksScreen onBack={handlers.handleThanksBack} onNext={handlers.handleThanksNext} />;
  }
  if (screen === SCREENS.QUIZ) {
    return (
      <QuizScreen
        quiz={quiz}
        status={questionnaire.status}
        onRetry={questionnaire.reload}
        onBack={handlers.handleQuizBack}
        onNext={handlers.handleQuizNext}
      />
    );
  }
  if (screen === SCREENS.CONTACT) {
    return (
      <ContactScreen
        answers={quiz.answers}
        questionnaireVersion={questionnaire.version}
        isQuizComplete={quiz.isComplete}
        onBack={handlers.handleContactBack}
        onSubmitted={handlers.handleSubmitted}
      />
    );
  }
  return <ResultsScreen results={submission.results} email={submission.email} onRestart={handlers.handleRestart} />;
}

export default function App() {
  const flow = useAppFlow();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* max-w-7xl permite que todo el contenido se expanda a los lados */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10 overflow-x-hidden">
        <div key={flow.screenKey} className={flow.animationClass}>
          <CurrentScreen flow={flow} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
