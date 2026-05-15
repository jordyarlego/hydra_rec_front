import { CONDITION_THEME } from '../../lib/soundManager.js'

function variantForCondition(condition) {
  if (condition === 'Ensolarado') return 'sunny'
  if (condition === 'Parcialmente Nublado') return 'partly'
  if (condition === 'Nublado com Chuviscos') return 'cloudy'
  return 'storm'
}

/* ════════════════════════════════════════════════════
   AtmosphericBg — imagem conceitual discreta do clima
   Reage à condição atual do tempo (Chuva Moderada, Ensolarado, etc)
   ════════════════════════════════════════════════════ */
export function AtmosphericBg({ condition, light = false, isNight = false }) {
  const theme = CONDITION_THEME[condition] || CONDITION_THEME['Ensolarado']
  const bg = light ? theme.lightBg : theme.darkBg
  const variant = variantForCondition(condition)
  const timeVariant = isNight ? 'night' : 'day'

  return (
    <div className={`weather-atmosphere weather-atmosphere-${variant} weather-atmosphere-${timeVariant}`} aria-hidden="true" style={{ background: bg }}>
      <div className={`weather-art weather-art-${variant}`}>
        <span className="weather-orb" />
        <span className="weather-cloud weather-cloud-a" />
        <span className="weather-cloud weather-cloud-b" />
        <span className="weather-rain weather-rain-a" />
        <span className="weather-rain weather-rain-b" />
        <span className="weather-rain weather-rain-c" />
        <span className="weather-bolt" />
      </div>
    </div>
  )
}
