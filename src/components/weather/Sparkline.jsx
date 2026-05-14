/* ════════════════════════════════════════════════════
   Sparkline — minigráfico SVG
   ════════════════════════════════════════════════════ */

export function Sparkline({ data = [], color = '#e8a030', width = 160, height = 42, showDots = true }) {
  if (!data.length) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * (width - 6) + 3,
    height - ((v - min) / range) * (height - 12) - 6,
  ])
  const d    = 'M ' + pts.map(p => p.join(',')).join(' L ')
  const area = `M ${pts[0].join(',')} L ${pts.map(p => p.join(',')).join(' L ')} L ${width - 3},${height} L 3,${height} Z`
  const gid  = 'sg' + Math.random().toString(36).slice(2, 8)

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity=".32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill={color} />)}
    </svg>
  )
}
