/* ════════════════════════════════════════════════════
   ChipsBar — métricas atuais em chips horizontais
   UV, Pressão, Visibilidade, Maré, Solo, Vento
   ════════════════════════════════════════════════════ */

const uvLabel = u => u <= 2 ? 'Baixo' : u <= 5 ? 'Moderado' : u <= 7 ? 'Alto' : u <= 10 ? 'Muito Alto' : 'Extremo'
const uvColor = u => u <= 2 ? '#22c55e' : u <= 5 ? '#eab308' : u <= 7 ? '#f97316' : u <= 10 ? '#ef4444' : '#a855f7'
const soilColor = s => s > 80 ? '#ef4444' : s > 60 ? '#f97316' : undefined

function visFromCode(code = 0) {
  if (code === 0) return 12
  if (code <= 2)  return 10
  if (code === 3) return 8
  if (code <= 48) return 2
  if (code <= 57) return 5
  if (code <= 67) return 4
  if (code <= 82) return 6
  return 2
}

function MetricChip({ label, value, color, light, hint }) {
  return (
    <div className={`metric-chip${light ? ' light' : ''}`} title={hint}>
      <span className="metric-chip-label">{label}</span>
      <span className="metric-chip-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  )
}

export function ChipsBar({ current, risk, light = false }) {
  if (!current) return null
  const rawValues = risk?.rawValues || risk?.raw_values || {}

  const uv       = Math.round(rawValues.uvIndex ?? current.uv_index ?? 0)
  const pressao  = Math.round(rawValues.pressao ?? current.surface_pressure ?? 1013)
  const vis      = visFromCode(current.weather_code)
  const mare     = rawValues.mareAltura ?? rawValues.mare_altura ?? 1.5
  const soil     = Math.round((rawValues.saturacaoSolo ?? 0) * 100)
  const vento    = Math.round(current.wind_speed_10m ?? 0)

  return (
    <div className="chips-bar scroll-x" aria-label="Resumo meteorológico">
      <MetricChip label="Sol / Queimadura" value={`${uvLabel(uv)} (UV ${uv})`} color={uvColor(uv)} light={light} />
      <MetricChip label="Pressão do ar"    value={`${pressao} hPa`} light={light} />
      <MetricChip label="Alcance visual"   value={`${vis} km`} light={light} />
      <MetricChip label="Nível do mar"     value={`${mare}m`} light={light} />
      <MetricChip label="Vento"            value={`${vento} km/h`} light={light} />
    </div>
  )
}
