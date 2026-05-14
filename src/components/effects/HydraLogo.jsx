/* ════════════════════════════════════════════════════
   HydraLogo — gota + bússola SVG
   ════════════════════════════════════════════════════ */

export function HydraLogo({ size = 44, showText = true, light = false }) {
  const tc  = light ? '#1a1a1a'           : '#ffffff'
  const ts  = light ? 'rgba(0,0,0,.4)'    : 'rgba(255,255,255,.45)'
  const div = light ? 'rgba(0,0,0,.12)'   : 'rgba(255,255,255,.1)'
  const id  = `lg${showText ? 't' : 'm'}${light ? 'l' : 'd'}`

  return (
    <svg
      width={showText ? 168 : size}
      height={size}
      viewBox={showText ? '0 0 168 44' : '0 0 44 44'}
      fill="none"
      aria-label="HydraRec"
    >
      <defs>
        <linearGradient id={id + '1'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#e8a030" />
          <stop offset="100%" stopColor="#c97820" />
        </linearGradient>
        <linearGradient id={id + '2'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(232,160,48,.28)" />
          <stop offset="100%" stopColor="rgba(232,160,48,0)" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="19" stroke={`url(#${id}1)`} strokeWidth="1.2" strokeOpacity=".3" />
      <path d="M10 22A12 12 0 0 1 34 22" stroke={`url(#${id}1)`} strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M22 10C22 10 14 18 14 23.5A8 8 0 0 0 30 23.5C30 18 22 10 22 10Z"
        fill={`url(#${id}2)`}
        stroke={`url(#${id}1)`}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M13 31Q16 28 19 31" stroke={`url(#${id}1)`} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <line x1="22" y1="29" x2="22" y2="31.5" stroke={`url(#${id}1)`} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M25 31Q28 28 31 31" stroke={`url(#${id}1)`} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="23" r="2" fill={`url(#${id}1)`} />

      {showText && (
        <>
          <text x="52" y="19" fontFamily="Outfit,sans-serif" fontWeight="600" fontSize="14" fill={tc} letterSpacing="2.4">HYDRA</text>
          <text x="52" y="34" fontFamily="Outfit,sans-serif" fontWeight="200" fontSize="13" fill={ts} letterSpacing="4.2">REC</text>
          <line x1="52" y1="22" x2="148" y2="22" stroke={div} strokeWidth=".5" />
        </>
      )}
    </svg>
  )
}
