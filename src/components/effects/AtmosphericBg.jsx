import weatherSheet from '../../assets/weather-atmosphere-sheet-v3.png'
import { CONDITION_THEME } from '../../lib/soundManager.js'

function variantForCondition(condition) {
  if (condition === 'Ensolarado') return 'sunny'
  if (condition === 'Parcialmente Nublado') return 'partly'
  if (condition === 'Nublado com Chuviscos') return 'cloudy'
  if (condition === 'Chuva Moderada') return 'cloudy'
  return 'storm'
}

/* ════════════════════════════════════════════════════
   AtmosphericBg — sprite 4col×2row (col=condição, row=dia/noite)
   ════════════════════════════════════════════════════ */
export function AtmosphericBg({ condition, light = false, isNight = false }) {
  const theme = CONDITION_THEME[condition] || CONDITION_THEME['Ensolarado']
  const bg = light ? theme.lightBg : theme.darkBg
  const variant = variantForCondition(condition)
  const timeVariant = isNight ? 'night' : 'day'

  return (
    <div
      className={`weather-atmosphere weather-atmosphere-${variant} weather-atmosphere-${timeVariant}`}
      aria-hidden="true"
      style={{ background: bg }}
    >
      <div
        className={`weather-art weather-art-${variant} weather-art-${timeVariant}`}
        style={{ backgroundImage: `url(${weatherSheet})` }}
      />
    </div>
  )
}
