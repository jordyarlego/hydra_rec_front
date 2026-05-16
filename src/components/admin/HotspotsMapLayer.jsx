import { useEffect, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

const TYPE_OPTS = [
  { value: '', label: 'Todos' },
  { value: 'alagamento',   label: 'Alagamento'   },
  { value: 'buraco',       label: 'Buraco'        },
  { value: 'deslizamento', label: 'Deslizamento'  },
  { value: 'iluminacao',   label: 'Iluminação'    },
  { value: 'lixo',         label: 'Lixo'          },
  { value: 'queda_arvore', label: 'Árvore'        },
]

const SCORE_COLOR = score => {
  if (score >= 5) return '#ef4444'   // --risk-alto
  if (score >= 2) return '#f97316'   // --risk-moderado
  return '#eab308'                   // --risk-atencao
}

function HotspotsLayer({ hotspots }) {
  const map = useMap()

  useEffect(() => {
    if (!hotspots?.length) return
    const group = L.layerGroup()

    hotspots.forEach(h => {
      if (!h.lat || !h.lon) return
      const color = SCORE_COLOR(h.recurrence_score || 0)
      const circle = L.circleMarker([h.lat, h.lon], {
        radius:      12,
        color:       color,
        fillColor:   color,
        fillOpacity: 0.5,
        weight:      2,
      })
      circle.bindPopup(
        `<b>${h.neighborhood || '—'}</b><br/>${h.rpa || ''}<br/>` +
        `Via: ${h.nearest_road_name || '—'}<br/>` +
        `Recorrência: <b>${h.recurrence_score?.toFixed(1) || 0}</b>`
      )
      group.addLayer(circle)
    })

    group.addTo(map)
    return () => group.remove()
  }, [hotspots, map])

  return null
}

export default function HotspotsMapLayer({ token, MapContainer, TileLayer }) {
  const [hotspots, setHotspots]   = useState([])
  const [tipo, setTipo]           = useState('')
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (tipo) params.set('tipo', tipo)
    fetch(`/api/official/hotspots?${params}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setHotspots(d.data || []))
      .catch(() => setHotspots([]))
      .finally(() => setLoading(false))
  }, [tipo])

  return (
    <div className="hotspots-layer">
      <div className="hotspots-layer__controls">
        <label className="form-label" htmlFor="hotspot-type-filter">Tipo</label>
        <select
          id="hotspot-type-filter"
          className="hotspots-layer__select"
          value={tipo}
          onChange={e => setTipo(e.target.value)}
        >
          {TYPE_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {loading && <span className="hotspots-layer__loading">Carregando…</span>}
        <span className="hotspots-layer__count">{hotspots.length} hotspots</span>
      </div>

      {MapContainer && TileLayer ? (
        <MapContainer
          center={[-8.05, -34.90]}
          zoom={12}
          className="hotspots-layer__map"
          aria-label="Mapa de hotspots"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <HotspotsLayer hotspots={hotspots} />
        </MapContainer>
      ) : (
        <p className="hotspots-layer__no-map">
          {hotspots.length === 0
            ? 'Nenhum hotspot encontrado.'
            : `${hotspots.length} hotspot(s) — integre o mapa Leaflet para visualizar.`}
        </p>
      )}
    </div>
  )
}
