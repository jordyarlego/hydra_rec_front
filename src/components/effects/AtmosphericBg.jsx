import { useState, useEffect, useMemo } from 'react'
import { CONDITION_THEME } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   Rain — gotas animadas (CSS)
   ════════════════════════════════════════════════════ */
function Rain({ intensity }) {
  if (intensity === 'none') return null
  const count = intensity === 'heavy' ? 90 : intensity === 'normal' ? 60 : 30
  const drops = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 110 - 5,
    height: intensity === 'heavy' ? 18 + Math.random() * 14 : 12 + Math.random() * 10,
    delay: Math.random() * 3,
    duration: intensity === 'heavy' ? 0.6 + Math.random() * 0.4 : 0.8 + Math.random() * 0.6,
  })), [intensity, count])

  return (
    <div className="rain-container" aria-hidden="true">
      {drops.map(d => (
        <div
          key={d.id}
          className={`rain-drop${intensity === 'heavy' ? ' heavy' : ''}`}
          style={{
            left: `${d.left}%`,
            height: `${d.height}px`,
            top: 0,
            animationDuration: `${d.duration}s`,
            animationDelay: `${d.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════
   Lightning — flash periódico
   ════════════════════════════════════════════════════ */
function Lightning({ onFlash }) {
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    let t
    const go = () => {
      t = setTimeout(() => {
        setFlash(true)
        onFlash && onFlash()
        setTimeout(() => setFlash(false), 500)
        go()
      }, 4000 + Math.random() * 10000)
    }
    go()
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!flash) return null
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'rgba(220,228,255,.05)', animation: 'lightning .5s ease',
      }}
    />
  )
}

/* ════════════════════════════════════════════════════
   AtmosphericBg — gradiente + nuvens + chuva + raio
   Reage à condição atual do tempo (Chuva Moderada, Ensolarado, etc)
   ════════════════════════════════════════════════════ */
export function AtmosphericBg({ condition, light = false, onThunder }) {
  const theme = CONDITION_THEME[condition] || CONDITION_THEME['Ensolarado']
  const bg = light ? theme.lightBg : theme.darkBg

  return (
    <>
      <div className="atm-base" aria-hidden="true" style={{ background: bg }} />
      <div
        className="atm-cloud-a"
        aria-hidden="true"
        style={{ background: `radial-gradient(ellipse 80% 60% at 70% 40%,rgba(${light ? '140,145,155' : '70,72,82'},${theme.cloud * 0.45}) 0%,transparent 70%)` }}
      />
      <div
        className="atm-cloud-b"
        aria-hidden="true"
        style={{ background: `radial-gradient(ellipse 55% 38% at 88% 18%,rgba(${light ? '130,135,145' : '90,90,100'},${theme.cloud * 0.3}) 0%,transparent 60%)` }}
      />
      <Rain intensity={theme.rain} />
      {theme.hasThunder && <Lightning onFlash={onThunder} />}
    </>
  )
}
