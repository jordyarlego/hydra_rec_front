import { useState } from 'react'
import { Info } from '@phosphor-icons/react'
import { ScoreRing } from '../risk/ScoreRing.jsx'
import { AtmosphericBg } from '../effects/AtmosphericBg.jsx'
import { exactTimeRecife, timeAgoFromApac } from '../../lib/apacTime.js'

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

/* Usa exactTimeRecife do lib/apacTime — defensivo contra strings APAC
   sem timezone. Sempre converte pra America/Recife. */
const formatExactTime = exactTimeRecife

export function HeroCard({ bairro, weather, risk, light = false, onExplain }) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  if (!weather || !risk) return null

  const rainLevel = weather.rain_level || 'none'
  const condition = rainLevelToCondition(rainLevel)
  const isNight   = weather.is_day === false

  const temp     = weather.temp_c       != null ? Math.round(weather.temp_c)       : null
  const humidity = weather.humidity_pct != null ? Math.round(weather.humidity_pct) : null
  const meteoSuspect = weather.meteo_suspect === true
  const rain1h   = weather.rain_1h_mm

  const stationName = prettyStation(weather.station_name) || 'Estação indisponível'
  const stationDist = weather.station_distance_m
  const exactTime   = formatExactTime(weather.captured_at)
  const ago         = timeAgoFromApac(weather.captured_at)
  const stale       = weather.is_stale === true

  // Detalhe das fontes pra explicar divergência com Google/site APAC oficial
  const rainStation  = weather.rain_station
  const meteoStation = weather.meteo_station
  const hasMultipleSources = rainStation && meteoStation && rainStation.id !== meteoStation.id

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
            <div className={`hero-feels${meteoSuspect ? ' is-suspect' : ''}`}>
              {humidity}% umidade
              {meteoSuspect && (
                <span
                  className="hero-feels-warn"
                  title="Combinação umidade/temperatura improvável — sensor pode estar saturado. Próxima leitura confiável da APAC pode demorar."
                  aria-label="Leitura possivelmente saturada"
                >
                  {' '}⚠
                </span>
              )}
            </div>
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
        <span className="hero-source-station">
          {stationName}
          {stationDist != null && <> · {(stationDist / 1000).toFixed(1)} km</>}
          {(hasMultipleSources || rainStation || meteoStation) && (
            <button
              type="button"
              className="hero-source-info-btn"
              onClick={() => setSourcesOpen(o => !o)}
              aria-label="Explicar fontes dos dados"
              aria-expanded={sourcesOpen}
            >
              <Info size={11} weight="bold" />
            </button>
          )}
        </span>
        <span
          className={stale ? 'is-stale' : ''}
          title={stale ? 'CEMADEN só publica nova leitura quando há evento (chuva, vento). Em dia seco, pode ficar parado por horas.' : ''}
        >
          {exactTime ? `${exactTime}` : 'agora'}
          {ago && <span className="hero-source-ago"> · {ago}</span>}
        </span>
      </div>

      {sourcesOpen && (
        <div className="hero-source-detail" role="region" aria-label="Detalhes das fontes">
          <p className="hero-source-detail-title">De onde vem cada número</p>
          <ul className="hero-source-detail-list">
            {rainStation && (
              <li>
                <strong>Chuva:</strong> {prettyStation(rainStation.name)}
                {rainStation.distance_m != null && (
                  <span className="hero-source-detail-dist">
                    {' '}· {(rainStation.distance_m / 1000).toFixed(1)} km · CEMADEN
                  </span>
                )}
              </li>
            )}
            {meteoStation && (
              <li>
                <strong>Temperatura, umidade, vento:</strong> {prettyStation(meteoStation.name)}
                {meteoStation.distance_m != null && (
                  <span className="hero-source-detail-dist">
                    {' '}· {(meteoStation.distance_m / 1000).toFixed(1)} km · APAC
                  </span>
                )}
              </li>
            )}
          </ul>
          <p className="hero-source-detail-note">
            Cada estação física mede só algumas variáveis. Pegamos a mais
            próxima do bairro selecionado. Por isso pode divergir do Google
            (que usa modelo global suavizado) ou do site oficial APAC (que
            cita a sede em Santo Amaro).
          </p>
        </div>
      )}
    </div>
  )
}
