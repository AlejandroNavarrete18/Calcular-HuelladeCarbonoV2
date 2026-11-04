import logoUas from '../../assets/images/logo-uas.png';
import logoBienestar from '../../assets/images/logo-bienestar.png';
import logoFic from '../../assets/images/logo-fic.jpg';
import logoUas29 from '../../assets/images/logo-uas-29.jpg';

// Altura de los logos
const LOGO_CLASS = 'h-8 sm:h-10 lg:h-14 xl:h-16 w-auto shrink-0 object-contain';

// Encabezado institucional con logos; el título cambia según la aplicación (calculadora o panel)
export default function Header({ title = 'Calculadora de Huella de Carbono' }) {
  return (
    <header className="bg-white shadow-sm sm:sticky sm:top-0 z-20">
      <div className="h-1.5 bg-gradient-to-r from-navy-900 via-gold-400 to-sun-500" />

      <div className="w-full px-4 sm:px-8 xl:px-10 py-2 xl:py-3 flex flex-wrap xl:flex-nowrap items-center justify-between gap-y-2 xl:gap-6">

        {/* Título */}
        <div className="order-1 xl:order-2 w-full xl:w-auto text-center mb-1 xl:mb-0">
          <p className="font-display text-[0.65rem] sm:text-xs xl:text-sm font-bold tracking-[0.15em] text-sun-600 uppercase mb-0.5">
            Universidad Autónoma de Sinaloa
          </p>
          <p className="font-display text-base sm:text-lg lg:text-xl xl:text-2xl font-extrabold text-navy-900 leading-tight">
            {title}
          </p>
        </div>

        {/* Logos de la Facultad de Informática y Bienestar Universitario */}
        <div className="order-2 xl:order-1 w-1/2 xl:w-auto flex items-center justify-end xl:justify-start gap-2 sm:gap-4 xl:gap-6 pr-2 xl:pr-0">
          <img src={logoFic} alt="Logo de la Facultad de Informática" className={LOGO_CLASS} />
          <img src={logoBienestar} alt="Logo de Bienestar Universitario" className={LOGO_CLASS} />
        </div>

        {/* Logos de la UAS */}
        <div className="order-3 xl:order-3 w-1/2 xl:w-auto flex items-center justify-start xl:justify-end gap-2 sm:gap-4 xl:gap-6 pl-2 xl:pl-0">
          <img src={logoUas29} alt="Logo UAS 29" className={LOGO_CLASS} />
          <img src={logoUas} alt="Escudo de la Universidad Autónoma de Sinaloa" className={LOGO_CLASS} />
        </div>
      </div>
    </header>
  );
}
