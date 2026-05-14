import { useState, useEffect } from 'react'
import { CloudRain, Cloud, Sun, CloudSun, CloudLightning, Moon, MapPin } from '@phosphor-icons/react'
import { useTheme } from './hooks/useTheme.js'
import { useDashboard } from './hooks/useDashboard.js'
import { BairroSearch } from './components/common/BairroSearch.jsx'
import { MapStage } from './components/panels/MapStage.jsx'
import { MetricsPanel } from './components/panels/MetricsPanel.jsx'
import { AppFooter } from './components/panels/AppFooter.jsx'
import { AlertBanner } from './components/risk/AlertBanner.jsx'
import { ChipsBar } from './components/weather/ChipsBar.jsx'
import { ForecastWave } from './components/weather/ForecastWave.jsx'
import './styles/app.css'

/* ── Relógio ao vivo ── */
function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <time className="app-clock" dateTime={t.toISOString()}>
      {t.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
    </time>
  )
}

/* ── Ícone de clima com animação ── */
function WeatherIcon({ precipitation = 0, code = 0, size = 80 }) {
  const w = { weight: 'duotone' }
  if (code >= 95 || precipitation >= 10) return <CloudLightning size={size} {...w} className="w-icon storm" />
  if (precipitation >= 3)                return <CloudRain      size={size} {...w} className="w-icon rain" />
  if (precipitation > 0)                 return <Cloud          size={size} {...w} className="w-icon drizzle" />
  if (code >= 2)                         return <CloudSun       size={size} {...w} className="w-icon cloudy" />
  return <Sun size={size} {...w} className="w-icon sunny" />
}

/* ── Fundo atmosférico animado ── */
function AtmosphericBg({ condition }) {
  return <div className="atm-bg" data-condition={condition} aria-hidden="true" />
}

/* ── Derivar condição do tempo atual ── */
function deriveCondition(current) {
  if (!current) return 'clear'
  const p = current.precipitation ?? 0
  const c = current.weather_code ?? 0
  if (c >= 95 || p >= 10) return 'storm'
  if (p >= 3)  return 'rain'
  if (p > 0)   return 'drizzle'
  if (c >= 2)  return 'cloudy'
  return 'clear'
}

const NIVEL_LABEL = {
  SEGURO: 'Seguro', ATENCAO: 'Atenção', MODERADO: 'Moderado', ALTO: 'Alto', SEVERO: 'Severo',
}

export default function App() {
  const { theme, toggle }           = useTheme()
  const [bairro, setBairro]         = useState('Boa Viagem')
  const [mobileView, setMobileView] = useState('conditions')
  const { data, loading, error }    = useDashboard(bairro)
  const isDark = theme === 'dark'

  const risk      = data?.risk
  const current   = data?.weather?.current
  const consensus = data?.consensus

  const weatherCondition = deriveCondition(current)

  return (
    <div className="app-shell" data-theme={theme}>

      {/* Fundo atmosférico dinâmico */}
      <AtmosphericBg condition={weatherCondition} />

      <a href="#main" className="skip-link">Ir para conteúdo</a>

      {/* ─── Header ─── */}
      <header className="app-header">
        <div className="app-brand">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span className="brand-name">HydraRec</span>
          <span className="brand-tag">v2</span>
        </div>

        <div className="header-search">
          <BairroSearch value={bairro} onChange={setBairro} placeholder="Buscar bairro…" />
        </div>

        <div className="header-end">
          <LiveClock />
          <button
            className="theme-btn"
            onClick={toggle}
            aria-label={`Mudar para tema ${isDark ? 'claro' : 'escuro'}`}
          >
            {isDark ? <Sun size={15} weight="bold" /> : <Moon size={15} weight="bold" />}
          </button>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="app-body" id="main">

        {/* Coluna de cards */}
        <div className={`cards-col ${mobileView === 'conditions' ? 'mobile-visible' : 'mobile-hidden'}`}>

          {/* ── Hero: céu + temperatura + risco ── */}
          <section
            className="card hero-card"
            data-condition={weatherCondition}
            aria-label="Condições climáticas atuais"
          >
            {/* Atmospheric veil — animated rain/storm streaks */}
            <div className="hero-rain-veil" data-condition={weatherCondition} aria-hidden="true" />
            <div className="hero-top">
              <div>
                <h1 className="hero-bairro">{bairro}</h1>
                <span className="hero-city">Recife — PE · Brasil</span>
              </div>
              {risk && (
                <div
                  className={`risk-pill risk-pill--${risk.nivel?.toLowerCase()}`}
                  aria-label={`Risco ${risk.nivel}, score ${risk.score} de 100`}
                >
                  <span className="rp-nivel">{NIVEL_LABEL[risk.nivel] ?? risk.nivel}</span>
                  <span className="rp-score">{risk.score}<small>/100</small></span>
                </div>
              )}
            </div>

            <div className="hero-main">
              <div className="hero-left">
                {current ? (
                  <>
                    <span className="hero-temp">{Math.round(current.temperature_2m)}°</span>
                    <span className="hero-feels">Sensação {Math.round(current.apparent_temperature)}°</span>
                    <span className="hero-rain">
                      {current.precipitation > 0
                        ? `🌧 ${current.precipitation} mm/h`
                        : '☀ Sem chuva agora'}
                    </span>
                  </>
                ) : (
                  <span className="hero-temp hero-loading">--°</span>
                )}
              </div>
              <WeatherIcon
                precipitation={current?.precipitation ?? 0}
                code={current?.weather_code ?? 0}
                size={82}
              />
            </div>
          </section>

          {/* Alerta de risco */}
          <AlertBanner risk={risk} bairro={bairro} />

          {/* Previsão horária */}
          {data?.forecast6h?.length > 0 && (
            <section className="card forecast-card" aria-label="Previsão próximas horas">
              <h2 className="card-title">Previsão horária</h2>
              <ForecastWave forecast={data.forecast6h} />
            </section>
          )}

          {/* Chips meteorológicos */}
          {current && (
            <section className="card chips-card" aria-label="Resumo meteorológico">
              <ChipsBar
                current={current}
                heatIndex={data?.heatIndex}
                traffic={data?.traffic}
              />
            </section>
          )}

          {/* Métricas + rota + IA + diferencial */}
          <MetricsPanel
            current={current}
            risk={risk}
            consensus={consensus}
            bairro={bairro}
            reports={[]}
          />

          <AppFooter consensus={consensus} />
        </div>

        {/* Coluna do mapa */}
        <div className={`map-col ${mobileView === 'map' ? 'mobile-visible' : 'mobile-hidden'}`}>
          <MapStage
            bairro={bairro}
            risk={risk}
            loading={loading}
            error={error}
            darkMode={isDark}
          />
        </div>
      </div>

      {/* ─── Nav Mobile ─── */}
      <nav className="mobile-nav" aria-label="Navegação">
        <button
          className={`mobile-nav-btn ${mobileView === 'conditions' ? 'active' : ''}`}
          onClick={() => setMobileView('conditions')}
          aria-pressed={mobileView === 'conditions'}
        >
          <CloudSun size={22} weight="duotone" />
          <span>Condições</span>
        </button>
        <button
          className={`mobile-nav-btn ${mobileView === 'map' ? 'active' : ''}`}
          onClick={() => setMobileView('map')}
          aria-pressed={mobileView === 'map'}
        >
          <MapPin size={22} weight="duotone" />
          <span>Mapa</span>
        </button>
      </nav>

    </div>
  )
}
