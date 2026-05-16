import { useEffect, useState } from 'react'
import { Warning, X } from '@phosphor-icons/react'

/* ════════════════════════════════════════════════════
   SchemaWarning — banner topo que aparece quando a
   migration V3 não foi aplicada no Supabase.
   Some sozinho quando você aplica.
   Pode ser fechado manualmente (localStorage).
   ════════════════════════════════════════════════════ */

const STORAGE_KEY = 'hr_schema_warning_dismissed_at'
const DISMISS_TTL_MS = 6 * 60 * 60 * 1000  // 6h — volta a alertar depois

export function SchemaWarning() {
  const [state, setState] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem(STORAGE_KEY)
    if (t && Date.now() - Number(t) < DISMISS_TTL_MS) setDismissed(true)

    fetch('/api/healthz/schema')
      .then(r => r.ok ? r.json() : null)
      .then(setState)
      .catch(() => setState(null))
  }, [])

  if (!state) return null
  if (state.v3_civic_applied && state.v3_odh_applied) return null
  if (dismissed) return null

  function close() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
    setDismissed(true)
  }

  const civic = state.v3_civic_applied
  const odh   = state.v3_odh_applied

  return (
    <div className="schema-warning" role="alert">
      <Warning size={16} weight="fill" aria-hidden="true" />
      <div className="schema-warning-body">
        <strong>Migration pendente no Supabase</strong>
        <span className="schema-warning-detail">
          {!civic && 'Reports não salvam foto nem validação IA. '}
          {!odh   && 'Cruzamento com dados oficiais desativado. '}
          Veja <code>MIGRATION_GUIDE.md</code> na raiz do projeto.
        </span>
      </div>
      <button type="button" className="schema-warning-close" onClick={close} aria-label="Fechar aviso">
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}
