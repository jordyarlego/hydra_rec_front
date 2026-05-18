import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { BAIRRO_COORDS } from '../../data/bairro_coords.js'
import { PONTOS_CRITICOS } from '../../data/pontos_criticos.js'
import { getRiskColor } from '../../lib/riskColors.js'
import { findBairroFeature, loadBairrosGeojson } from '../../lib/bairroGeo.js'
import { CATEGORY_BY_ID, CATEGORIES } from '../../data/report_categories.js'
import userAvatarMarker from '../../assets/user-avatar-marker-map.png'

const CATEGORY_FILTER_LS_KEY = 'hr_cat_filter_v1'

function loadHiddenCats() {
  try {
    const raw = localStorage.getItem(CATEGORY_FILTER_LS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch { return new Set() }
}

function saveHiddenCats(set) {
  try {
    localStorage.setItem(CATEGORY_FILTER_LS_KEY, JSON.stringify([...set]))
  } catch { /* quota / privacidade — silencioso */ }
}

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

function makeUserIcon() {
  return L.icon({
    iconUrl: userAvatarMarker,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
    className: 'hr-user-avatar-marker',
  })
}

/** Pin estilo Waze — círculo branco com borda colorida pela severidade
 *  e PNG da categoria DENTRO. SEM gota. SEM SVG composto. Simples.
 *  L.icon usa cat.icon direto como iconUrl → <img class> que CARREGA
 *  sempre. Cor da severidade vai via className → CSS aplica border.
 */
function makeReportIcon(report) {
  const cat = CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro
  const sev = report.severity || 'moderado'
  const pendingClass = report.pending_offline ? ' is-pending' : ''
  return L.icon({
    iconUrl: cat.icon,           // PNG da categoria diretamente (alagamento.png, etc)
    iconSize: [40, 40],
    iconAnchor: [20, 20],        // centro do círculo na coordenada GPS
    popupAnchor: [0, -22],
    className: `hr-pin-waze sev-${sev}${pendingClass}`,
  })
}

/* (removido) makeResolvedIcon — verde do "resolvido" conflitava com
   verde da severidade `leve`, confundindo cidadão. Loop cívico fica
   por conta das stats da semana na sidebar. */



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
  const [hiddenCats, setHiddenCats] = useState(() => loadHiddenCats())
  const [catFilterOpen, setCatFilterOpen] = useState(false)

  function toggleCategory(catId) {
    setHiddenCats(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      saveHiddenCats(next)
      return next
    })
  }

  function showAllCategories() {
    setHiddenCats(new Set())
    saveHiddenCats(new Set())
  }
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
    layersRef.current.gps = L.marker(gpsPos, { icon: makeUserIcon(), zIndexOffset: 900 })
      .bindTooltip('Você está aqui')
      .addTo(mapRef.current)
  }, [gpsPos])

  // ── Report markers (PIN com ícone PNG da categoria) ──────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    layersRef.current.reports?.clearLayers()
    const group = L.layerGroup()
    for (const r of reports) {
      if (r.lat == null || r.lon == null) continue
      if (bairroFilter && r.bairro && r.bairro !== bairro) continue
      if (hiddenCats.has(r.type)) continue   // chip OFF pra essa categoria
      L.marker([r.lat, r.lon], { icon: makeReportIcon(r) })
        .on('click', e => {
          if (e.originalEvent) L.DomEvent.stop(e.originalEvent)
          onReportClick?.(r)
        })
        .addTo(group)
    }
    layersRef.current.reports = group
    if (showReports) group.addTo(mapRef.current)
  }, [reports, hiddenCats]) // eslint-disable-line react-hooks/exhaustive-deps

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
    for (const h of dcHotspots) {
      const center = BAIRRO_COORDS[h.neighborhood]
      if (!center || center.length !== 2) continue
      const score = Number(h.recurrence_score || 0)
      const radius = Math.min(800, 200 + score * 80)
      const color = score >= 5 ? '#a855f7' : score >= 3 ? '#ef4444' : '#f97316'

      const initialHtml = `
        <div class="map-popup map-popup--official">
          <b>${h.neighborhood || 'Bairro'}</b>
          <div class="mp-meta">Recorrência <b>${score.toFixed(1)}</b>${h.nearest_road_name ? ` · ${h.nearest_road_name}` : ''}</div>
          <div class="mp-loading">Carregando chamados oficiais…</div>
          <small>Dados públicos EMLURB / Defesa Civil</small>
        </div>`

      const circle = L.circle(center, {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.10,
        weight: 1.5,
        dashArray: '4 4',
      }).bindPopup(initialHtml).addTo(group)

      circle.on('popupopen', async () => {
        try {
          const url = `/api/official/hotspot-detail?neighborhood=${encodeURIComponent(h.neighborhood)}`
          const res = await fetch(url)
          if (!res.ok) throw new Error('http')
          const data = await res.json()
          const topCats = (data.top_categories || []).slice(0, 4)
          const sample = (data.sample || []).slice(0, 4)
          const statusPill = (s) => {
            const t = String(s || '').toLowerCase()
            if (/conclu|finaliz|atendid|fechad|resolv/.test(t)) return '<span class="mp-pill mp-pill-done">concluído</span>'
            if (/andament|execu|servic|agendad/.test(t)) return '<span class="mp-pill mp-pill-doing">em atendimento</span>'
            if (/cancel|indeferid/.test(t)) return '<span class="mp-pill mp-pill-cancel">cancelado</span>'
            return '<span class="mp-pill mp-pill-open">aberto</span>'
          }
          const fmtDate = (iso) => {
            if (!iso) return ''
            const d = new Date(iso)
            if (Number.isNaN(d.getTime())) return ''
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
          }

          const catsHtml = topCats.length === 0 ? '' : `
            <div class="mp-cats">
              ${topCats.map(c => `<span class="mp-cat">${c.category || 'outro'} · <b>${c.count}</b></span>`).join('')}
            </div>`

          const sampleHtml = sample.length === 0 ? '' : `
            <ul class="mp-sample">
              ${sample.map(s => `
                <li>
                  <div class="mp-sample-top">
                    <span class="mp-sample-type">${s.service_type || s.category || 'Solicitação'}</span>
                    ${statusPill(s.status)}
                  </div>
                  <div class="mp-sample-meta">
                    ${s.street_name ? s.street_name + ' · ' : ''}${fmtDate(s.opened_at)}${s.agency ? ' · ' + s.agency : ''}
                  </div>
                </li>
              `).join('')}
            </ul>`

          const fullHtml = `
            <div class="map-popup map-popup--official">
              <b>${h.neighborhood || 'Bairro'}</b>
              <div class="mp-meta">${data.total} chamado${data.total === 1 ? '' : 's'} oficiais (últimos ${Math.round(data.days/30)} meses)</div>
              ${catsHtml}
              ${sampleHtml}
              <small>Dados públicos EMLURB / Defesa Civil</small>
            </div>`

          circle.getPopup().setContent(fullHtml)
        } catch {
          circle.getPopup().setContent(
            `<div class="map-popup map-popup--official">
              <b>${h.neighborhood || 'Bairro'}</b>
              <div class="mp-meta">Recorrência <b>${score.toFixed(1)}</b></div>
              <div class="mp-error">Sem detalhamento disponível no momento.</div>
              <small>Dados públicos EMLURB / Defesa Civil</small>
            </div>`
          )
        }
      })
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
        <button
          className={`map-layer-btn ${hiddenCats.size > 0 ? 'active' : ''}`}
          onClick={() => setCatFilterOpen(v => !v)}
          aria-pressed={catFilterOpen}
          aria-expanded={catFilterOpen}
          title="Filtrar pins por categoria"
        >
          <span className="layer-dot" style={{ background: '#94a3b8' }} />
          Filtrar {hiddenCats.size > 0 && `(${CATEGORIES.length - hiddenCats.size}/${CATEGORIES.length})`}
        </button>
      </div>

      {catFilterOpen && (
        <div
          className="hydra-map-cat-filter"
          role="region"
          aria-label="Filtro de categorias"
        >
          <div className="hydra-map-cat-head">
            <strong>Mostrar no mapa</strong>
            {hiddenCats.size > 0 && (
              <button
                type="button"
                className="hydra-map-cat-reset"
                onClick={showAllCategories}
              >
                Mostrar todas
              </button>
            )}
          </div>
          <ul className="hydra-map-cat-list">
            {CATEGORIES.map(cat => {
              const visible = !hiddenCats.has(cat.id)
              return (
                <li key={cat.id}>
                  <button
                    type="button"
                    className={`hydra-map-cat-chip ${visible ? 'on' : 'off'}`}
                    onClick={() => toggleCategory(cat.id)}
                    aria-pressed={visible}
                  >
                    <img src={cat.icon} alt="" aria-hidden="true" />
                    <span>{cat.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
