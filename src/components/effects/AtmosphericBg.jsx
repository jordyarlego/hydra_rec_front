import { CONDITION_THEME } from '../../lib/soundManager.js'
import weatherSheet from '../../assets/weather-atmosphere-sheet-v3.png'

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
      <div className="weather-art-window">
        <img
          className={`weather-art-img weather-art-${variant} weather-art-${timeVariant}`}
          src={weatherSheet}
          alt=""
          draggable="false"
        />
      </div>
    </div>
  )
}
