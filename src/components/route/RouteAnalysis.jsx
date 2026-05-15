import { useState, useEffect, useRef } from 'react'
import {
  Bicycle, Car, Footprints, NavigationArrow,
  MapPin, ArrowsDownUp, WarningCircle,
} from '@phosphor-icons/react'
import { BAIRRO_COORDS } from '../../data/bairro_coords.js'
import { useRoute } from '../../hooks/useRoute.js'
import { soundMgr } from '../../lib/soundManager.js'

/* ── Constants ─────────────────────────────────────────────────────────────── */

const LEVEL = {
  BAIXO: { label: 'Risco baixo',  color: '#22c55e' },
  MEDIO: { label: 'Risco médio',  color: '#f97316' },
  ALTO:  { label: 'Risco alto',   color: '#ef4444' },
}

const SEV_COLOR   = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }
const ALERT_COLOR = { vermelho: '#ef4444', laranja: '#f97316', amarelo: '#eab308', azul: '#3b82f6' }

const APAC_DESC = {
  SEVERO:   'chuva severa — alto risco de alagamento',
  ALTO:     'chuva forte — risco moderado a alto',
  MODERADO: 'chuva moderada — atenção em pontos baixos',
  ATENCAO:  'atenção preventiva — chuva possível',
  SEGURO:   'sem alertas — tempo seguro',
}

const APAC_COLOR = {
  SEVERO:   '#ef4444',
  ALTO:     '#f97316',
  MODERADO: '#eab308',
  ATENCAO:  '#3b82f6',
  SEGURO:   '#22c55e',
}

const MODES = [
  { id: 'driving-car',    icon: Car,       label: 'Carro' },
  { id: 'cycling-regular', icon: Bicycle,  label: 'Bike'  },
  { id: 'foot-walking',   icon: Footprints, label: 'A pé' },
]

/* ── Nominatim geocoding hook ───────────────────────────────────────────────── */

function useNominatim(query) {
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching]     = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!query || query.length < 3) {
      setSuggestions([])
      return
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const q = /recife|pe\b/i.test(query) ? query : `${query}, Recife, PE`
        const params = new URLSearchParams({
          q,
          format: 'json',
          limit: '5',
          countrycodes: 'br',
          'accept-language': 'pt-BR,pt',
        })
        const r = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'User-Agent': 'HydraRec/2.0 (TCC UFPE 2026; jordyarlego@gmail.com)' },
        })
        const data = await r.json()
        setSuggestions(
          data.map(d => ({
            label: d.display_name
              .replace(/, Região Nordeste, Brasil$/, '')
              .replace(/, Brasil$/, '')
              .replace(/, Pernambuco,/, ','),
            lat: parseFloat(d.lat),
            lon: parseFloat(d.lon),
          }))
        )
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 450)
    return () => clearTimeout(timerRef.current)
  }, [query])

  return { suggestions, searching }
}

/* ── AddressInput ───────────────────────────────────────────────────────────── */

function AddressInput({ label, icon: Icon, value, onChange, placeholder }) {
  const [query, setQuery]   = useState(value?.label || '')
  const [open, setOpen]     = useState(false)
  const wrapRef             = useRef(null)
  const { suggestions, searching } = useNominatim(open ? query : '')

  // When external value resets (e.g. swap), sync query text
  useEffect(() => {
    setQuery(value?.label || '')
  }, [value?.label])

  // Close on outside click
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function handleChange(e) {
    setQuery(e.target.value)
    setOpen(true)
    if (!e.target.value) onChange(null)
  }

  function handleSelect(s) {
    setQuery(s.label)
    setOpen(false)
    onChange(s)
  }

  const showDropdown = open && (searching || suggestions.length > 0)

  return (
    <div ref={wrapRef} className="addr-field">
      <span className="route-label">
        <Icon size={11} weight="fill" aria-hidden="true" /> {label}
      </span>
      <input
        className="addr-input"
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
      {showDropdown && (
        <ul className="addr-suggestions" role="listbox">
          {searching && <li className="addr-searching">Buscando…</li>}
          {!searching && suggestions.map((s, i) => (
            <li
              key={i}
              className="addr-suggestion"
              role="option"
              onMouseDown={() => handleSelect(s)}
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */

function ModeSelector({ value, onChange }) {
  return (
    <div className="route-mode-bar" role="group" aria-label="Modo de transporte">
      {MODES.map(m => {
        const Icon = m.icon
        return (
          <button
            key={m.id}
            type="button"
            className={`route-mode-btn${value === m.id ? ' active' : ''}`}
            onClick={() => onChange(m.id)}
            aria-pressed={value === m.id}
          >
            <Icon size={17} weight={value === m.id ? 'fill' : 'regular'} aria-hidden="true" />
            <span>{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function RouteNarrative({ narrative, modelUsed }) {
  if (!narrative) return null
  // Strip any leaked "Frase X" / "FRASE X" labels from model output
  const lines = narrative
    .split('\n')
    .map(l => l.replace(/^(frase\s*\d+\s*[-:—]?\s*)/i, '').trim())
    .filter(Boolean)
  return (
    <div className="route-narrative">
      <div className="route-narrative-header">
        <span className="route-narrative-badge">IA · {modelUsed || 'local'}</span>
        <span className="route-narrative-title">Análise do trajeto</span>
      </div>
      {lines.map((line, i) => (
        <p key={i} className={`route-narrative-line route-narrative-line-${i}`}>{line}</p>
      ))}
    </div>
  )
}

function alertSevColor(sev) {
  const s = String(sev || '').toLowerCase()
  for (const [k, v] of Object.entries(ALERT_COLOR)) {
    if (s.includes(k)) return v
  }
  return '#f97316'
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export function RouteAnalysis({ currentBairro, consensus, onResult }) {
  const [origin, setOrigin] = useState(null)
  const [dest,   setDest]   = useState(null)
  const [modo,   setModo]   = useState('driving-car')
  const { result, loading, error, analyze } = useRoute()

  // Pre-populate origin from current bairro
  useEffect(() => {
    const coords = BAIRRO_COORDS[currentBairro]
    if (coords) {
      setOrigin({ label: currentBairro, lat: coords[0], lon: coords[1] })
    }
  }, [currentBairro])

  // Bubble result up to App → map
  useEffect(() => {
    if (result) onResult?.(result)
  }, [result]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSwap() {
    soundMgr.playClick()
    setOrigin(dest)
    setDest(origin)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!origin || !dest) return
    soundMgr.playClick()
    analyze({
      originLat:   origin.lat,
      originLon:   origin.lon,
      destLat:     dest.lat,
      destLon:     dest.lon,
      originLabel: origin.label,
      destLabel:   dest.label,
      modo,
      rainNext:    consensus?.rain_next_24h_mm ?? 0,
    })
  }

  const lvl    = LEVEL[result?.risk_level] || LEVEL.BAIXO
  const distKm = result?.distance_km
  const durMin = result?.duration_min

  const canSubmit = origin?.lat != null && dest?.lat != null && !loading

  return (
    <form className="route-analysis" onSubmit={handleSubmit} aria-label="Análise de trajeto">
      <div className="route-section-head">
        <div>
          <span className="route-kicker">Mobilidade</span>
          <strong>Rota inteligente</strong>
        </div>
        <NavigationArrow size={17} weight="fill" aria-hidden="true" />
      </div>

      <ModeSelector value={modo} onChange={setModo} />

      {/* Address inputs */}
      <div className="addr-fields">
        <AddressInput
          label="Origem"
          icon={MapPin}
          value={origin}
          onChange={setOrigin}
          placeholder="Rua, bairro ou ponto de referência…"
        />

        <div className="addr-swap">
          <button
            type="button"
            className="addr-swap-btn"
            onClick={handleSwap}
            aria-label="Inverter origem e destino"
            title="Inverter"
          >
            <ArrowsDownUp size={14} aria-hidden="true" />
          </button>
        </div>

        <AddressInput
          label="Destino"
          icon={MapPin}
          value={dest}
          onChange={setDest}
          placeholder="Para onde vai?"
        />
      </div>

      <button
        type="submit"
        className="route-submit"
        disabled={!canSubmit}
        data-state={loading ? 'loading' : canSubmit ? 'ready' : 'disabled'}
      >
        <NavigationArrow size={14} weight="fill" aria-hidden="true" />
        <span>{loading ? 'Calculando rota…' : 'Calcular rota'}</span>
      </button>

      {error && <p className="route-error" role="alert">{error}</p>}

      {result && !error && (
        <div className="route-result" aria-label="Resultado da análise de trajeto">

          {/* Score badge */}
          <div
            className="route-risk-badge"
            style={{ background: `${lvl.color}18`, border: `1px solid ${lvl.color}40` }}
          >
            <div className="route-risk-left">
              <div className="route-risk-mini-label">Score do trajeto</div>
              <div className="route-risk-score" style={{ color: lvl.color }}>
                {result.risk_score}<small>/100</small>
              </div>
            </div>
            <div className="route-risk-right">
              <span className="route-risk-tag" style={{ color: lvl.color }}>{lvl.label}</span>
              {distKm != null && (
                <span className="route-meta">{distKm} km · {durMin} min</span>
              )}
              {result.apac_nivel && (
                <span
                  className="route-apac-chip"
                  style={{ color: APAC_COLOR[result.apac_nivel] || '#f97316' }}
                  title={`APAC Geoportal — boletim atual para Recife`}
                >
                  APAC: {APAC_DESC[result.apac_nivel] || result.apac_nivel}
                </span>
              )}
            </div>
          </div>

          {/* AI narrative */}
          <RouteNarrative narrative={result.narrative} modelUsed={result.model_used} />

          {/* Alertas ativos INMET */}
          {result.active_alerts?.length > 0 && (
            <div className="active-alerts-wrap">
              <div className="active-alerts-title">
                <WarningCircle size={12} weight="fill" aria-hidden="true" />
                Alertas ativos para PE ({result.active_alerts.length})
              </div>
              {result.active_alerts.map((a, i) => (
                <div key={i} className="active-alert-item">
                  <span className="active-alert-sev" style={{ color: alertSevColor(a.severidade) }}>
                    {a.severidade}
                  </span>
                  <span className="active-alert-evento">{a.evento}</span>
                  <span className="active-alert-src">{a.fonte}</span>
                </div>
              ))}
            </div>
          )}

          {/* Hazards */}
          {result.hazards?.length > 0 ? (() => {
            const active   = result.hazards.filter(h => h.risk_active !== false)
            const historic = result.hazards.filter(h => h.risk_active === false)
            return (
              <div className="hazards-wrap">
                {active.length > 0 && (
                  <>
                    <div className="hazards-title">
                      <WarningCircle size={13} weight="fill" aria-hidden="true" />
                      Pontos de atenção ativos ({active.length})
                    </div>
                    <ul className="hazards-list">
                      {active.map((h, i) => (
                        <li key={i} className="hazard-item">
                          <span className="hazard-dot" style={{ background: SEV_COLOR[h.severity] || '#888' }} />
                          <div className="hazard-text">
                            <span className="hazard-name">{h.name || h.description}</span>
                            {h.description && h.name && <span className="hazard-desc">{h.description}</span>}
                          </div>
                          <span className="hazard-tag">
                            {h.type === 'chuva_ativa_apac' ? 'Tempo real' : 'Histórico'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {historic.length > 0 && (
                  <>
                    <div className="hazards-title hazards-title-dim">
                      Pontos históricos mapeados — clima atual favorável ({historic.length})
                    </div>
                    <ul className="hazards-list">
                      {historic.map((h, i) => (
                        <li key={i} className="hazard-item hazard-item-dim">
                          <span className="hazard-dot" style={{ background: '#666', opacity: 0.5 }} />
                          <div className="hazard-text">
                            <span className="hazard-name">{h.name}</span>
                            <span className="hazard-desc">{h.context_note || h.description}</span>
                          </div>
                          <span className="hazard-tag hazard-tag-ok">Sem risco ativo</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {active.length === 0 && <p className="route-clear">Nenhum risco ativo no trajeto agora.</p>}
              </div>
            )
          })() : (
            <p className="route-clear">Nenhuma ocorrência no trajeto.</p>
          )}

          <div className="route-source-line">
            Rota: OSRM/OpenStreetMap · Estações: APAC Geoportal (RT) · Alertas: INMET
          </div>
        </div>
      )}
    </form>
  )
}
