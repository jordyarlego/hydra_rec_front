import { useState } from 'react'
import { CheckCircle, Lightning } from '@phosphor-icons/react'
import { adminFetchJson } from '../../lib/adminFetch.js'

/**
 * Card que aparece no topo do bucket `auto_validado`.
 * Permite aprovar em lote todos os reports visíveis na página atual.
 * Mantém humano no loop (1 clique) mas evita item-a-item.
 */
export function BatchApproveCard({ reports = [], onApproved }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function approveAll() {
    if (busy) return
    const ids = reports.map(r => r.id).filter(Boolean)
    if (!ids.length) return
    if (!confirm(`Aprovar ${ids.length} report(s) e gerar chamados automaticamente?`)) return

    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const r = await adminFetchJson('/api/admin/reports/batch-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_ids: ids }),
      })
      setResult(r)
      onApproved?.(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="batch-approve-card">
      <div className="batch-approve-head">
        <Lightning size={20} weight="fill" aria-hidden="true" />
        <div>
          <strong>Aprovação em lote disponível</strong>
          <small>
            {reports.length} report(s) foram pré-validados pela IA (score ≥ 75%, prioridade alta, sem reincidência).
            Cada um vira um chamado com órgão e título preenchidos automaticamente.
          </small>
        </div>
        <button
          type="button"
          className="btn-primary admin-icon-button"
          onClick={approveAll}
          disabled={busy || reports.length === 0}
        >
          <CheckCircle size={16} weight="bold" aria-hidden="true" />
          {busy ? 'Aprovando…' : `Aprovar ${reports.length}`}
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {result && (
        <p className="batch-approve-result" role="status">
          {result.approved_count} chamado(s) criado(s).
          {result.errors?.length > 0 && ` ${result.errors.length} falha(s).`}
        </p>
      )}
    </section>
  )
}
