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
import { ReportModal }   from './components/reports/ReportModal.jsx'

import './styles/app.css'

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
  const isLight = theme === 'light'

  const [ready,        setReady]        = useState(false)
  const [bairro,       setBairro]       = useState('Boa Viagem')
  const [soundOn,      setSoundOn]      = useState(() => localStorage.getItem('hr_sound') !== 'off')
  const [isMobile,     setIsMobile]     = useState(getInitialMobileState)
  const [sidebarOpen,  setSidebarOpen]  = useState(getInitialMobileState)
  const [mobileView,   setMobileView]   = useState('sidebar')
  const [reportOpen,   setReportOpen]   = useState(false)
  const [reportGps,    setReportGps]    = useState(null)
  const [routeResult,  setRouteResult]  = useState(null)
  const prevScoreRef = useRef(null)

  /* ── Backend hooks ── */
  const { data, loading, error, refresh, setData } = useDashboard(bairro)

  const onWsData = useCallback(d => { if (d?.risk) setData(d) }, [setData])
  useWebSocket(bairro, onWsData)
  const { reports, loadNearby, submitReport, confirmReport } = useReports()

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
    setRouteResult(null)
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

  function openReportModal() {
    soundMgr.playClick()
    setReportOpen(true)
  }

  async function handleSubmitReport(payload) {
    await submitReport(payload)
    loadNearby(payload.lat, payload.lon)
  }

  /* ── Splash ── */
  if (!ready) return <LoadingScreen onDone={() => setReady(true)} />

  return (
    <div className={`app-root${isLight ? ' light' : ''}`} data-theme={theme}>
      <a href="#main" className="skip-link">Ir para conteúdo</a>

      {/* Mobile overlay (under sidebar when open) */}
      {isMobile && sidebarOpen && (
        <div className="mobile-overlay" aria-hidden="true" onClick={closeMobileSidebar} />
      )}

      {/* Sidebar (drawer no mobile) */}
      <aside
        className={`sidebar-panel${isMobile ? ' mobile' : ''}${isMobile && sidebarOpen ? ' open' : ''}`}
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
          onRouteResult={setRouteResult}
        />
      </aside>

      {/* Map area */}
      <main
        id="main"
        className={`app-main${isMobile && mobileView === 'sidebar' ? ' is-hidden' : ''}`}
      >
        {/* Mobile top: open-sidebar button */}
        {isMobile && (
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
          onCreateReport={openReportModal}
          mobile={isMobile}
          routeResult={routeResult}
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

      {/* Report modal */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={handleSubmitReport}
        bairro={bairro}
        userLat={reportGps?.lat}
        userLon={reportGps?.lon}
      />
    </div>
  )
}
