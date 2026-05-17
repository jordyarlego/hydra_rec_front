import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BAIRRO_COORDS } from '../../data/bairro_coords.js'
import { PONTOS_CRITICOS } from '../../data/pontos_criticos.js'
import { getRiskColor } from '../../lib/riskColors.js'
import { findBairroFeature, loadBairrosGeojson } from '../../lib/bairroGeo.js'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'

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

/** Pin de report com ícone da categoria + cor da severidade.
 *  Implementação NOVA: usa L.icon com data-URL SVG. Resolve dois bugs:
 *  (a) Pin "flutuando" ao dar zoom — divIcon estava perdendo anchor
 *      por causa de CSS overrides. L.icon respeita o anchor nativo
 *      do Leaflet sem precisar de !important nenhum.
 *  (b) Imagem da categoria não aparecia — Vite-resolved URL nem sempre
 *      carrega dentro de innerHTML. Aqui o ícone vai embutido no SVG
 *      como <image href=...> que o browser baixa nativamente.
 */
function makeReportIcon(report) {
  const cat = CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro
  const color = SEV_COLOR[report.severity] || '#888'
  const pending = report.pending_offline
  const opacity = pending ? 0.55 : 1

  // SVG completo em data URI. width/height definem o tamanho RASTERIZADO.
  // <image> carrega o PNG da categoria (cat.icon resolvido pelo Vite).
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 36 44" width="36" height="44">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.2" />
    </filter>
  </defs>
  <path d="M18 2 C9 2 2 9 2 18 c0 11 16 24 16 24 s16-13 16-24 c0-9-7-16-16-16 z"
        fill="${color}" stroke="rgba(0,0,0,.45)" stroke-width="1.2"
        opacity="${opacity}"/>
  <circle cx="18" cy="17" r="11" fill="#ffffff" opacity="${opacity}"/>
  <image href="${cat.icon}" x="6" y="5" width="24" height="24" opacity="${opacity}"
         preserveAspectRatio="xMidYMid meet"/>
</svg>`
  const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
  return L.icon({
    iconUrl: url,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -38],
    className: 'hr-pin-img',   // pode ter classe pra estilizar transition
  })
}



export function HydraMap({
  bairro,
  risk,
  reports = [],
  darkMode = true,
  bairroFilter = false,
  onMapClick,
  onReportClick,
  onMapReady,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const tileRef = useRef(null)
  const layersRef = useRef({})
  const gpsWatchRef = useRef(null)

  const [showReports, setShowReports] = useState(true)
  const [showCriticos, setShowCriticos] = useState(true)
  const [showDC, setShowDC] = useState(false)
  const [dcHotspots, setDcHotspots] = useState([])
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

    mapRef.current = map
    onMapReady?.({
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
      centerOnUser: () => {
        if (gpsPos) map.setView(gpsPos, 15, { animate: true })
        else map.setView(BAIRRO_COORDS[bairro] ?? FALLBACK_CENTER, 14, { animate: true })
      },
      toggleHotspots: () => setShowDC(v => !v),
    })

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
      onMapReady?.(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mapRef.current) return
    onMapReady?.({
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      centerOnUser: () => {
        if (gpsPos) mapRef.current?.setView(gpsPos, 15, { animate: true })
        else mapRef.current?.setView(BAIRRO_COORDS[bairro] ?? FALLBACK_CENTER, 14, { animate: true })
      },
      toggleHotspots: () => setShowDC(v => !v),
    })
  }, [bairro, gpsPos, onMapReady])

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

  // ── Report markers (PIN com ícone PNG da categoria) ──────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    layersRef.current.reports?.clearLayers()
    const group = L.layerGroup()
    for (const r of reports) {
      if (r.lat == null || r.lon == null) continue
      if (bairroFilter && r.bairro && r.bairro !== bairro) continue
      L.marker([r.lat, r.lon], { icon: makeReportIcon(r) })
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

  // ── Defesa Civil: hotspots de chamados oficiais (oficiais EMLURB/DC) ───
  useEffect(() => {
    if (!showDC) return
    let cancelled = false
    fetch('/api/official/hotspots?limit=50')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => { if (!cancelled) setDcHotspots(data?.data || []) })
      .catch(() => { if (!cancelled) setDcHotspots([]) })
    return () => { cancelled = true }
  }, [showDC])

  useEffect(() => {
    if (!mapRef.current) return
    layersRef.current.dc?.remove()
    if (!showDC) return
    const group = L.layerGroup()
    // Hotspots vêm com neighborhood + recurrence_score (sem lat/lon direto)
    // Vou geocodificar pelo BAIRRO_COORDS
    for (const h of dcHotspots) {
      const center = BAIRRO_COORDS[h.neighborhood]
      if (!center || center.length !== 2) continue
      const score = Number(h.recurrence_score || 0)
      const radius = Math.min(800, 200 + score * 80)
      const color = score >= 5 ? '#a855f7' : score >= 3 ? '#ef4444' : '#f97316'
      L.circle(center, {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.10,
        weight: 1.5,
        dashArray: '4 4',
      })
        .bindPopup(
          `<div class="map-popup">
            <b>${h.neighborhood || 'Bairro'}</b><br/>
            Histórico: <b>${score.toFixed(1)}</b> de recorrência<br/>
            ${h.nearest_road_name ? `Via mais citada: ${h.nearest_road_name}<br/>` : ''}
            <small>Dados oficiais EMLURB / Defesa Civil</small>
          </div>`
        )
        .addTo(group)
    }
    layersRef.current.dc = group
    group.addTo(mapRef.current)
  }, [showDC, dcHotspots])


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
        <button
          className={`map-layer-btn ${showDC ? 'active' : ''}`}
          onClick={() => setShowDC(v => !v)}
          aria-pressed={showDC}
          title="Histórico de chamados oficiais (EMLURB/Defesa Civil)"
        >
          <span className="layer-dot" style={{ background: '#a855f7' }} />
          Histórico oficial
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
