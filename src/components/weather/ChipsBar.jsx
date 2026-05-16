import { useRef, useEffect } from 'react'

/* ════════════════════════════════════════════════════
   ChipsBar — métricas reais APAC
   Removidos UV index, weather_code, visibilidade (sem fonte APAC).
   Mostra Chuva 1h, Acumulado 24h, Umidade, Vento, Temp, Tendência.
   ════════════════════════════════════════════════════ */

function MetricChip({ label, value, color, light, hint }) {
  return (
    <div className={`metric-chip${light ? ' light' : ''}`} title={hint}>
      <span className="metric-chip-label">{label}</span>
      <span className="metric-chip-value" style={color ? { color } : undefined}>{value}</span>
    </div>
  )
}

function rainColor(mm) {
  if (mm == null)  return undefined
  if (mm >= 30)    return '#a855f7'  // severa
  if (mm >= 10)    return '#ef4444'  // forte
  if (mm >= 2.5)   return '#f97316'  // moderada
  if (mm >= 0.2)   return '#eab308'  // leve
  return undefined
}

function humidityColor(pct) {
  if (pct == null) return undefined
  if (pct >= 80) return '#38bdf8'
  if (pct >= 60) return '#60a5fa'
  if (pct >= 40) return '#22c55e'
  return '#f97316'
}

function humidityLabel(pct) {
  if (pct == null) return '—'
  if (pct >= 80) return 'Muito úmido'
  if (pct >= 60) return 'Úmido'
  if (pct >= 40) return 'Agradável'
  return 'Seco'
}

function trendIcon(trend) {
  if (trend === 'subindo')  return '↑'
  if (trend === 'descendo') return '↓'
  return '→'
}

function trendLabel(trend) {
  if (trend === 'subindo')  return 'Subindo'
  if (trend === 'descendo') return 'Caindo'
  return 'Estável'
}

export function ChipsBar({ weather, light = false }) {
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

  if (!weather) return null

  const rain1h   = weather.rain_1h_mm
  const rain24h  = weather.rain_24h_mm
  const humidity = weather.humidity_pct != null ? Math.round(weather.humidity_pct) : null
  const wind     = weather.wind_kmh     != null ? Math.round(weather.wind_kmh)     : null
  const temp     = weather.temp_c       != null ? Math.round(weather.temp_c)       : null
  const trend    = weather.rain_trend   || 'estavel'
  const source   = weather.source       || 'apac'
  const meteoOk  = temp != null || humidity != null || wind != null

  const chips = []

  // 1. Chuva — sempre presente porque CEMADEN cobre toda RMR
  chips.push({
    key: 'rain1h',
    label: 'Chuva agora',
    value: rain1h != null ? `${rain1h.toFixed(1)} mm/h` : 'sem leitura',
    color: rainColor(rain1h),
    hint: 'Pluviômetro CEMADEN mais próximo',
  })

  chips.push({
    key: 'rain24h',
    label: 'Acumulado 24h',
    value: rain24h != null ? `${rain24h.toFixed(1)} mm` : 'em coleta',
    color: rainColor(rain24h),
    hint: 'Soma das últimas 24h. Atualiza automaticamente.',
  })

  chips.push({
    key: 'trend',
    label: 'Tendência',
    value: `${trendIcon(trend)} ${trendLabel(trend)}`,
    hint: 'Comparação com a leitura anterior do pluviômetro',
  })

  // 2. Meteo — APAC pode não ter estação meteorologia24h na RMR;
  //    nesse caso temp/umidade vêm da climatologia (média histórica)
  if (meteoOk) {
    chips.push({
      key: 'humidity',
      label: 'Umidade',
      value: humidity != null ? `${humidity}% · ${humidityLabel(humidity)}` : 'indisponível',
      color: humidityColor(humidity),
    })
    chips.push({
      key: 'temp',
      label: 'Temperatura',
      value: temp != null ? `${temp}°C` : 'indisponível',
      hint: source === 'climatologico' ? 'Média climatológica (sem estação ativa)' : undefined,
    })
    chips.push({
      key: 'wind',
      label: 'Vento',
      value: wind != null ? `${wind} km/h` : 'indisponível',
    })
  } else {
    chips.push({
      key: 'meteo',
      label: 'Estação meteo',
      value: 'sem leitura agora',
      hint: 'Nenhuma estação meteo APAC ativa para este ponto',
    })
  }

  return (
    <div
      ref={barRef}
      className="chips-bar scroll-x"
      style={{ cursor: 'grab' }}
      aria-label="Métricas APAC"
      tabIndex={0}
    >
      {chips.map(c => (
        <MetricChip
          key={c.key}
          label={c.label}
          value={c.value}
          color={c.color}
          light={light}
          hint={c.hint}
        />
      ))}
    </div>
  )
}
