/* LoadingScreen v3 — mantém o original do projeto (chuva + glow + progress bar
   com 6 passos). Só adiciona "RECIFE EM TEMPO REAL" como tagline embaixo
   (substitui "DEFESA CIVIL · RECIFE, PE" — opcional, user gostou).

   IMPORTANTE: NÃO substituir por uma animação de gota — o user já gosta
   do splash atual. Esta versão é só polimento do tagline + verificação
   de que continua com 4.3s de duração total.
*/

import { useState, useEffect, useMemo } from 'react'
import { HydraLogo } from '../effects/HydraLogo.jsx'

export function LoadingScreen({ onDone }) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus]     = useState('Inicializando sistema...')
  const [out, setOut]           = useState(false)

  const steps = useMemo(() => [
    [200,  0,   'Inicializando sistema...'],
    [700,  18,  'Carregando bairros do Recife...'],
    [1300, 40,  'Obtendo dados climáticos APAC...'],
    [1900, 62,  'Calculando Hydra Score...'],
    [2500, 82,  'Gerando boletim Defesa Civil...'],
    [3100, 100, 'Sistema pronto.'],
  ], [])

  useEffect(() => {
    const ts = steps.map(([at, p, s]) => setTimeout(() => {
      setProgress(p); setStatus(s)
    }, at))
    const t1 = setTimeout(() => setOut(true), 3700)
    const t2 = setTimeout(onDone, 4300)
    return () => { ts.forEach(clearTimeout); clearTimeout(t1); clearTimeout(t2) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const drops = useMemo(() => Array.from({ length: 55 }, (_, i) => ({
    id: i,
    l: Math.random() * 110 - 5,
    h: 12 + Math.random() * 10,
    d: Math.random() * 3,
    dur: 0.7 + Math.random() * 0.5,
  })), [])

  return (
    <div
      role="status"
      aria-label="Carregando HydraRec"
      aria-live="polite"
      className="loading-screen"
      style={{ animation: out ? 'loadScreenOut .6s ease forwards' : 'fadeIn .4s ease' }}
    >
      <div className="rain-container" style={{ opacity: 0.3 }} aria-hidden="true">
        {drops.map(d => (
          <div
            key={d.id}
            className="rain-drop"
            style={{
              left: `${d.l}%`, height: `${d.h}px`, top: 0,
              animationDuration: `${d.dur}s`, animationDelay: `${d.d}s`,
            }}
          />
        ))}
      </div>
      <div className="loading-glow" aria-hidden="true" />

      <div className="loading-stack">
        <div className="loading-logo"><HydraLogo size={92} showText={false} /></div>
        <div className="loading-title-wrap">
          <div className="loading-title">HYDRA<span>REC</span></div>
          {/* MUDANÇA: tagline trocou pra "RECIFE EM TEMPO REAL" — user pediu */}
          <div className="loading-tagline">RECIFE EM TEMPO REAL</div>
        </div>
        <div className="loading-bar-wrap">
          <div className="loading-bar-track">
            <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="loading-bar-meta">
            <span className="loading-status">{status}</span>
            <span className="loading-percent">{progress}%</span>
          </div>
        </div>
      </div>
      <div className="loading-footer">DEFESA CIVIL · SISTEMA DE ALERTA CLIMÁTICO HIPERLOCAL</div>
    </div>
  )
}
