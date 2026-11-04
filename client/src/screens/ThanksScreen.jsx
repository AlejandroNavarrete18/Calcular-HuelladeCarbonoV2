import { HeartHandshake, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * Pantalla de agradecimientos
 * @param {{onBack: () => void, onNext: () => void}} props
 */
export default function ThanksScreen({ onBack, onNext }) {
  return (
    <section className="bg-white rounded-2xl shadow-lg border border-navy-100 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-gold-400 to-sun-500" />
      <div className="p-5 sm:p-10">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-navy-900 text-gold-400 flex items-center justify-center">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xs font-bold tracking-[0.2em] uppercase text-sun-600">Agradecimientos</p>
            <h2 className="mt-1 font-display text-xl sm:text-2xl font-extrabold text-navy-900 leading-snug">
              Gracias por ser parte de esta iniciativa
            </h2>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm sm:text-base text-ink leading-relaxed text-justify hyphens-auto break-words" lang="es">
          <p>
            En el marco de los esfuerzos institucionales orientados al fortalecimiento de la transformación digital y la sustentabilidad, expresamos nuestro más sincero agradecimiento a la Directora General de Bienestar Universitario de la UAS, <strong>Dra. Sofía Angulo de Madueña</strong>, y a la Coordinadora Estatal de Sustentabilidad, <strong>Lic. Magdalena Cruz Hernández</strong>, por la confianza depositada, la disposición y el respaldo brindado para dar continuidad a la implementación del Sistema de Huella de Carbono de la Universidad Autónoma de Sinaloa. Su apoyo representa una contribución fundamental para consolidar acciones encaminadas a fortalecer la responsabilidad ambiental y promover una cultura institucional comprometida con el desarrollo sustentable.
          </p>
          <p>
            De igual manera, reconocemos y agradecemos la valiosa participación y colaboración del <strong>Dr. Zeus del Valle Castillo Nájera</strong>, el <strong>Dr. José de Jesús Uriarte Adrián</strong>, el <strong>MC. Alejandro Yahir Sicairos Ochoa</strong>, la <strong>L.I. Thelma Berenice Cervantes Verdugo</strong> y el <strong>Lic. Axel Manuel Aguilar Pérez</strong>, cuyo compromiso y disposición han contribuido al desarrollo de esta iniciativa.
          </p>
          <p>
            Extendemos también nuestro reconocimiento a los estudiantes <strong>Luis Alejandro Navarrete Díaz</strong>, <strong>César Alberto López Zavala</strong>, <strong>Jesús Rubén Monzón García</strong> y <strong>Kleber Retamoza Mayorga</strong>, de la Licenciatura en Informática de la Facultad de Informática Culiacán de la Universidad Autónoma de Sinaloa, por su dedicación, esfuerzo y valiosa aportación al proyecto.
          </p>
          <p>
            La suma de voluntades, conocimientos y esfuerzos de todas las personas involucradas reafirma la importancia del trabajo colaborativo en la construcción de una universidad más sustentable. A cada una de ellas, nuestro reconocimiento y gratitud por contribuir al fortalecimiento de esta iniciativa, que representa un paso significativo hacia una gestión institucional más responsable con el medio ambiente y con las generaciones futuras.
          </p>
        </div>

        <div className="mt-8 pt-5 border-t border-navy-100 flex items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </button>
          <button type="button" onClick={onNext} className="btn-primary">
            Continuar
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </section>
  );
}