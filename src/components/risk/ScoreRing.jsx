import { useState, useEffect, useRef } from 'react'

/* ════════════════════════════════════════════════════
   ScoreRing — SVG circular animado com efeitos:
   • Count-up no número (animação 0 → score em ~1.1s)
   • Anel dashed rotativo no fundo (18s/volta)
   • Glow pulsante na cor do risco
   • Shockwave concêntrico quando risco >= ALTO/SEVERO (75+)
   ════════════════════════════════════════════════════ */

const scoreColor = s => s < 25 ? '#22c55e' : s < 45 ? '#eab308' : s < 65 ? '#f97316' : s < 80 ? '#ef4444' : '#a855f7'
const scoreLabel = s => s < 25 ? 'Seguro'  : s < 45 ? 'Atenção' : s < 65 ? 'Moderado' : s < 80 ? 'Alto'    : 'Severo'

function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0)
  const startRef = useRef(0)

  useEffect(() => {
    const from  = startRef.current
    const start = performance.now()
    let raf
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)             // ease-out-cubic
      const v = Math.round(from + (target - from) * eased)
      setValue(v)
      if (t < 1) raf = requestAnimationFrame(tick)
      else startRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}

export function ScoreRing({ risk, score: scoreProp, nivel: nivelProp, light = false, size = 72, thick = 4, animated = true }) {
  /* Compat: aceita <ScoreRing risk={...}/> ou <ScoreRing score nivel/> */
  const score = scoreProp ?? risk?.score ?? 0
  const nivel = nivelProp ?? risk?.nivel ?? scoreLabel(score).toUpperCase()

  const r          = (size / 2) - (thick + 2)
  const rOuter     = (size / 2) - 1
  const circ       = 2 * Math.PI * r
  const clamped    = Math.max(0, Math.min(100, score))
  const offset     = circ - (clamped / 100) * circ
  const color      = scoreColor(clamped)
  const displayed  = animated ? useCountUp(clamped) : clamped
  const isHigh     = clamped >= 65
  const isSevere   = clamped >= 80

  return (
    <div
      className={`score-ring${isHigh ? ' is-high' : ''}${isSevere ? ' is-severe' : ''}`}
      style={{ width: size + 8, height: size + 8 }}
    >
      {/* Ambient glow halo */}
      <div
        aria-hidden="true"
        className="score-ring-halo"
        style={{
          background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
          animationDuration: isHigh ? '1.4s' : '3s',
        }}
      />

      {/* Shockwave (only when risk is severe) */}
      {isSevere && (
        <>
          <div aria-hidden="true" className="score-ring-shockwave" style={{ borderColor: color }} />
          <div aria-hidden="true" className="score-ring-shockwave" style={{ borderColor: color, animationDelay: '.9s' }} />
        </>
      )}

      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        aria-label={`Hydra Score ${score}, ${nivel}`}
        style={{ position: 'relative' }}
      >
        {/* Outer dashed ring (rotating) */}
        <g className="score-ring-outer">
          <circle
            cx={size / 2} cy={size / 2} r={rOuter}
            fill="none"
            stroke={color} strokeOpacity=".25" strokeWidth="0.8"
            strokeDasharray="3 5"
          />
        </g>

        {/* Track + animated fill */}
        <g style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={light ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.08)'}
            strokeWidth={thick}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={color} strokeWidth={thick}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1), stroke .5s ease',
              filter: `drop-shadow(0 0 6px ${color}88) drop-shadow(0 0 14px ${color}44)`,
            }}
          />
          {/* Tick at current position */}
          <circle
            cx={size / 2 + r * Math.cos(2 * Math.PI * (clamped / 100) - Math.PI / 2)}
            cy={size / 2 + r * Math.sin(2 * Math.PI * (clamped / 100) - Math.PI / 2)}
            r={thick / 1.4}
            fill={color}
            style={{
              filter: `drop-shadow(0 0 4px ${color})`,
              transition: 'cx 1.1s, cy 1.1s, fill .5s',
            }}
          />
        </g>
      </svg>

      <div className="score-ring-text">
        <div
          className="score-ring-number"
          style={{
            fontSize: Math.round(size * 0.28),
            color,
            textShadow: isHigh ? `0 0 12px ${color}66` : 'none',
          }}
        >
          {displayed}
        </div>
        {nivel && (
          <div
            className="score-ring-label"
            style={{
              fontSize: Math.max(8, Math.round(size * 0.115)),
              color: light ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.55)',
            }}
          >
            {nivel}
          </div>
        )}
      </div>
    </div>
  )
}

ScoreRing.scoreColor = scoreColor
ScoreRing.scoreLabel = scoreLabel
