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

  /* Vista ÚNICA: une nearest_stations + top_rmr num só array deduplicado,
     ordenado por distância. Categoriza por raio pra cidadão ler hierarquia:
       • PERTO    ≤ 5 km   (bairro / vizinhança)
       • MÉDIO    5–15 km  (mesma cidade / RMR vizinha)
       • LONGE    > 15 km  (outros municípios)
     Não há mais "está caindo X em N" + "X a caminho" — uma lista só,
     hierárquica, com chip de intensidade. */
  const seen = new Set()
  const merged = [...(data.nearest_stations || []), ...(data.top_rmr || [])]
    .filter(s => {
      const k = `${(s.name || '').toLowerCase()}|${s.lat?.toFixed(3)}|${s.lon?.toFixed(3)}`
      if (seen.has(k)) return false
      seen.add(k); return true
    })
    .sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999))

  const perto  = merged.filter(s => (s.distance_km ?? 9999) <= 5)
  const medio  = merged.filter(s => (s.distance_km ?? 9999) >  5 && (s.distance_km ?? 9999) <= 15)
  const longe  = merged.filter(s => (s.distance_km ?? 9999) >  15)

  const chovendoPerto = perto.filter(s => intensityLevel(s.rain_mm) > 0).length
  const maxPertoMm = Math.max(0, ...perto.map(s => Number(s.rain_mm || 0)))
  const aggregateLevel = intensityLevel(maxPertoMm)

  // Resumo único e direto
  let summary
  if (perto.length === 0) {
    summary = `Sem sensores num raio de 5 km.`
  } else if (chovendoPerto === 0) {
    summary = `Sem chuva nas ${perto.length} estações no seu raio.`
  } else {
    summary = chovendoPerto === 1
      ? `${intensityLabel(aggregateLevel)} em 1 das ${perto.length} estações próximas.`
      : `${intensityLabel(aggregateLevel)} em ${chovendoPerto} das ${perto.length} estações próximas.`
  }

  const renderGroup = (title, subtitle, items) => items.length === 0 ? null : (
    <div className="wo-group">
      <div className="wo-group-head">
        <span className="wo-group-title">{title}</span>
        <span className="wo-group-sub">{subtitle}</span>
      </div>
      <ul className="wo-list">
        {items.map(st => {
          const mm = Number(st.rain_mm || 0)
          const lvl = intensityLevel(mm)
          return (
            <li className="wo-item" key={`${st.name}-${st.distance_km}`}>
              <span className="wo-item-name">
                {formatPlace(st)}
                {st.distance_km != null && (
                  <span className="wo-item-dist"> · {st.distance_km} km</span>
                )}
              </span>
              <span
                className={`wo-item-chip wo-chip-lvl-${lvl}`}
                style={{ color: rainColor(mm, light) }}
                title={intensityLabel(lvl)}
              >
                {mm.toFixed(1)} mm/h
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <div className={`wo${light ? ' wo--light' : ''}`}>
      <div className="wo-card">
        <div className="wo-card-row">
          <span
            className="wo-dot"
            style={{ background: rainColor(maxPertoMm, light) }}
            aria-hidden="true"
          />
          <p className="wo-summary">{summary}</p>
        </div>

        {merged.length > 0 && (
          <details className="wo-details">
            <summary>Ver pluviômetros ({merged.length})</summary>
            <p className="wo-edu">
              Pluviômetros físicos da rede CEMADEN/APAC. Cada um mede chuva
              no ponto exato onde está instalado e atualiza a cada 5 min.
              Por isso vizinhos podem ler valores bem diferentes.
            </p>
            {renderGroup('Perto',  `≤ 5 km — seu bairro e vizinhança`,             perto)}
            {renderGroup('Médio',  `5 a 15 km — outras zonas de Recife / RMR`,    medio)}
            {renderGroup('Longe',  `mais de 15 km — outros municípios da região`, longe)}
          </details>
        )}
      </div>
    </div>
  )
}
