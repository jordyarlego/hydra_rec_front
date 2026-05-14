import { RISK_LEVELS } from '../../lib/riskColors.js'
import { LegendChip } from '../common/LegendChip.jsx'

export function RiskLegend() {
  return (
    <div className="risk-legend" aria-label="Legenda de risco">
      {Object.values(RISK_LEVELS).map(level => (
        <LegendChip
          key={level.label}
          color={level.color}
          label={level.label}
          range={`${level.range[0]}-${level.range[1]}`}
        />
      ))}
    </div>
  )
}
