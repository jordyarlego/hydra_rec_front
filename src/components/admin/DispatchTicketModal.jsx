import { useEffect, useState } from 'react'
import { Envelope, Phone, ClipboardText, CheckCircle, X } from '@phosphor-icons/react'
import { adminFetch, adminFetchJson } from '../../lib/adminFetch.js'

/**
 * Modal de despacho — mostra e-mail/SMS pré-formatados pra admin
 * encaminhar o chamado pro órgão responsável (EMLURB, Defesa Civil…).
 *
 * MVP: admin abre cliente de e-mail nativo (mailto:) OU copia o texto
 * pra colar em outro canal. Depois clica "Marcar como encaminhado"
 * pra mover o chamado pra coluna "Encaminhado" no kanban.
 *
 * Em produção: substituir por integração direta com APIs dos órgãos.
 */
export function DispatchTicketModal({ ticketId, onClose, onDispatched }) {
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [marking, setMarking] = useState(false)

  useEffect(() => {
    if (!ticketId) return
    setLoading(true)
    setError(null)
    adminFetchJson(`/api/admin/tickets/${ticketId}/dispatch-draft`)
      .then(setDraft)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [ticketId])

  async function copyText() {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Não consegui copiar. Selecione o texto manualmente.')
    }
  }

  async function markDispatched() {
    if (!draft || marking) return
    setMarking(true)
    try {
      const res = await adminFetch(`/api/admin/tickets/${ticketId}/mark-dispatched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: draft.channel, notes: `Encaminhado via ${draft.channel}` }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onDispatched?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setMarking(false)
    }
  }

  if (!ticketId) return null

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="modal-panel dispatch-modal" role="dialog" aria-modal="true">
        <header className="modal-header">
          <div>
            <h2>Encaminhar chamado</h2>
            {draft && <small>Canal: <strong>{draft.channel}</strong></small>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={16} weight="bold" aria-hidden="true" />
          </button>
        </header>

        {loading && <p className="admin-empty">Preparando o texto…</p>}
        {error && <p className="form-error" role="alert">{error}</p>}

        {draft && (
          <>
            <div className="dispatch-help">
              <p>
                A integração automática com os órgãos ainda não está pronta. <strong>Por enquanto</strong>,
                você encaminha manualmente: abre seu cliente de e-mail (ou copia o texto) e envia pro canal certo.
                Depois clica em <em>"Já encaminhei"</em> pra mover o chamado pra próxima coluna.
              </p>
            </div>

            <div className="dispatch-contacts">
              <a href={`mailto:${draft.to}`} className="dispatch-contact" onClick={(e) => e.stopPropagation()}>
                <Envelope size={14} weight="bold" aria-hidden="true" />
                <span>{draft.to}</span>
              </a>
              <a href={`tel:${(draft.phone || '').replace(/\D/g, '')}`} className="dispatch-contact">
                <Phone size={14} weight="bold" aria-hidden="true" />
                <span>{draft.phone}</span>
              </a>
            </div>

            <label className="form-field">
              <span className="form-label">Assunto</span>
              <input type="text" value={draft.subject} readOnly />
            </label>
            <label className="form-field">
              <span className="form-label">Mensagem</span>
              <textarea rows={12} value={draft.body} readOnly />
            </label>

            <div className="dispatch-actions">
              <a
                href={draft.mailto}
                className="btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Envelope size={14} weight="bold" aria-hidden="true" />
                Abrir no e-mail
              </a>
              <button type="button" className="btn-secondary" onClick={copyText}>
                <ClipboardText size={14} weight="bold" aria-hidden="true" />
                {copied ? 'Copiado!' : 'Copiar texto'}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={markDispatched}
                disabled={marking}
              >
                <CheckCircle size={14} weight="bold" aria-hidden="true" />
                {marking ? 'Salvando…' : 'Já encaminhei'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
