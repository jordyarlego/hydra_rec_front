import { useState, useEffect } from 'react'

/* ════════════════════════════════════════════════════
   LiveClock — relógio digital ao vivo
   ════════════════════════════════════════════════════ */

export function LiveClock({ compact = false }) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className={`live-clock${compact ? ' compact' : ''}`} aria-live="polite" aria-atomic="true">
      <time className="live-clock-time" dateTime={now.toISOString()}>
        {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </time>
      <div className="live-clock-date">
        {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  )
}
