import { useRef } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

export function ForecastWave({ forecast = [] }) {
  const scrollRef = useRef(null)

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' })
  }

  if (!forecast.length) return <p className="forecast-empty">Sem previsão horária disponível</p>

  const maxRain = Math.max(...forecast.map(s => Number(s.precipitation ?? 0)), 0.1)

  return (
    <div className="forecast-wrap">
      <button
        className="fc-scroll-btn fc-scroll-left"
        onClick={() => scroll(-1)}
        aria-label="Rolar para esquerda"
        tabIndex={-1}
      >
        <CaretLeft size={14} weight="bold" />
      </button>

      <div className="forecast-6h" role="list" ref={scrollRef}>
        {forecast.map((slot, index) => {
          const rain      = Number(slot.precipitation ?? 0)
          const intensity = Math.min(rain / maxRain, 1)
          const icon      = rain >= 5 ? '🌧️' : rain > 0 ? '🌦️' : '⛅'

          return (
            <div
              key={`${slot.time}-${index}`}
              className="forecast-slot"
              role="listitem"
              style={{ '--rain-intensity': intensity, '--index': index }}
              aria-label={`${slot.time?.slice(11, 16)}: ${rain.toFixed(1)}mm, ${slot.temperature ? Math.round(slot.temperature) + '°C' : '--'}`}
            >
              <span className="f-time">{slot.time?.slice(11, 16) || '--:--'}</span>
              <span className="f-icon" aria-hidden="true">{icon}</span>
              <span className="f-rain">{rain.toFixed(1)}<small>mm</small></span>
              <span className="f-temp">{slot.temperature ? `${Math.round(slot.temperature)}°` : '--'}</span>
              {rain > 0 && <div className="f-bar" />}
            </div>
          )
        })}
      </div>

      <button
        className="fc-scroll-btn fc-scroll-right"
        onClick={() => scroll(1)}
        aria-label="Rolar para direita"
        tabIndex={-1}
      >
        <CaretRight size={14} weight="bold" />
      </button>
    </div>
  )
}
