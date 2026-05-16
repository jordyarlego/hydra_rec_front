import { useEffect, useState } from 'react'

/* ════════════════════════════════════════════════════
   WeatherOutlook — versão clean.
   Hierarquia:
     1. Status agregado (1 linha curta com o que importa)
     2. Detalhes opcionais (<details> colapsado)
     3. Aviso lateral colorido se chove em outro bairro
   Sem redundância: a linha de status NÃO repete o que está no HeroCard.
   ════════════════════════════════════════════════════ */

function rainColor(mm, light) {
  if (mm == null || mm < 0.5) return light ? 'rgba(0,0,0,.4)' : 'rgba(255,255,255,.4)'
  if (mm >= 30)   return '#a855f7'
  if (mm >= 10)   return '#ef4444'
  if (mm >= 2.5)  return '#f97316'
  return light ? '#c97820' : '#eab308'
}

function intensityLevel(mm) {
  if (mm == null || mm < 0.2) return 0
  if (mm < 2.5) return 1
  if (mm < 10)  return 2
  if (mm < 30)  return 3
  return 4
}

function intensityLabel(level) {
  return ['Sem chuva', 'Chuva fraca', 'Chuva moderada', 'Chuva forte', 'Chuva muito forte'][level]
}

function titleCaseCity(s) {
  if (!s) return null
  const str = String(s).trim()
  if (!str) return null
  if (!/[A-Z]{3,}/.test(str)) return str
  return str.split(' ').map(w => {
    const l = w.toLowerCase()
    if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(l)) return l
    return w.charAt(0) + w.slice(1).toLowerCase()
  }).join(' ').replace(/^./, c => c.toUpperCase())
}

function prettyStation(raw) {
  if (!raw) return ''
  let s = String(raw).trim().replace(/\s+\d+\s*$/, '')
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

function formatPlace(st) {
  const name = prettyStation(st.name) || 'Estação'
  const city = titleCaseCity(st.city)
  return city ? `${name}, ${city}` : name
}

function nearestDirection(km) {
  if (km == null) return ''
  if (km < 5)  return `perto daqui (${km} km)`
  if (km < 15) return `a ${km} km daqui`
  if (km < 30) return `a ${km} km — um pouco distante`
  return `a ${km} km — mais longe da cidade`
}

const POLL_MS = 5 * 60 * 1000

export function WeatherOutlook({ lat, lon, light = false }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (lat == null || lon == null) return
    let cancelled = false
    function load() {
      fetch(`/api/weather/outlook?lat=${lat}&lon=${lon}`)
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
        .then(d => { if (!cancelled) { setData(d); setLoading(false); setError(null) } })
        .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false) } })
    }
    setLoading(true); load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [lat, lon])

  if (loading) return <p className="outlook-state">Consultando estações…</p>
  if (error)   return <p className="outlook-state outlook-state--error">Dados climáticos indisponíveis.</p>
  if (!data)   return null

  // Dedup
  const seen = new Set()
  const nearest = (data.nearest_stations || []).filter(s => {
    const k = `${s.name}|${s.lat?.toFixed(3)}|${s.lon?.toFixed(3)}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })

  const maxNearbyMm = Math.max(0, ...nearest.map(s => Number(s.rain_mm || 0)))
  const aggregateLevel = intensityLevel(maxNearbyMm)

  // "Outros bairros" — só com chuva ≥ 0.5
  const nearestNames = new Set(nearest.map(s => (s.name || '').toLowerCase()))
  const elsewhere = (data.top_rmr || [])
    .filter(s => !nearestNames.has((s.name || '').toLowerCase()) && Number(s.rain_mm || 0) >= 0.5)
    .sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999))
    .slice(0, 3)

  const maxElsewhereMm = Math.max(0, ...elsewhere.map(s => Number(s.rain_mm || 0)))
  const alertLevel = intensityLevel(maxElsewhereMm)

  // Resumo agregado — uma frase só, sem repetir o HeroCard
  let summary
  if (nearest.length === 0) {
    summary = 'Sem sensores de chuva próximos.'
  } else if (aggregateLevel === 0) {
    const ext = nearest.length === 1
      ? `na estação mais próxima`
      : `em ${nearest.length} estações próximas`
    summary = `Sem chuva ${ext}.`
  } else {
    const raining = nearest.filter(s => intensityLevel(s.rain_mm) > 0).length
    summary = raining === 1
      ? `Está caindo ${intensityLabel(aggregateLevel).toLowerCase()} em 1 estação por perto.`
      : `Está caindo ${intensityLabel(aggregateLevel).toLowerCase()} em ${raining} estações por perto.`
  }

  return (
    <div className={`wo${light ? ' wo--light' : ''}`}>
      {/* Card principal */}
      <div className="wo-card">
        <div className="wo-card-row">
          <span
            className="wo-dot"
            style={{ background: rainColor(maxNearbyMm, light) }}
            aria-hidden="true"
          />
          <p className="wo-summary">{summary}</p>
        </div>

        {nearest.length > 0 && (
          <details className="wo-details">
            <summary>Ver sensores ({nearest.length})</summary>
            <ul className="wo-list">
              {nearest.map(st => (
                <li className="wo-item" key={`${st.name}-${st.distance_km}`}>
                  <span className="wo-item-name">
                    {formatPlace(st)}
                    <span className="wo-item-dist"> · {st.distance_km} km</span>
                  </span>
                  <span className="wo-item-mm" style={{ color: rainColor(st.rain_mm, light) }}>
                    {Number(st.rain_mm || 0).toFixed(1)} mm/h
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Aviso lateral: chuva chegando */}
      {elsewhere.length > 0 && (
        <div className={`wo-alert wo-alert--lvl-${alertLevel}`}>
          <div className="wo-alert-head">
            <span className="wo-alert-icon" aria-hidden="true">↘</span>
            <span className="wo-alert-title">
              {intensityLabel(alertLevel)} a caminho
            </span>
          </div>
          <p className="wo-alert-desc">
            {elsewhere.length === 1
              ? `Está chovendo ${nearestDirection(elsewhere[0].distance_km)}. Vale acompanhar — o tempo pode mudar.`
              : `${elsewhere.length} estações da região registram chuva agora — listadas por proximidade.`}
          </p>
          <ul className="wo-alert-list">
            {elsewhere.map(st => (
              <li key={st.name}>
                <span>
                  {formatPlace(st)}
                  {st.distance_km != null && (
                    <span className="wo-alert-dist"> · {st.distance_km} km</span>
                  )}
                </span>
                <strong style={{ color: rainColor(st.rain_mm, light) }}>
                  {Number(st.rain_mm).toFixed(1)} mm/h
                </strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
