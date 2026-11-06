import logoUas from '../../assets/images/logo-uas.png';
import logoBienestar from '../../assets/images/logo-bienestar.png';
import logoFic from '../../assets/images/logo-fic.jpg';
import logoUas29 from '../../assets/images/logo-uas-29.jpg';
import logoSustentabilidad from '../../assets/images/logo-sustentabilidad.png';

const LOGOS = Object.freeze([
  { src: logoFic, alt: 'Facultad de Informática' },
  { src: logoBienestar, alt: 'Bienestar Universitario' },
  { src: logoUas29, alt: 'UAS 29' },
  { src: logoUas, alt: 'Escudo de la Universidad Autónoma de Sinaloa' },
  { src: logoSustentabilidad, alt: 'Logo Sustentabilidad' },
]);

// Los cuatro logos institucionales
export default function BrandLogos({ className = 'h-9', gap = 'gap-3' }) {
  return (
    <div className={`flex items-center justify-center ${gap}`}>
      {LOGOS.map((logo) => (
        <img key={logo.alt} src={logo.src} alt={logo.alt} className={`${className} w-auto shrink-0 object-contain`} />
      ))}
    </div>
  );
}
