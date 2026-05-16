import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BAIRRO_COORDS } from '../../data/bairro_coords.js'
import { PONTOS_CRITICOS } from '../../data/pontos_criticos.js'
import { getRiskColor } from '../../lib/riskColors.js'
import { findBairroFeature, loadBairrosGeojson } from '../../lib/bairroGeo.js'

const CARTO_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const CARTO_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CartoDB</a>'

const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }

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



export function HydraMap({ bairro, risk, reports = [], darkMode = true, onMapClick, onReportClick }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileRef = useRef(null)
  const layersRef = useRef({})
  const gpsWatchRef = useRef(null)

  const [showReports, setShowReports] = useState(true)
  const [showCriticos, setShowCriticos] = useState(true)
  const [gpsPos, setGpsPos] = useState(null)
  const [bairrosGeojson, setBairrosGeojson] = useState(null)

  // ── Official Recife neighborhood boundaries ─────────────────────────────
  useEffect(() => {
    let cancelled = false
    loadBairrosGeojson().then(data => {
      if (!cancelled) setBairrosGeojson(data)
    })
    return () => { cancelled = true }
  }, [])

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

    const invalidate = () => map.invalidateSize({ pan: false })
    requestAnimationFrame(invalidate)
    const timeout = window.setTimeout(invalidate, 250)

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(invalidate)
    })
    resizeObserver.observe(containerRef.current)

    window.addEventListener('resize', invalidate)

    // GPS
    if (navigator.geolocation) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        pos => setGpsPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      )
    }

    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('resize', invalidate)
      resizeObserver.disconnect()
      if (gpsWatchRef.current != null) navigator.geolocation.clearWatch(gpsWatchRef.current)
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapRef.current || !onMapClick) return
    const map = mapRef.current
    const handler = e => onMapClick(e.latlng.lat, e.latlng.lng)
    map.on('click', handler)
    return () => map.off('click', handler)
  }, [onMapClick])

  // ── Swap tile layer on dark/light toggle ─────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return
    tileRef.current.setUrl(darkMode ? CARTO_DARK : CARTO_LIGHT)
  }, [darkMode])

  // ── Pan to bairro ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    const feature = findBairroFeature(bairrosGeojson, bairro)
    if (feature) {
      const bounds = L.geoJSON(feature).getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { animate: true, duration: 0.6, padding: [52, 52], maxZoom: 15 })
        return
      }
    }
    const coords = BAIRRO_COORDS[bairro] ?? FALLBACK_CENTER
    mapRef.current.setView(coords, 14, { animate: true, duration: 0.6 })
  }, [bairro, bairrosGeojson])

  // ── Official bairro risk area ────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    layersRef.current.riskLayer?.remove()
    const coords = BAIRRO_COORDS[bairro] ?? FALLBACK_CENTER
    const nivel = risk?.nivel ?? 'SEGURO'
    const color = getRiskColor(nivel)
    const feature = findBairroFeature(bairrosGeojson, bairro)

    if (feature) {
      layersRef.current.riskLayer = L.geoJSON(feature, {
        style: {
          color,
          weight: 1.8,
          opacity: 0.88,
          fillColor: color,
          fillOpacity: 0.08,
        },
      })
        .bindTooltip(`${bairro} — ${nivel} (score ${risk?.score ?? '—'}). Limite oficial do bairro.`, { sticky: true })
        .addTo(mapRef.current)
      return
    }

    layersRef.current.riskLayer = L.circle(coords, {
      radius: 520,
      color,
      weight: 1.5,
      opacity: 0.75,
      fillColor: color,
      fillOpacity: 0.08,
      dashArray: '6 8',
    })
      .bindTooltip(`${bairro} — ${nivel} (score ${risk?.score ?? '—'}). Centro aproximado; limite oficial indisponível.`, { sticky: true })
      .addTo(mapRef.current)
  }, [bairro, risk, bairrosGeojson])

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
        radius: r.pending_offline ? 8 : 7,
        color,
        weight: r.pending_offline ? 2.2 : 1.5,
        dashArray: r.pending_offline ? '3 4' : undefined,
        fillColor: color,
        fillOpacity: r.pending_offline ? 0.45 : 0.85,
      })
        .bindPopup(
          `<div class="map-popup"><b>${r.type?.replace('_', ' ')}</b><br/>
           <span class="popup-sev" style="color:${color}">${r.severity}</span><br/>
           ${r.description ? `<span>${r.description}</span>` : ''}
           <br/><small>${r.pending_offline ? 'Pendente de envio' : `${r.confirmed_count ?? 0} confirmações`}</small></div>`,
        )
        .on('click', e => {
          if (e.originalEvent) L.DomEvent.stop(e.originalEvent)
          onReportClick?.(r)
        })
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
