import { useState, useEffect } from 'react'
import { ConfidenceBadge } from '../risk/ConfidenceBadge.jsx'

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <time className="live-clock" dateTime={time.toISOString()} aria-label="Horário atual">
      {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </time>
  )
}

const NIVEL_ICON = { SEGURO: '●', ATENCAO: '●', MODERADO: '▲', ALTO: '▲', SEVERO: '◆' }

export function TopBar({ bairro, location, current, risk, consensus }) {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-location">
        <h1 id="main-content">{location?.name || bairro}</h1>
        <span className="topbar-sub">Recife — PE · Brasil</span>
      </div>

      {current && (
        <div className="topbar-weather">
          <span className="temp">{Math.round(current.temperature_2m)}°</span>
          <div className="temp-details">
            <span>Sensação {Math.round(current.apparent_temperature)}°</span>
            <span>{current.precipitation > 0 ? `${current.precipitation} mm/h` : 'Sem chuva'}</span>
          </div>
        </div>
      )}

      {risk && (
        <div
          className={`topbar-risk risk-${risk.nivel?.toLowerCase()}`}
          aria-label={`Risco ${risk.nivel}, score ${risk.score} de 100`}
        >
          <span className="risk-icon">{NIVEL_ICON[risk.nivel] || '●'}</span>
          <div className="risk-text">
            <span className="risk-nivel">{risk.nivel}</span>
            <span className="risk-score">{risk.score}<small>/100</small></span>
          </div>
        </div>
      )}

      <div className="topbar-right">
        <ConfidenceBadge consensus={consensus} />
        <LiveClock />
      </div>
    </header>
  )
}
