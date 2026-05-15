import { getRiskLevel } from '../../lib/riskColors.js'

function hourLabel(slot) {
  if (slot.time) {
    const d = new Date(slot.time)
    return `${String(d.getHours()).padStart(2, '0')}h`
  }
  return `+${slot.hour_offset}h`
}

/* ── SVG line chart ──────────────────────────────────── */
function LineChart({ slots, light }) {
  const W = 260
  const H = 72
  const padL = 6
  const padR = 6
  const padT = 20
  const padB = 2
  const n = slots.length
  if (n < 2) return null

  const maxS = Math.max(...slots.map(s => s.score), 1)
  const minS = Math.min(...slots.map(s => s.score), 0)
  const range = Math.max(maxS - minS, 10)

  const pts = slots.map((s, i) => {
    const x = padL + (i / (n - 1)) * (W - padL - padR)
    const y = padT + (1 - (s.score - minS) / range) * (H - padT - padB)
    return { x, y, slot: s }
  })

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaD = `${pathD} L ${pts[n - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`

  const stroke = light ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.12)'
  const textFill = light ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.4)'

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: H, overflow: 'visible', display: 'block' }}
      aria-hidden="true"
    >
      {/* Area fill */}
      <defs>
        <linearGradient id="rf-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#rf-area-grad)" />

      {/* Line */}
      <path d={pathD} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />

      {/* Points + labels */}
      {pts.map(({ x, y, slot }, i) => {
        const lvl = getRiskLevel(slot.score)
        const label = hourLabel(slot)
        return (
          <g key={i}>
            {/* Score above dot */}
            <text
              x={x} y={y - 8}
              textAnchor="middle"
              fontSize="10"
              fontWeight="650"
              fill={lvl.color}
            >
              {slot.score}
            </text>
            {/* Glow dot */}
            <circle cx={x} cy={y} r={5} fill={lvl.color} opacity="0.18" />
            <circle cx={x} cy={y} r={3} fill={lvl.color} />
            {/* Hour label below */}
            <text
              x={x} y={H - 1}
              textAnchor="middle"
              fontSize="9"
              fill={textFill}
            >
              {label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ── Source breakdown footer ────────────────────────── */
function SourcesFooter({ forecast, light }) {
  const sources = forecast?.sources_used
  if (!sources?.length) return null

  const slots = forecast.forecast || []
  const avgOm  = slots.length ? (slots.reduce((s, sl) => s + (sl.precip_om_mm ?? 0), 0) / slots.length).toFixed(1) : '—'
  const avgOwm = slots.some(sl => sl.precip_owm_mm != null)
    ? (slots.reduce((s, sl) => s + (sl.precip_owm_mm ?? 0), 0) / slots.filter(sl => sl.precip_owm_mm != null).length).toFixed(1)
    : null

  const dim = light ? 'rgba(0,0,0,.38)' : 'rgba(255,255,255,.32)'
  const acc = light ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.55)'

  return (
    <div style={{ marginTop: 10, borderTop: `1px solid ${light ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.06)'}`, paddingTop: 8 }}>
      <div style={{ fontSize: 10, color: dim, letterSpacing: '.04em', marginBottom: 4 }}>
        FONTES CRUZADAS
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
        {sources.map((s, i) => (
          <span key={i} style={{ fontSize: 10, color: acc }}>
            {s === 'Open-Meteo' && `Open-Meteo ${avgOm}mm/h méd`}
            {s === 'OpenWeatherMap' && avgOwm && `OWM ${avgOwm}mm/h méd`}
            {s.startsWith('INMET') && `${s} (observação oficial)`}
            {!['Open-Meteo', 'OpenWeatherMap'].includes(s) && !s.startsWith('INMET') && s}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── Explanation summary ────────────────────────────── */
function ForecastExplanation({ slots, light }) {
  if (!slots?.length) return null

  const avgScore = Math.round(slots.reduce((s, sl) => s + sl.score, 0) / slots.length)
  const maxSlot  = slots.reduce((a, b) => b.score > a.score ? b : a)
  const minSlot  = slots.reduce((a, b) => b.score < a.score ? b : a)
  const maxMm    = Math.max(...slots.map(sl => sl.precip_om_mm ?? 0))
  const lvl      = getRiskLevel(avgScore)
  const spread   = maxSlot.score - minSlot.score

  const dim  = light ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.4)'
  const acc  = light ? 'rgba(0,0,0,.62)' : 'rgba(255,255,255,.62)'

  // Quando a variação é baixa E não há chuva prevista, explica o MOTIVO do score
  let context = ''
  if (maxMm < 2 && avgScore >= 25) {
    context = `Score ${avgScore}/100 reflete umidade alta e histórico do bairro — sem chuva prevista nas próximas 6h.`
  } else if (maxMm >= 2) {
    const peakSlot = slots.reduce((a, b) => (b.precip_om_mm ?? 0) > (a.precip_om_mm ?? 0) ? b : a)
    if (spread >= 10) {
      context = `Chuva de ${maxMm.toFixed(1)}mm prevista às ${hourLabel(peakSlot)} eleva o risco para ${maxSlot.score}/100.`
    } else {
      context = `Chuva de ${maxMm.toFixed(1)}mm prevista às ${hourLabel(peakSlot)} — risco estável em ${avgScore}/100 (${lvl.label}).`
    }
  } else {
    context = `Sem precipitação prevista — risco em ${avgScore}/100 (${lvl.label}) por fatores estruturais do bairro.`
  }

  return (
    <p style={{ fontSize: 10.5, color: acc, marginTop: 7, lineHeight: 1.6, letterSpacing: '.01em' }}>
      {context}
    </p>
  )
}

/* ── Main component ─────────────────────────────────── */
export function RiskForecast({ forecast, loading, error, light = false }) {
  if (loading) {
    return (
      <div className="risk-forecast" aria-live="polite" aria-busy="true">
        <div className="risk-forecast-header">
          <span className="rf-title">Previsão de risco — 6h</span>
          <span className="rf-badge">Multi-fonte</span>
        </div>
        <div className="rf-loading">
          <span className="rf-dot" /><span className="rf-dot" /><span className="rf-dot" />
        </div>
      </div>
    )
  }

  if (error || !forecast?.forecast?.length) {
    return (
      <div className="risk-forecast">
        <div className="risk-forecast-header">
          <span className="rf-title">Previsão de risco — 6h</span>
        </div>
        <p className="rf-error" role="alert">Previsão indisponível</p>
      </div>
    )
  }

  const slots    = forecast.forecast
  const trend    = slots[slots.length - 1].score - slots[0].score
  const trendLabel = trend > 5 ? '↑ Risco aumentando' : trend < -5 ? '↓ Risco diminuindo' : '→ Risco estável'
  const trendColor = trend > 5 ? '#ef4444' : trend < -5 ? '#22c55e' : '#e8a030'
  const sourcesTitle = forecast.sources_used?.join(' · ') ?? 'Multi-fonte'

  return (
    <section
      className={`risk-forecast${light ? ' light' : ''}`}
      aria-label="Previsão de risco para as próximas 6 horas"
    >
      <div className="risk-forecast-header">
        <span className="rf-title">Previsão de risco — 6h</span>
        <span className="rf-badge" title={sourcesTitle}>
          {forecast.fallback ? 'Fallback' : `${forecast.sources_used?.length ?? 1} fontes`}
        </span>
      </div>

      <LineChart slots={slots} light={light} />

      <ForecastExplanation slots={slots} light={light} />

      <div className="rf-trend" style={{ color: trendColor, marginTop: 4 }}>
        {trendLabel}
      </div>

      {forecast.warning && (
        <p className="rf-warning">{forecast.warning}</p>
      )}

      <SourcesFooter forecast={forecast} light={light} />
    </section>
  )
}
