import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   MobileNav v3 — FIEL ao componente original do projeto.

   NÃO foi reestilizado como "liquid glass pill" — o user pediu
   pra manter o visual atual (barra inferior simples com 2 botões).

   Apenas 2 abas:
   • Painel — abre sidebar drawer
   • Mapa   — fecha drawer, volta pro mapa

   SEMPRE VISÍVEL (z-index 70, acima do .modal-overlay).
   ════════════════════════════════════════════════════ */

export function MobileNav({ view, onChange }) {
  function go(v) {
    soundMgr.playClick()
    onChange(v)
  }

  return (
    <nav className="mobile-nav" aria-label="Navegação">
      <button
        type="button"
        className={`mobile-nav-btn${view === 'sidebar' ? ' active' : ''}`}
        onClick={() => go('sidebar')}
        aria-pressed={view === 'sidebar'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M22 12.55a11 11 0 0 0-19.16 0M16 5a4 4 0 0 0-8 0M3.55 12.55a14 14 0 0 1 16.9 0M8.5 12.55a8 8 0 0 1 7 0M12 17h.01" />
        </svg>
        <span>Painel</span>
      </button>
      <button
        type="button"
        className={`mobile-nav-btn${view === 'map' ? ' active' : ''}`}
        onClick={() => go('map')}
        aria-pressed={view === 'map'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>Mapa</span>
      </button>
    </nav>
  )
}
