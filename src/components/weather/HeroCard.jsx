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

const SOURCE_LABEL = {
  cemaden:         'CEMADEN',
  meteorologia24h: 'EST. METEO',
  climatologico:   'CLIMATOLOGIA',
  unavailable:     'OFFLINE',
}

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

  const stationName = weather.station_name || 'Estação indisponível'
  const stationDist = weather.station_distance_m
  const source      = SOURCE_LABEL[weather.source] || 'APAC'
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

      {/* Linha vento · chuva atual */}
      <div
        className="hero-windrow"
        style={{ borderTop: `1px solid ${divLine}` }}
        aria-label={`Vento ${wind ?? '—'} km/h, chuva ${formatNumber(rain1h)} mm/h`}
      >
        <WindCompass deg={0} light={light} size={40} />
        <div className="hero-wind-info">
          <div className="hero-wind-value">
            <span style={{ color: tc }}>{wind ?? '—'}</span>
            <span style={{ color: tc2 }}>km/h</span>
          </div>
          <div style={{ color: tc3 }}>vento</div>
        </div>
        <div className="hero-precip" style={{ textAlign: 'right' }}>
          {rain1h != null && rain1h > 0 ? (
            <>
              <div style={{ color: tc3, fontSize: '9px', letterSpacing: '.06em', textTransform: 'uppercase' }}>Chuva agora</div>
              <div style={{ color: acc }}>{formatNumber(rain1h)}</div>
              <div style={{ color: tc3 }}>mm/h</div>
            </>
          ) : (
            <div style={{ color: tc3, fontSize: '11px' }}>Sem chuva agora</div>
          )}
        </div>
      </div>

      {/* Rodapé: estação APAC + freshness */}
      <div
        className="hero-source"
        style={{
          borderTop: `1px solid ${divLine}`,
          color: tc3,
        }}
      >
        <span className="hero-source-badge" style={{ color: acc, borderColor: `${acc}40` }}>
          {source}
        </span>
        <span className="hero-source-text" style={{ color: tc2 }}>
          {stationName}
          {stationDist != null && (
            <span style={{ color: tc3 }}> · {(stationDist / 1000).toFixed(1)} km</span>
          )}
        </span>
        <span
          className={`hero-source-fresh${stale ? ' is-stale' : ''}`}
          style={{ color: stale ? '#ef4444' : tc2 }}
          title={weather.captured_at || ''}
        >
          {freshness}
        </span>
      </div>

      {rain24h != null && (
        <div
          className="hero-rain24"
          style={{
            borderTop: `1px solid ${divLine}`,
            color: tc2,
          }}
        >
          <span>Acumulado 24h</span>
          <strong style={{ color: tc }}>{formatNumber(rain24h)} mm</strong>
        </div>
      )}
    </div>
  )
}
