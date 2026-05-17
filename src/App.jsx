import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocket } from './hooks/useWebSocket.js'
import { useTheme } from './hooks/useTheme.js'
import { useDashboard } from './hooks/useDashboard.js'
import { useReports } from './hooks/useReports.js'
import { soundMgr, wmoToCondition, CONDITION_THEME } from './lib/soundManager.js'
import { BAIRRO_COORDS } from './data/bairro_coords.js'
import { findBairroByPoint, getBairroCenterFromGeojson, loadBairrosGeojson } from './lib/bairroGeo.js'

import { LoadingScreen } from './components/loading/LoadingScreen.jsx'
import { Sidebar }       from './components/layout/Sidebar.jsx'
import { MapStage }      from './components/layout/MapStage.jsx'
import { MobileNav }     from './components/layout/MobileNav.jsx'
import { QuickReportSheet } from './components/reports/QuickReportSheet.jsx'
import { ReportPinPopup } from './components/reports/ReportPinPopup.jsx'
import { SchemaWarning } from './components/common/SchemaWarning.jsx'
import { useToast } from './components/common/Toast.jsx'
import { api } from './lib/api.js'

import './styles/app.css'

/* Vincula esse report ao push endpoint do navegador (se já estiver inscrito)
   pra cidadão receber notificação quando ticket vinculado mudar de estado.
   Silencioso: falha não bloqueia o flow. */
async function autoSubscribeReportPush(reportId) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.getRegistration()
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (!sub?.endpoint) return
  await api.subscribeReportPush(reportId, sub.endpoint)
}

const FALLBACK_COORDS = [-8.1195, -34.9008]
const MOBILE_BREAKPOINT = 900

function getInitialMobileState() {
  return window.innerWidth <= MOBILE_BREAKPOINT
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function nearestBairro(lat, lon) {
  let best = 'Boa Viagem', bestDist = Infinity
  for (const [name, coords] of Object.entries(BAIRRO_COORDS)) {
    const d = haversineKm(lat, lon, coords[0], coords[1])
    if (d < bestDist) { bestDist = d; best = name }
  }
  return best
}

async function resolveBairroCoords(bairro) {
  const coords = BAIRRO_COORDS[bairro]
  if (coords) return coords
  const geojson = await loadBairrosGeojson()
  return getBairroCenterFromGeojson(geojson, bairro) || FALLBACK_COORDS
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme()
  const toast = useToast()
  const isLight = theme === 'light'

  const [ready,        setReady]        = useState(false)
  const [bairro,       setBairro]       = useState('Boa Viagem')
  const [soundOn,      setSoundOn]      = useState(() => localStorage.getItem('hr_sound') !== 'off')
  const [isMobile,     setIsMobile]     = useState(getInitialMobileState)
  const [sidebarOpen,  setSidebarOpen]  = useState(getInitialMobileState)
  const [mobileView,   setMobileView]   = useState('sidebar')
  const [reportOpen,   setReportOpen]   = useState(false)
  const [reportGps,    setReportGps]    = useState(null)
  const [pendingReportLatLng, setPendingReportLatLng] = useState(null)
  const [reportError, setReportError] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportDetailLoading, setReportDetailLoading] = useState(false)
  const prevScoreRef = useRef(null)

  /* ── Backend hooks ── */
  const { data, loading, error, refresh, setData } = useDashboard(bairro)

  const onWsData = useCallback(d => { if (d?.risk) setData(d) }, [setData])
  useWebSocket(bairro, onWsData)
  const { reports, loadNearby, submitReport, confirmReport, likeReport, getReport } = useReports()

  /* ── Derive condition/theme from weather code ── */
  const condition = wmoToCondition(data?.weather?.current?.weather_code ?? 0)
  const theme_cfg = CONDITION_THEME[condition] || CONDITION_THEME['Ensolarado']

  /* ── Geolocalização: bairro + salva pra reports ── */
  useEffect(() => {
    if (!navigator.geolocation) return
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        setReportGps({ lat, lon, source: 'gps' })
        const geojson = await loadBairrosGeojson()
        if (cancelled) return
        setBairro(findBairroByPoint(geojson, lat, lon) || nearestBairro(lat, lon))
      },
      () => {},
      { timeout: 5000, maximumAge: 60000 }
    )
    return () => { cancelled = true }
  }, [])

  /* ── Resize ── */
  useEffect(() => {
    const h = () => {
      const nextIsMobile = window.innerWidth <= MOBILE_BREAKPOINT
      setIsMobile(prevIsMobile => {
        if (!prevIsMobile && nextIsMobile) {
          setMobileView('sidebar')
          setSidebarOpen(true)
        }
        if (prevIsMobile && !nextIsMobile) {
          setMobileView('map')
          setSidebarOpen(false)
        }
        return nextIsMobile
      })
    }
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  /* ── Load reports when bairro changes ── */
  useEffect(() => {
    let cancelled = false
    resolveBairroCoords(bairro).then(([lat, lon]) => {
      if (!cancelled) loadNearby(lat, lon)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bairro])

  /* ── Sound: rain ambient + thunder schedule (depend on condition + soundOn) ── */
  useEffect(() => {
    if (!ready || !data) return
    soundMgr.setEnabled(soundOn)
    if (soundOn && theme_cfg.rain !== 'none') soundMgr.startRain(theme_cfg.rain)
    else soundMgr.stopRain()
    return () => soundMgr.stopRain()
  }, [condition, soundOn, ready, data])

  useEffect(() => {
    if (!ready || !data) return
    if (soundOn && theme_cfg.hasThunder) soundMgr.startThunderSchedule()
    else soundMgr.stopThunderSchedule()
    return () => soundMgr.stopThunderSchedule()
  }, [condition, soundOn, ready, data])

  /* ── Alert sound when score crosses 60 going up ── */
  useEffect(() => {
    if (!ready || !data?.risk) return
    const score = data.risk.score
    if (prevScoreRef.current != null && score >= 60 && score > prevScoreRef.current) {
      soundMgr.playAlert(score)
    }
    prevScoreRef.current = score
  }, [data?.risk?.score, ready])

  /* ── Persist sound prefs ── */
  useEffect(() => { localStorage.setItem('hr_sound', soundOn ? 'on' : 'off') }, [soundOn])

  /* ── Escape closes drawer ── */
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  /* ── Handlers ── */
  function handleBairroChange(b) {
    setBairro(b)
    setSidebarOpen(false)
    if (isMobile) setMobileView('map')
  }

  function closeMobileSidebar() {
    setSidebarOpen(false)
    setMobileView('map')
  }

  function handleSoundToggle() {
    soundMgr.playClick()
    setSoundOn(v => {
      const next = !v
      soundMgr.setEnabled(next)
      if (next && theme_cfg.rain !== 'none') soundMgr.startRain(theme_cfg.rain)
      if (next && theme_cfg.hasThunder)     soundMgr.startThunderSchedule()
      return next
    })
  }

  function handleThemeToggle() {
    soundMgr.playClick()
    toggleTheme()
  }

  function openQuickReport() {
    soundMgr.playClick()
    setReportError(null)
    if (reportGps?.lat != null && reportGps?.lon != null) {
      setPendingReportLatLng({ lat: reportGps.lat, lon: reportGps.lon })
    }
    setReportOpen(true)
  }

  function handleMapClick(lat, lon) {
    if (reportGps?.lat == null || reportGps?.lon == null) {
      setReportError({
        title: 'Localização não ativada',
        body: 'Pra reportar, ative a localização no navegador. Você só pode reportar problemas perto de onde você está.',
      })
      setReportOpen(false)
      return
    }
    const dist = haversineKm(reportGps.lat, reportGps.lon, lat, lon)
    if (dist > 1.5) {
      setReportError({
        title: 'Muito longe pra reportar',
        body: `Esse ponto está a ${dist.toFixed(1)} km de você. Você só pode reportar problemas a até 1,5 km da sua localização. Aproxime o mapa de onde você está.`,
      })
      setReportOpen(false)
      return
    }
    soundMgr.playClick()
    setReportError(null)
    setPendingReportLatLng({ lat, lon })
    setReportOpen(true)
  }

  async function handleSubmitReport(payload, coords = {}) {
    const result = await submitReport(payload)
    if (coords.lat != null && coords.lon != null) {
      // Recarrega 2x: imediato (pra optimistic + qualquer dado já indexado)
      // e depois de 1.5s (pra pegar o pin DEPOIS do pipeline IA + indexação)
      loadNearby(coords.lat, coords.lon)
      setTimeout(() => loadNearby(coords.lat, coords.lon), 1500)
      setTimeout(() => loadNearby(coords.lat, coords.lon), 4000)
    }
    if (result?.offline) {
      const msg = 'Sem conexão. Report salvo e será enviado automaticamente.'
      setReportError(msg)
      toast.push({ kind: 'info', text: msg })
    }
    // Auto-subscribe: se o cidadão JÁ deu permissão de push antes,
    // vincula esse report ao endpoint pra receber notif quando o
    // ticket vinculado mudar de estado.
    if (result?.id && !result?.offline) {
      autoSubscribeReportPush(result.id).catch(() => {})
    }
  }

  async function handleReportClick(report) {
    setReportDetailLoading(true)
    try {
      const detail = await getReport(report.id)
      setSelectedReport(detail)
    } catch {
      setSelectedReport(report)
    } finally {
      setReportDetailLoading(false)
    }
  }

  async function handleVote(id, vote) {
    const data = await likeReport(id, vote)
    setSelectedReport(prev => prev?.id === id ? { ...prev, ...data } : prev)
  }

  /* ── Splash ── */
  if (!ready) return <LoadingScreen onDone={() => setReady(true)} />

  return (
    <div className={`app-root${isLight ? ' light' : ''}`} data-theme={theme}>
      <a href="#main" className="skip-link">Ir para conteúdo</a>
      <SchemaWarning />

      {/* Overlay backdrop — desktop + mobile quando sidebar aberta */}
      {sidebarOpen && (
        <div className="mobile-overlay" aria-hidden="true" onClick={closeMobileSidebar} />
      )}

      {/* Sidebar — drawer overlay em todos os tamanhos */}
      <aside
        className={`sidebar-panel${isMobile ? ' mobile' : ''}${sidebarOpen ? ' open' : ''}`}
        aria-label="Painel lateral"
      >
        <Sidebar
          data={data}
          loading={loading}
          error={error}
          onRetry={refresh}
          bairro={bairro}
          onBairroChange={handleBairroChange}
          reports={reports}
          onConfirmReport={confirmReport}
          light={isLight}
          soundOn={soundOn}
          onSoundToggle={handleSoundToggle}
          onThemeToggle={handleThemeToggle}
          mobile={isMobile}
          onClose={closeMobileSidebar}
        />
      </aside>

      {/* Map area */}
      <main
        id="main"
        className={`app-main${isMobile && mobileView === 'sidebar' ? ' is-hidden' : ''}`}
      >
        {/* Botão hamburger — sempre disponível pra abrir a sidebar drawer */}
        {!sidebarOpen && (
          <div className="map-mobile-topbar">
            <button
              type="button"
              className="mobile-open-sidebar"
              onClick={() => { soundMgr.playClick(); setSidebarOpen(true) }}
              aria-label="Abrir painel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              {bairro}
            </button>
          </div>
        )}

        <MapStage
          bairro={bairro}
          risk={data?.risk}
          reports={reports}
          loading={loading}
          error={error}
          darkMode={!isLight}
          onCreateReport={openQuickReport}
          onMapClick={handleMapClick}
          onReportClick={handleReportClick}
          mobile={isMobile}
        />
      </main>

      {/* Mobile bottom nav */}
      {isMobile && (
        <MobileNav
          view={sidebarOpen ? 'sidebar' : mobileView}
          onChange={v => {
            setMobileView(v)
            if (v === 'sidebar') setSidebarOpen(true)
            else setSidebarOpen(false)
          }}
        />
      )}

      <QuickReportSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleSubmitReport}
        bairro={bairro}
        userLat={reportGps?.lat}
        userLon={reportGps?.lon}
        reportLat={pendingReportLatLng?.lat}
        reportLon={pendingReportLatLng?.lon}
      />
      {reportError && (
        typeof reportError === 'string' ? (
          <div className="floating-form-error" role="alert">{reportError}</div>
        ) : (
          <div className="range-error-overlay" role="alert" onClick={() => setReportError(null)}>
            <span className="range-error-overlay-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <circle cx="12" cy="16" r="0.6" fill="currentColor" />
              </svg>
            </span>
            <div>
              <strong>{reportError.title}</strong>
              <small>{reportError.body}</small>
            </div>
          </div>
        )
      )}
      {reportDetailLoading && <div className="floating-form-error" role="status">Carregando report...</div>}
      <ReportPinPopup
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onVote={handleVote}
      />
    </div>
  )
}
