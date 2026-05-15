/* ════════════════════════════════════════════════════
   ForecastHourly — previsão das próximas 6 horas
   Substitui o ForecastWave anterior (scroll horizontal por linha)
   ════════════════════════════════════════════════════ */

export function ForecastHourly({ forecast = [], light = false }) {
  if (!forecast.length) return null
  const maxRain = Math.max(...forecast.map(f => Number(f.precipitation ?? 0)), 0.5)

  return (
    <div className="forecast-hourly" aria-label="Previsão das próximas horas">
      {forecast.map((f, i) => {
        const time = i === 0 ? 'Agora' : (f.time?.slice(11, 13) + 'h')
        const rain = Number(f.precipitation ?? 0)
        const intensity = Math.min(rain / maxRain, 1)
        const icon = rain >= 5 ? '🌧' : rain > 0 ? '🌦' : '⛅'
        const temp = f.temperature != null ? `${Math.round(f.temperature)}°C` : '--'

        return (
          <div
            key={i}
            className={`forecast-slot${i === 0 ? ' is-now' : ''}${light ? ' light' : ''}`}
            aria-label={`${time}: ${temp}, ${rain.toFixed(1)}mm de chuva`}
          >
            <span className="forecast-time">{time}</span>
            <span className="forecast-icon" aria-hidden="true">{icon}</span>
            <span className="forecast-temp">
              {f.temperature != null ? `${Math.round(f.temperature)}°` : '--'}
            </span>
            <div className="forecast-bar-track" aria-hidden="true">
              <div className="forecast-bar-fill" style={{ width: `${intensity * 100}%` }} />
            </div>
            <span className="forecast-rain">{rain.toFixed(1)}mm</span>
          </div>
        )
      })}
    </div>
  )
}
