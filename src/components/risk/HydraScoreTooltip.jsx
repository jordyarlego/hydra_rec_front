import { Tooltip } from '../common/Tooltip.jsx'

export function HydraScoreTooltip({ children }) {
  return (
    <Tooltip label="Score combina chuva prevista, chuva acumulada, maré, altitude, vulnerabilidade do bairro e confiança das fontes.">
      {children}
    </Tooltip>
  )
}
