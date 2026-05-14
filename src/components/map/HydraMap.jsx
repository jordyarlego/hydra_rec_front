import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BAIRRO_COORDS } from '../../data/bairro_coords.js'
import { PONTOS_CRITICOS } from '../../data/pontos_criticos.js'

const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CartoDB</a>'

const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }
const RISK_COLOR = {
  SEGURO:   '#22c55e',
  ATENCAO:  '#86efac',
  MODERADO: '#f97316',
  ALTO:     '#ef4444',
  SEVERO:   '#7c3aed',
}

const FALLBACK_CENTER = [-8.1195, -34.9008]

function makeCriticoIcon() {
  return L.divIcon({
    className: 'critico-icon',
    html: '<span aria-hidden="true">⚠</span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  })
}

export function HydraMap({ bairro, risk, reports = [], darkMode = true, onReportClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileRef = useRef(null)
  const layersRef = useRef({})
  const gpsWatchRef = useRef(null)

  const [showReports, setShowReports] = useState(true)
  const [showCriticos, setShowCriticos] = useState(true)
  const [gpsPos, setGpsPos] = useState(null)

  // ── Init map once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const center = BAIRRO_COORDS[bairro] ?? FALLBACK_CENTER
    const map = L.map(containerRef.current, {
      center,
      zoom: 14,
      zoomControl: false,
    })

    tileRef.current = L.tileLayer(darkMode ? CARTO_DARK : CARTO_LIGHT, {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: TILE_ATTR,
    }).addTo(map)

    L.control.zoom({ position: 'bottomleft' }).addTo(map)

    mapRef.current = map

    // GPS
    if (navigator.geolocation) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        pos => setGpsPos([pos.coords.latitude, pos.coords.longitude]),
        null,
        { enableHighAccuracy: true, timeout: 10000 },
      )
    }

    return () => {
      if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current)
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Swap tile layer on dark/light toggle ─────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return
    tileRef.current.setUrl(darkMode ? CARTO_DARK : CARTO_LIGHT)
  }, [darkMode])

  // ── Pan to bairro ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    const coords = BAIRRO_COORDS[bairro] ?? FALLBACK_CENTER
    mapRef.current.setView(coords, 14, { animate: true, duration: 0.6 })
  }, [bairro])

  // ── Risk circle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    layersRef.current.riskCircle?.remove()
    const coords = BAIRRO_COORDS[bairro] ?? FALLBACK_CENTER
    const nivel = risk?.nivel ?? 'SEGURO'
    const color = RISK_COLOR[nivel] ?? '#888'
    layersRef.current.riskCircle = L.circle(coords, {
      radius: 700,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.13,
    }).bindTooltip(`${bairro} — ${nivel} (score ${risk?.score ?? '—'})`, { sticky: true })
      .addTo(mapRef.current)
  }, [bairro, risk])

  // ── GPS marker ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    layersRef.current.gps?.remove()
    if (!gpsPos) return
    layersRef.current.gps = L.circleMarker(gpsPos, {
      radius: 8,
      color: '#3b82f6',
      weight: 2,
      fillColor: '#93c5fd',
      fillOpacity: 0.9,
    }).bindTooltip('Você está aqui').addTo(mapRef.current)
  }, [gpsPos])

  // ── Report markers ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    layersRef.current.reports?.clearLayers()
    const group = L.layerGroup()
    for (const r of reports) {
      if (r.lat == null || r.lon == null) continue
      const color = SEV_COLOR[r.severity] ?? '#888'
      L.circleMarker([r.lat, r.lon], {
        radius: 7,
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.85,
      })
        .bindPopup(
          `<div class="map-popup"><b>${r.type?.replace('_', ' ')}</b><br/>
           <span class="popup-sev" style="color:${color}">${r.severity}</span><br/>
           ${r.description ? `<span>${r.description}</span>` : ''}
           <br/><small>${r.confirmed_count ?? 0} confirmações</small></div>`,
        )
        .on('click', () => onReportClick?.(r))
        .addTo(group)
    }
    layersRef.current.reports = group
    if (showReports) group.addTo(mapRef.current)
  }, [reports]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapRef.current || !layersRef.current.reports) return
    showReports
      ? layersRef.current.reports.addTo(mapRef.current)
      : layersRef.current.reports.remove()
  }, [showReports])

  // ── Pontos críticos ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    layersRef.current.criticos?.remove()
    const icon = makeCriticoIcon()
    const group = L.layerGroup()
    for (const p of PONTOS_CRITICOS) {
      L.marker([p.lat, p.lon], { icon })
        .bindPopup(`<div class="map-popup"><b>${p.name}</b><br/><span>${p.description}</span></div>`)
        .addTo(group)
    }
    layersRef.current.criticos = group
    if (showCriticos) group.addTo(mapRef.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapRef.current || !layersRef.current.criticos) return
    showCriticos
      ? layersRef.current.criticos.addTo(mapRef.current)
      : layersRef.current.criticos.remove()
  }, [showCriticos])

  return (
    <div className={`hydra-map-wrap${!darkMode ? ' map-light' : ''}`}>
      <div ref={containerRef} className="hydra-map-canvas" aria-label="Mapa de risco interativo" />
      <div className="hydra-map-controls" role="group" aria-label="Camadas do mapa">
        <button
          className={`map-layer-btn ${showReports ? 'active' : ''}`}
          onClick={() => setShowReports(v => !v)}
          aria-pressed={showReports}
        >
          <span className="layer-dot" style={{ background: '#f97316' }} />
          Reports
        </button>
        <button
          className={`map-layer-btn ${showCriticos ? 'active' : ''}`}
          onClick={() => setShowCriticos(v => !v)}
          aria-pressed={showCriticos}
        >
          <span className="layer-dot" style={{ background: '#facc15' }} />
          Críticos
        </button>
        {gpsPos && (
          <button
            className="map-layer-btn active"
            onClick={() => mapRef.current?.setView(gpsPos, 15, { animate: true })}
            title="Centralizar na sua localização"
          >
            <span className="layer-dot" style={{ background: '#3b82f6' }} />
            GPS
          </button>
        )}
      </div>
    </div>
  )
}
