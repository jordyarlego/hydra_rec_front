import { ScoreRing } from '../risk/ScoreRing.jsx'
import { WindCompass } from './WindCompass.jsx'
import { AtmosphericBg } from '../effects/AtmosphericBg.jsx'

/* ════════════════════════════════════════════════════
   HeroCard — APAC-native
   Lê do novo shape data.weather (enrich_weather no backend):
     rain_1h_mm, rain_24h_mm, temp_c, humidity_pct, wind_kmh,
     condition, rain_level, is_day, is_stale, freshness_s,
     station_name, station_distance_m, source, captured_at.
   HydraScore (risk.score) é o elemento central.
   ════════════════════════════════════════════════════ */

const RAIN_LEVEL_LABEL = {
  none:     'Sem chuva',
  leve:     'Chuva leve',
  moderada: 'Chuva moderada',
  forte:    'Chuva forte',
  severa:   'Chuva severa',
}

// Mapeia rain_level → condition (esperado pelo AtmosphericBg)
function rainLevelToCondition(level) {
  if (level === 'severa' || level === 'forte') return 'Chuva com Trovoadas'
  if (level === 'moderada') return 'Chuva Moderada'
  if (level === 'leve')     return 'Nublado com Chuviscos'
  return 'Ensolarado'
}

function formatFreshness(seconds) {
  if (seconds == null) return '—'
  if (seconds < 60)    return 'agora'
  if (seconds < 3600)  return `há ${Math.floor(seconds / 60)} min`
  return `há ${Math.floor(seconds / 3600)} h`
}

function formatExactTime(captured_at) {
  if (!captured_at) return null
  try {
    return new Date(captured_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return null }
}

function prettyStation(raw) {
  // Strip "Janga 2" → "Janga"; "BOA VIAGEM" → "Boa Viagem"
  if (!raw) return ''
  let s = String(raw).trim()
  s = s.replace(/\s+\d+\s*$/, '')
  if (/[A-Z]{3,}/.test(s) && s === s.toUpperCase()) {
    s = s.split(' ').map(w => {
      const l = w.toLowerCase()
      if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(l)) return l
      return w.charAt(0) + w.slice(1).toLowerCase()
    }).join(' ')
    s = s.charAt(0).toUpperCase() + s.slice(1)
  }
  return s
}

function formatNumber(value, digits = 1, fallback = '—') {
  if (value == null || Number.isNaN(Number(value))) return fallback
  return Number(value).toFixed(digits)
}

export function HeroCard({ bairro, weather, risk, light = false, onExplain }) {
  if (!weather || !risk) return null

  const rainLevel = weather.rain_level || 'none'
  const condition = rainLevelToCondition(rainLevel)
  const isNight   = weather.is_day === false

  const temp      = weather.temp_c       != null ? Math.round(weather.temp_c)       : null
  const humidity  = weather.humidity_pct != null ? Math.round(weather.humidity_pct) : null
  const wind      = weather.wind_kmh     != null ? Math.round(weather.wind_kmh)     : null
  const rain1h    = weather.rain_1h_mm
  const rain24h   = weather.rain_24h_mm

  const stationName = prettyStation(weather.station_name) || 'Estação indisponível'
  const stationDist = weather.station_distance_m
  const exactTime   = formatExactTime(weather.captured_at)
  const freshness   = formatFreshness(weather.freshness_s)
  const stale       = weather.is_stale === true

  /* Theme tokens */
  const tc  = light ? '#0d0e11'           : '#fff'
  const tc2 = light ? 'rgba(0,0,0,.55)'   : 'rgba(255,255,255,.55)'
  const tc3 = light ? 'rgba(0,0,0,.32)'   : 'rgba(255,255,255,.32)'
  const acc = light ? '#c97820'           : '#e8a030'
  const divLine = light ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.06)'

  return (
    <div className="hero-card fade-in" key={`${bairro}-hero`}>
      <AtmosphericBg condition={condition} light={light} isNight={isNight} />

      {/* Linha cidade */}
      <div className="hero-city" style={{ color: tc3 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={tc3} strokeWidth="1.8" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Recife · PE</span>
      </div>

      {/* Bairro */}
      <h2 className="hero-bairro" style={{ color: tc }}>{bairro}</h2>

      {/* Bloco principal: condição/temp à esquerda · HydraScore à direita */}
      <div className="hero-main">
        <div className="hero-left">
          <div className="hero-condition" style={{ color: light ? 'rgba(0,0,0,.7)' : 'rgba(255,255,255,.8)' }}>
            {RAIN_LEVEL_LABEL[rainLevel] || weather.condition || '—'}
          </div>
          <div className="hero-temp" style={{ color: tc }}>
            {temp != null ? `${temp}°` : '—'}
          </div>
          <div className="hero-feels" style={{ color: tc2 }}>
            {humidity != null ? `${humidity}% umidade` : 'umidade indisponível'}
          </div>
        </div>
        <div className="hero-ring">
          <ScoreRing risk={risk} light={light} size={76} />
          <div className="hero-ring-label">Hydra Score</div>
          {onExplain && (
            <button
              type="button"
              className="score-why-btn"
              onClick={onExplain}
              aria-label="Explicar por que esse score"
            >
              Por que?
            </button>
          )}
        </div>
      </div>

      {/* Linha vento · chuva — só mostra se tem algum dado */}
      {(wind != null || (rain1h != null)) && (
        <div
          className="hero-windrow"
          style={{ borderTop: `1px solid ${divLine}` }}
          aria-label={`${wind != null ? `Vento ${wind} km/h` : ''}${rain1h != null ? `, chuva ${formatNumber(rain1h)} mm/h` : ''}`}
        >
          {wind != null && (
            <>
              <WindCompass deg={0} light={light} size={40} />
              <div className="hero-wind-info">
                <div className="hero-wind-value">
                  <span style={{ color: tc }}>{wind}</span>
                  <span style={{ color: tc2 }}>km/h</span>
                </div>
                <div style={{ color: tc3 }}>vento</div>
              </div>
            </>
          )}
          <div className="hero-precip" style={{ textAlign: 'right', marginLeft: 'auto' }}>
            {rain1h != null && rain1h >= 0.2 ? (
              <>
                <span className="hero-precip-label" style={{ color: tc3 }}>Chovendo</span>
                <span className="hero-precip-value" style={{ color: acc, whiteSpace: 'nowrap' }}>
                  <span className="hero-precip-num">{formatNumber(rain1h)}</span>
                  <span className="hero-precip-unit" style={{ color: tc3 }}> mm/h</span>
                </span>
              </>
            ) : rain1h != null ? (
              <span className="hero-precip-label" style={{ color: tc3 }}>Sem chuva agora</span>
            ) : null}
          </div>
        </div>
      )}

      {/* Rodapé: estação + hora da última leitura */}
      <div
        className="hero-source"
        style={{
          borderTop: `1px solid ${divLine}`,
          color: tc3,
        }}
        title={`Última leitura: ${freshness}${weather.captured_at ? ` (${weather.captured_at})` : ''}`}
      >
        <span className="hero-source-text" style={{ color: tc2 }}>
          {stationName}
          {stationDist != null && (
            <span style={{ color: tc3 }}> · {(stationDist / 1000).toFixed(1)} km</span>
          )}
        </span>
        <span
          className={`hero-source-fresh${stale ? ' is-stale' : ''}`}
          style={{ color: stale ? '#ef4444' : tc2 }}
        >
          {exactTime ? `atualizado ${exactTime}` : freshness}
        </span>
      </div>

      {rain24h != null && rain24h >= 0.1 && (
        <div
          className="hero-rain24"
          style={{
            borderTop: `1px solid ${divLine}`,
            color: tc2,
          }}
        >
          <span>Choveu nas últimas 24h</span>
          <strong style={{ color: tc }}>{formatNumber(rain24h)} mm</strong>
        </div>
      )}
    </div>
  )
}
