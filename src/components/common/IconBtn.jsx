import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   IconBtn — botão de ícone reutilizável (header, toolbar)
   ════════════════════════════════════════════════════ */

export function IconBtn({ onClick, label, children, active = false, danger = false }) {
  return (
    <button
      type="button"
      onClick={() => { soundMgr.playClick(); onClick && onClick() }}
      aria-label={label}
      title={label}
      className={`icon-btn${active ? ' active' : ''}${danger && active ? ' danger' : ''}`}
    >
      {children}
    </button>
  )
}
