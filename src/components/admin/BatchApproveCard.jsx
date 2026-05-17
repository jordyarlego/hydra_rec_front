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
    if (!confirm(
      `Aprovar ${ids.length} report(s) de uma vez?\n\n` +
      `Cada um vai virar um CHAMADO oficial (com órgão sugerido pela IA + ` +
      `título auto-gerado), passar pra coluna "Aberto" do kanban, e aparecer na ` +
      `aba Chamados pronto pra você encaminhar pro órgão responsável.\n\n` +
      `Você ainda precisa "Encaminhar" cada chamado depois — esse botão só ` +
      `pula a etapa de revisar 1 a 1 os reports que a IA já validou com alta confiança.`
    )) return

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
          <strong>{reports.length} report(s) prontos pra virar chamado</strong>
          <small>
            A IA já confirmou alta probabilidade (foto urbana clara + clima compatível + sem reincidência).
            <strong> "Aprovar todos"</strong> gera {reports.length} chamado(s) de uma vez, com órgão e título preenchidos
            — você economiza tempo de revisar 1 por 1 e parte direto pra etapa de encaminhar.
          </small>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={approveAll}
          disabled={busy || reports.length === 0}
        >
          <CheckCircle size={16} weight="bold" aria-hidden="true" />
          {busy ? 'Aprovando…' : `Aprovar ${reports.length} e gerar chamados`}
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
