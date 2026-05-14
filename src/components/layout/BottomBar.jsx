import { ForecastWave } from '../weather/ForecastWave.jsx'

export function BottomBar({ forecast }) {
  return (
    <section className="bottombar" aria-label="Previsão 6 horas">
      <ForecastWave forecast={forecast} />
    </section>
  )
}
