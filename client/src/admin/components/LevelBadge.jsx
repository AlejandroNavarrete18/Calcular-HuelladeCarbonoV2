import { NIVEL_POR_CLAVE } from '../constants.js';

// Nivel de impacto (bajo, medio, alto, muy alto) con su color.
export default function LevelBadge({ nivel }) {
  const level = NIVEL_POR_CLAVE[nivel];
  if (!level) {
    return null;
  }
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${level.badge}`}>{level.label}</span>;
}
