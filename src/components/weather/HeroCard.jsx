import { ScoreRing } from '../risk/ScoreRing.jsx'
import { AtmosphericBg } from '../effects/AtmosphericBg.jsx'

/* ════════════════════════════════════════════════════
   HeroCard v3 — MANTÉM A LINHA DE CHUVA (mm/h).
   O user falou que essa info "tava avulsa/estranha" no v2
   mas QUER manter o dado. A solução é só refinar o estilo
   da linha pra parecer parte do card (não pendurada).

   • Linha "CHUVA LEVE" em cima (condition)
   • Temp + umidade
   • À direita: ScoreRing + "HYDRA SCORE" + "Por quê?"
   • Linha "CHOVENDO X mm/h" alinhada à direita,
     separada por hairline
   • Footer "Torreão · 3.3 km · atualizado 14:50"
   ════════════════════════════════════════════════════ */

const RAIN_LEVEL_LABEL = {
  none:     'Sem chuva',
  leve:     'Chuva leve',
  moderada: 'Chuva moderada',
  forte:    'Chuva forte',
  severa:   'Chuva severa',
}

function rainLevelToCondition(level) {
  if (level === 'severa' || level === 'forte') return 'Chuva com Trovoadas'
  if (level === 'moderada') return 'Chuva Moderada'
  if (level === 'leve')     return 'Nublado com Chuviscos'
  return 'Ensolarado'
}

function prettyStation(raw) {
  if (!raw) return ''
  let s = String(raw).trim().replace(/\s+\d+\s*$/, '')
  if (/[A-Z]{3,}/.test(s) && s === s.toUpperCase()) {
    s = s.split(' ').map(w => {
      const l = w.toLowerCase()
      if (['de','da','do','das','dos','e'].includes(l)) return l
      return w.charAt(0) + w.slice(1).toLowerCase()
    }).join(' ')
    s = s.charAt(0).toUpperCase() + s.slice(1)
  }
  return s
}

function formatExactTime(captured_at) {
  if (!captured_at) return null
  try {
    return new Date(captured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return null }
}

export function HeroCard({ bairro, weather, risk, light = false, onExplain }) {
  if (!weather || !risk) return null

  const rainLevel = weather.rain_level || 'none'
  const condition = rainLevelToCondition(rainLevel)
  const isNight   = weather.is_day === false

  const temp     = weather.temp_c       != null ? Math.round(weather.temp_c)       : null
  const humidity = weather.humidity_pct != null ? Math.round(weather.humidity_pct) : null
  const rain1h   = weather.rain_1h_mm

  const stationName = prettyStation(weather.station_name) || 'Estação indisponível'
  const stationDist = weather.station_distance_m
  const exactTime   = formatExactTime(weather.captured_at)
  const stale       = weather.is_stale === true

  return (
    <div className="hero-card" key={`${bairro}-hero`}>
      <AtmosphericBg condition={condition} light={light} isNight={isNight} />

      <div className="hero-city">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Recife · PE</span>
      </div>

      <h2 className="hero-bairro">{bairro}</h2>

      <div className="hero-main">
        <div className="hero-left">
          <div className="hero-condition">{RAIN_LEVEL_LABEL[rainLevel] || weather.condition || '—'}</div>
          <div className="hero-temp">{temp != null ? `${temp}°` : '—'}</div>
          {humidity != null && (
            <div className="hero-feels">{humidity}% umidade</div>
          )}
        </div>
        <div className="hero-ring-wrap">
          <ScoreRing risk={risk} light={light} size={84} />
          <div className="hero-ring-label">HYDRA SCORE</div>
          {onExplain && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ height: 24, padding: '0 10px', fontSize: 11, marginTop: 2 }}
              onClick={onExplain}
              aria-label="Explicar por que esse score"
            >
              Por quê?
            </button>
          )}
        </div>
      </div>

      {/* Linha "CHOVENDO X mm/h" — mantida (user quer manter).
          Só visualmente integrada (hairline acima) em vez de "avulsa". */}
      {rain1h != null && rain1h >= 0.1 && (
        <div className="hero-rain-row">
          <span className="hero-rain-label">CHOVENDO</span>
          <span className="hero-rain-value">
            <strong>{rain1h.toFixed(1)}</strong>
            <span> mm/h</span>
          </span>
        </div>
      )}

      <div className="hero-source">
        <span>
          {stationName}
          {stationDist != null && <> · {(stationDist / 1000).toFixed(1)} km</>}
        </span>
        <span className={stale ? 'is-stale' : ''}>
          {exactTime ? `atualizado ${exactTime}` : 'agora'}
        </span>
      </div>
    </div>
  )
}
