export const RISK_LEVELS = {
  SEGURO:   { label: 'Seguro',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   range: [0, 24] },
  ATENCAO:  { label: 'Atenção',  color: '#facc15', bg: 'rgba(250,204,21,0.12)',  range: [25, 44] },
  MODERADO: { label: 'Moderado', color: '#f97316', bg: 'rgba(249,115,22,0.12)', range: [45, 64] },
  ALTO:     { label: 'Alto',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   range: [65, 79] },
  SEVERO:   { label: 'Severo',   color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', range: [80, 100] },
}

export function getRiskLevel(score) {
  if (score >= 80) return RISK_LEVELS.SEVERO
  if (score >= 65) return RISK_LEVELS.ALTO
  if (score >= 45) return RISK_LEVELS.MODERADO
  if (score >= 25) return RISK_LEVELS.ATENCAO
  return RISK_LEVELS.SEGURO
}

export function getRiskColor(nivel) {
  return RISK_LEVELS[nivel]?.color ?? '#888'
}
