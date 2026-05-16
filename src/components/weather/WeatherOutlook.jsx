import { useEffect, useState } from 'react'

/* ════════════════════════════════════════════════════
   WeatherOutlook — cenário APAC honesto.
   APAC não publica forecast horário. Mostramos:
     1. Pluviômetros CEMADEN mais próximos do bairro (com distância em km)
     2. Avisos de chuva em OUTRA parte da RMR (top intensidade), se relevante
     3. Climatologia do mês corrente como referência histórica
   ════════════════════════════════════════════════════ */

function rainColor(mm) {
  if (mm == null || mm < 0.2) return 'rgba(255,255,255,.45)'
  if (mm >= 30) return '#a855f7'
  if (mm >= 10) return '#ef4444'
  if (mm >= 2.5) return '#f97316'
  return '#eab308'
}

function rainColorLight(mm) {
  if (mm == null || mm < 0.2) return 'rgba(0,0,0,.45)'
  if (mm >= 30) return '#a855f7'
  if (mm >= 10) return '#ef4444'
  if (mm >= 2.5) return '#f97316'
  return '#c97820'
}

function NearbyItem({ st, light }) {
  const mm = Number(st.rain_mm || 0)
  const color = light ? rainColorLight(mm) : rainColor(mm)
  return (
    <li className="outlook-station">
      <span className="outlook-station-name">
        {st.name}
        <span className="outlook-station-dist"> · {st.distance_km} km</span>
      </span>
      <span className="outlook-station-mm" style={{ color }}>
        {mm.toFixed(1)} mm/h
      </span>
    </li>
  )
}

const MONTH_NAMES = [
  '', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const POLL_MS = 5 * 60 * 1000

export function WeatherOutlook({ lat, lon, light = false }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    if (lat == null || lon == null) return
    let cancelled = false
    let id

    function load() {
      fetch(`/api/weather/outlook?lat=${lat}&lon=${lon}`)
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
        .then(d => { if (!cancelled) { setData(d); setLoading(false); setError(null) } })
        .catch(e => { if (!cancelled) { setError(String(e)); setLoading(false) } })
    }

    setLoading(true)
    load()
    id = setInterval(load, POLL_MS)

    return () => { cancelled = true; clearInterval(id) }
  }, [lat, lon])

  if (loading) return <p className="outlook-state">Consultando estações APAC…</p>
  if (error)   return <p className="outlook-state outlook-state--error">APAC indisponível: {error}</p>
  if (!data)   return null

  const nearest = data.nearest_stations || []
  const topRmr  = data.top_rmr || []
  const clim    = data.climatology

  // Filtra "outras áreas da RMR" — só mostra se chove > 2.5mm em estação que NÃO está nas mais próximas
  const nearestNames = new Set(nearest.map(s => s.name))
  const elsewhere = topRmr
    .filter(s => !nearestNames.has(s.name) && Number(s.rain_mm || 0) >= 2.5)
    .slice(0, 2)

  // Resumo da leitura mais próxima
  const closest = nearest[0]
  const closestMm = Number(closest?.rain_mm || 0)
  const closestText = closest
    ? (closestMm < 0.2
        ? `Estação ${closest.name} (${closest.distance_km} km) reporta sem chuva agora.`
        : `Estação ${closest.name} (${closest.distance_km} km) reporta ${closestMm.toFixed(1)} mm/h.`)
    : 'Sem estação CEMADEN próxima.'

  return (
    <div className={`weather-outlook${light ? ' light' : ''}`}>
      {/* Painel 1: estações próximas */}
      <div className="outlook-panel">
        <div className="outlook-panel-head">
          <span className="outlook-panel-label">Pluviômetros CEMADEN próximos</span>
          <span className="outlook-panel-hint">leitura em tempo real</span>
        </div>
        <p className="outlook-summary">{closestText}</p>
        {nearest.length === 0 ? (
          <p className="outlook-empty">Nenhuma estação CEMADEN num raio de 50 km.</p>
        ) : (
          <ul className="outlook-stations">
            {nearest.map(st => <NearbyItem key={st.name} st={st} light={light} />)}
          </ul>
        )}
      </div>

      {/* Painel 2: chuva em outro lugar da RMR */}
      {elsewhere.length > 0 && (
        <div className="outlook-panel outlook-panel--alert">
          <div className="outlook-panel-head">
            <span className="outlook-panel-label">Chuva em outras áreas da RMR</span>
            <span className="outlook-panel-hint">pode chegar aqui</span>
          </div>
          <ul className="outlook-stations">
            {elsewhere.map(st => (
              <li className="outlook-station" key={st.name}>
                <span className="outlook-station-name">{st.name}</span>
                <span className="outlook-station-mm" style={{ color: light ? rainColorLight(st.rain_mm) : rainColor(st.rain_mm) }}>
                  {Number(st.rain_mm || 0).toFixed(1)} mm/h
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Painel 3: climatologia */}
      {clim && clim.media_mm != null && (
        <div className="outlook-panel outlook-panel--clim">
          <div className="outlook-panel-head">
            <span className="outlook-panel-label">Esperado em {MONTH_NAMES[clim.month] || ''}</span>
            <span className="outlook-panel-hint">média histórica</span>
          </div>
          <div className="outlook-clim">
            <span className="outlook-clim-value">{Number(clim.media_mm).toFixed(0)} mm</span>
            <span className="outlook-clim-hint">no mês inteiro · ref. {clim.station_name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
