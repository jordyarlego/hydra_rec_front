import { Chip } from '../common/Chip.jsx'

function formatNumber(value, suffix = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--'
  return `${Math.round(Number(value))}${suffix}`
}

export function ChipsBar({ current, heatIndex, traffic }) {
  if (!current) return null

  return (
    <div className="chips-bar" aria-label="Resumo meteorológico">
      <Chip label="Agora" value={formatNumber(current.temperature_2m, '°C')} tone="accent" />
      <Chip label="Sensação" value={formatNumber(current.apparent_temperature, '°C')} />
      <Chip label="Umidade" value={formatNumber(current.relative_humidity_2m, '%')} />
      <Chip label="Chuva" value={`${current.precipitation ?? 0} mm`} />
      {heatIndex && <Chip label="Calor" value={`${Math.round(heatIndex.value)}°C`} tone={heatIndex.risk?.toLowerCase()} />}
      {traffic && <Chip label="Trânsito" value={`${traffic.label ?? 'Normal'}`} tone="traffic" />}
    </div>
  )
}
