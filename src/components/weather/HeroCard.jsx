import { ScoreRing } from '../risk/ScoreRing.jsx'
import { WindCompass } from './WindCompass.jsx'
import { AtmosphericBg } from '../effects/AtmosphericBg.jsx'

/* ════════════════════════════════════════════════════
   HeroCard — cabeçalho do bairro com temp gigante + score
   Props derivam diretamente do useDashboard:
     bairro      string
     condition   string  (derivada de wmoToCondition)
     current     dashboard.weather.current
     risk        dashboard.risk
     rawValues   risk.rawValues
   ════════════════════════════════════════════════════ */

export function HeroCard({ bairro, condition, current, risk, light = false, onExplain }) {
  if (!current || !risk) return null

  const temp     = Math.round(current.temperature_2m ?? 0)
  const feels    = Math.round(current.apparent_temperature ?? temp)
  const humidity = Math.round(current.relative_humidity_2m ?? 0)
  const wind     = Math.round(current.wind_speed_10m ?? 0)
  const windDeg  = current.wind_direction_10m ?? 0
  const precip   = current.precipitation ?? 0
  const rawValues = risk.rawValues || risk.raw_values || {}
  const rajada   = Math.round(rawValues.rajadaVento ?? rawValues.rajada_vento ?? wind + 8)

  const tc  = light ? '#0d0e11'           : '#fff'
  const tc2 = light ? 'rgba(0,0,0,.5)'    : 'rgba(255,255,255,.5)'
  const tc3 = light ? 'rgba(0,0,0,.32)'   : 'rgba(255,255,255,.32)'
  const acc = light ? '#c97820'           : '#e8a030'
  const divLine = light ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.06)'

  return (
    <div className="hero-card fade-in" key={`${bairro}-hero`}>
      <AtmosphericBg condition={condition} light={light} />

      {/* City line */}
      <div className="hero-city" style={{ color: tc3 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={tc3} strokeWidth="1.8" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Recife · PE</span>
      </div>

      {/* Bairro */}
      <h2 className="hero-bairro" style={{ color: tc }}>{bairro}</h2>

      {/* Condition + temp + ring */}
      <div className="hero-main">
        <div className="hero-left">
          <div className="hero-condition" style={{ color: light ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.8)' }}>
            {condition}
          </div>
          <div className="hero-temp" style={{ color: tc }}>{temp}°</div>
          <div className="hero-feels" style={{ color: tc2 }}>
            Sensação {feels}° · {humidity}% umidade
          </div>
        </div>
        <div className="hero-ring">
          <ScoreRing risk={risk} light={light} size={76} />
          <div className="hero-ring-label" style={{ color: tc3 }}>Hydra Score</div>
          {onExplain && (
            <button
              type="button"
              className="score-why-btn"
              onClick={onExplain}
              title="Por que esse score?"
              aria-label="Explicar pontuação"
              style={{ color: tc3 }}
            >
              Por que?
            </button>
          )}
        </div>
      </div>

      {/* Wind / precip row */}
      <div className="hero-windrow" style={{ borderTop: `1px solid ${divLine}` }}>
        <WindCompass deg={windDeg} light={light} size={40} />
        <div className="hero-wind-info">
          <div className="hero-wind-value">
            <span style={{ color: tc }}>{wind}</span>
            <span style={{ color: tc2 }}>km/h</span>
          </div>
          <div style={{ color: tc3 }}>Rajadas {rajada} km/h</div>
        </div>
        <div className="hero-precip" style={{ textAlign: 'right' }}>
          {precip > 0 ? (
            <>
              <div style={{ color: acc }}>{precip.toFixed(1)}</div>
              <div style={{ color: tc3 }}>mm/h</div>
            </>
          ) : (
            <div style={{ color: tc3, fontSize: '11px' }}>Sem chuva</div>
          )}
        </div>
      </div>
    </div>
  )
}
