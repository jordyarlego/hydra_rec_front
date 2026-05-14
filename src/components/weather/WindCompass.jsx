/* ════════════════════════════════════════════════════
   WindCompass — bússola animada SVG
   ════════════════════════════════════════════════════ */

export function WindCompass({ deg = 0, light = false, size = 44 }) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const label = dirs[Math.round(deg / 45) % 8]
  const tc  = light ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.55)'
  const dim = light ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.1)'
  const dot = light ? 'rgba(0,0,0,.25)' : 'rgba(255,255,255,.25)'

  return (
    <div className="wind-compass">
      <svg width={size} height={size} viewBox="0 0 36 36" aria-label={`Vento: ${label}`}>
        <circle cx="18" cy="18" r="16" stroke={dim} strokeWidth="1" fill="none" />
        <text x="18" y="7"  textAnchor="middle" fontFamily="Outfit" fontSize="6" fill={tc}>N</text>
        <text x="31" y="21" textAnchor="middle" fontFamily="Outfit" fontSize="6" fill={tc}>E</text>
        <text x="18" y="33" textAnchor="middle" fontFamily="Outfit" fontSize="6" fill={tc}>S</text>
        <text x="5"  y="21" textAnchor="middle" fontFamily="Outfit" fontSize="6" fill={tc}>W</text>
        <g
          transform={`rotate(${deg}, 18, 18)`}
          style={{ transition: 'transform 1.2s cubic-bezier(.4,0,.2,1)' }}
        >
          <polygon points="18,5 20.5,18 18,16 15.5,18" fill="#e8a030" />
          <polygon points="18,31 20.5,18 18,20 15.5,18" fill={dot} />
        </g>
        <circle cx="18" cy="18" r="2" fill="#e8a030" />
      </svg>
      <span className="wind-compass-label" style={{ color: tc }}>{label}</span>
    </div>
  )
}
