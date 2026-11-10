import { useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, CircleCheck, Globe, House, Leaf, Zap } from 'lucide-react';
import { QUESTIONNAIRE_KEY } from '../constants.js';

// Datos que ayudan a dimensionar el problema
const FACTS = [
  { icon: Globe, text: 'Las actividades humanas emiten 50 mil millones de toneladas de CO₂ al año.' },
  { icon: Zap, text: 'El 25 % de las emisiones proviene del consumo de energía en edificios y hogares.' },
  { icon: Leaf, text: 'Pequeños cambios en tus hábitos pueden reducir hasta un 20 % tu huella personal.' },
];

// Cuestionarios entre los que se elige; `key` es la clave del cuestionario en la base de datos
const CHOICES = [
  {
    key: QUESTIONNAIRE_KEY.HOME,
    icon: House,
    eyebrow: 'Hogar y vida cotidiana',
    title: 'Cuestionario del Hogar',
    description:
      'Calcula la huella de carbono generada por tus actividades en casa: electrodomésticos, iluminación, agua caliente, transporte personal y hábitos de consumo.',
  },
  {
    key: QUESTIONNAIRE_KEY.WORK,
    icon: Briefcase,
    eyebrow: 'Centro de trabajo',
    title: 'Cuestionario del Lugar de Trabajo',
    description:
      'Calcula la huella de carbono asociada a tu entorno laboral: dispositivos electrónicos, iluminación, climatización, desplazamiento al trabajo y hábitos en la oficina.',
  },
];

// Clases de una tarjeta según esté elegida o no
function getChoiceClassName(selected) {
  const base =
    'relative flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 sm:p-5 border-2 rounded-2xl cursor-pointer transition-all duration-200 ' +
    'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-navy-700 has-[:focus-visible]:outline-offset-2';
  if (selected) {
    return `${base} border-navy-700 bg-navy-50 shadow-md -translate-y-0.5`;
  }
  return `${base} border-navy-100 bg-white hover:border-gold-400 hover:bg-gold-300/10`;
}

/**
 * Pantalla para elegir el cuestionario
 * "Comenzar cuestionario" permanece bloqueado hasta que se elige uno.
 *
 * @param {{chosenKey: string|null, onBack: () => void, onStart: (key: string) => void}} props
 *   `chosenKey` es el cuestionario que ya se había elegido (al volver desde las preguntas queda marcado).
 */
export default function SelectQuestionnaireScreen({ chosenKey, onBack, onStart }) {
  const [selected, setSelected] = useState(chosenKey);

  return (
    <section className="bg-white rounded-2xl shadow-lg border border-navy-100 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-gold-400 to-sun-500" />
      <div className="p-5 sm:p-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-navy-900 text-gold-400 flex items-center justify-center">
            <Leaf className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xs font-bold tracking-[0.2em] uppercase text-sun-600">Elige tu cuestionario</p>
            <h2 className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-navy-900 leading-snug">
              ¿Cómo contribuyen nuestras acciones diarias al cambio climático?
            </h2>
          </div>
        </div>

        <div className="mt-6 rounded-xl border-l-4 border-gold-400 bg-navy-50 p-4 sm:p-5">
          <p lang="es" className="text-sm sm:text-base text-ink leading-relaxed text-justify hyphens-auto break-words">
            Cada decisión que tomamos en casa o en el trabajo tiene un impacto en el planeta. La energía que consumimos,
            cómo nos desplazamos y los residuos que generamos liberan gases de efecto invernadero que contribuyen al
            calentamiento global. <strong className="text-navy-900">Medir nuestra huella es el primer paso para reducirla.</strong>
          </p>
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            {FACTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon className="w-5 h-5 shrink-0 text-sun-600" aria-hidden="true" />
                <span className="text-xs text-muted leading-snug">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <fieldset className="mt-8">
          <legend className="font-display text-sm font-bold uppercase tracking-wide text-navy-700">
            Selecciona el cuestionario que deseas responder:
          </legend>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {CHOICES.map(({ key, icon: Icon, eyebrow, title, description }, index) => {
              const isSelected = selected === key;
              return (
                <label
                  key={key}
                  style={{ animationDelay: `${0.05 + index * 0.08}s` }}
                  className={`pop-in ${getChoiceClassName(isSelected)}`}
                >
                  <input
                    type="radio"
                    name="cuestionario"
                    value={key}
                    checked={isSelected}
                    onChange={() => setSelected(key)}
                    className="sr-only"
                  />
                  <span className="shrink-0 w-12 h-12 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-xs font-bold tracking-[0.2em] uppercase text-sun-600">{eyebrow}</span>
                    <span className="mt-1 block font-display text-lg font-extrabold text-navy-900 leading-snug">{title}</span>
                    <span lang="es" className="mt-2 block text-sm text-muted leading-relaxed text-justify hyphens-auto break-words">{description}</span>
                  </span>
                  {isSelected && <CircleCheck className="absolute top-3 right-3 w-5 h-5 text-navy-700" aria-hidden="true" />}
                </label>
              );
            })}
          </div>
        </fieldset>

        {selected === null && (
          <p role="status" className="mt-4 text-center text-xs text-sun-600 font-bold">
             Selecciona un cuestionario para continuar.
          </p>
        )}

        <div className="mt-8 pt-5 border-t border-navy-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button type="button" onClick={onBack} className="btn-ghost w-full sm:w-auto justify-center">
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </button>
          <button type="button" disabled={selected === null} onClick={() => onStart(selected)} className="btn-primary w-full sm:w-auto">
            Comenzar cuestionario
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
