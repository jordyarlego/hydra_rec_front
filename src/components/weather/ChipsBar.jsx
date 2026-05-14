import { useRef, useEffect } from 'react'

const uvLabel = u => u <= 2 ? 'Baixo' : u <= 5 ? 'Moderado' : u <= 7 ? 'Alto' : u <= 10 ? 'Muito Alto' : 'Extremo'
const uvColor = u => u <= 2 ? '#22c55e' : u <= 5 ? '#eab308' : u <= 7 ? '#f97316' : u <= 10 ? '#ef4444' : '#a855f7'

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
  const barRef = useRef(null)

  useEffect(() => {
    const el = barRef.current
    if (!el) return
    let dragging = false, startX = 0, scrollLeft = 0

    const onDown = e => {
      dragging = true
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
    }
    const onUp = () => {
      dragging = false
      el.style.cursor = 'grab'
      el.style.userSelect = ''
    }
    const onMove = e => {
      if (!dragging) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      el.scrollLeft = scrollLeft - (x - startX)
    }

    el.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    el.addEventListener('mousemove', onMove)
    return () => {
      el.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      el.removeEventListener('mousemove', onMove)
    }
  }, [])

  if (!current) return null
  const rawValues = risk?.rawValues || risk?.raw_values || {}

  const uv      = Math.round(rawValues.uvIndex ?? current.uv_index ?? 0)
  const umidade = Math.round(current.relative_humidity_2m ?? 0)
  const vis     = visFromCode(current.weather_code)
  const mare    = rawValues.mareAltura ?? rawValues.mare_altura ?? 1.5
  const vento   = Math.round(current.wind_speed_10m ?? 0)

  const umidadeLabel = umidade >= 80 ? 'Muito úmido' : umidade >= 60 ? 'Úmido' : umidade >= 40 ? 'Agradável' : 'Seco'
  const umidadeColor = umidade >= 80 ? '#38bdf8' : umidade >= 60 ? '#60a5fa' : umidade >= 40 ? '#22c55e' : '#f97316'

  return (
    <div
      ref={barRef}
      className="chips-bar scroll-x"
      style={{ cursor: 'grab' }}
      aria-label="Resumo meteorológico"
    >
      <MetricChip label="Risco de queimadura" value={`${uvLabel(uv)} (UV ${uv})`} color={uvColor(uv)} light={light} />
      <MetricChip label="Umidade do ar"       value={`${umidade}% · ${umidadeLabel}`} color={umidadeColor} light={light} />
      <MetricChip label="Visibilidade"        value={`${vis} km`} light={light} />
      <MetricChip label="Nível do mar"        value={`${mare}m`} light={light} />
      <MetricChip label="Vento"               value={`${vento} km/h`} light={light} />
    </div>
  )
}
