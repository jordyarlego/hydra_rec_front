import { useEffect, useState } from 'react'
import { ClipboardText, X } from '@phosphor-icons/react'
import { adminFetch, adminFetchJson } from '../../lib/adminFetch.js'

const FALLBACK_ORGS = [
  { key: 'EMLURB_DRENAGEM',     label: 'EMLURB · Drenagem' },
  { key: 'EMLURB_ARBORIZACAO',  label: 'EMLURB · Arborização' },
  { key: 'EMLURB_PAVIMENTACAO', label: 'EMLURB · Pavimentação' },
  { key: 'EMLURB_LIMPEZA',      label: 'EMLURB · Limpeza Urbana' },
  { key: 'CELPE',               label: 'Celpe / Neoenergia' },
  { key: 'DEFESA_CIVIL',        label: 'Defesa Civil' },
  { key: 'OUTRO',               label: 'A definir' },
]

const PRIORITY_OPTIONS = [
  { key: 'urgente', label: 'Urgente (SLA 2h)' },
  { key: 'alta',    label: 'Alta (SLA 24h)' },
  { key: 'media',   label: 'Média (SLA 72h)' },
  { key: 'baixa',   label: 'Baixa (SLA 7 dias)' },
]

/**
 * Form de criação de chamado já preenchido com org sugerido + título auto-gerado pelo backend.
 * Usado quando admin clica "Validar e gerar chamado" no AdminReportDetail.
 */
export function TicketCreateForm({
  reportId,
  suggestedOrg = 'OUTRO',
  suggestedPriority = 'media',
  onCreated,
  onCancel,
}) {
  const [orgs, setOrgs] = useState(FALLBACK_ORGS)
  const [autoTitlePreview, setAutoTitlePreview] = useState('')
  const [form, setForm] = useState({
    assigned_org: suggestedOrg,
    priority: (suggestedPriority || 'media').toLowerCase(),
    title: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Carrega lista de órgãos do backend (fallback se 404)
  useEffect(() => {
    adminFetchJson('/api/admin/dispatch/orgs')
      .then(d => setOrgs(d.data || FALLBACK_ORGS))
      .catch(() => {/* mantém fallback */})
  }, [])

  // Preview do título auto-gerado (faz GET no detalhe pra capturar via/bairro)
  useEffect(() => {
    if (!reportId) return
    adminFetchJson(`/api/admin/reports/${reportId}`)
      .then(report => {
        // Reproduz auto_title local pra preview imediato (sem chamada extra)
        const tipo = (report.type || 'outro')
        const tipoLabel = {
          alagamento: 'Alagamento', deslizamento: 'Deslizamento',
          queda_arvore: 'Queda de árvore', via_intransitavel: 'Via fechada',
          poste_caido: 'Poste caído', buraco: 'Buraco na via',
          lixo: 'Acúmulo de lixo', iluminacao: 'Iluminação pública',
          outro: 'Ocorrência diversa',
        }[tipo] || 'Ocorrência'
        const bairro = report.bairro || 'Recife'
        const preview = `${tipoLabel} em ${bairro}`
        setAutoTitlePreview(preview)
      })
      .catch(() => setAutoTitlePreview(''))
  }, [reportId])

  function setField(k, v) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  async function submit(e) {
    e?.preventDefault?.()
    setError(null)
    setBusy(true)
    try {
      const payload = {
        assigned_org: form.assigned_org,
        priority: form.priority,
        // Se admin não digitou título, backend gera automaticamente
        ...(form.title.trim() ? { title: form.title.trim() } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      }
      const res = await adminFetch(`/api/admin/reports/${reportId}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail || `HTTP ${res.status}`)
      }
      const ticket = await res.json()
      onCreated?.(ticket)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="ticket-create-form" onSubmit={submit}>
      <header className="ticket-create-head">
        <ClipboardText size={16} weight="bold" aria-hidden="true" />
        <strong>Novo chamado</strong>
        <button type="button" className="modal-close" onClick={onCancel} aria-label="Cancelar">
          <X size={14} weight="bold" aria-hidden="true" />
        </button>
      </header>

      <label className="form-field">
        <span className="form-label">Órgão destino</span>
        <select value={form.assigned_org} onChange={e => setField('assigned_org', e.target.value)}>
          {orgs.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <small>Sugerido automaticamente pelo tipo do report.</small>
      </label>

      <label className="form-field">
        <span className="form-label">Prioridade (define SLA)</span>
        <select value={form.priority} onChange={e => setField('priority', e.target.value)}>
          {PRIORITY_OPTIONS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>

      <label className="form-field">
        <span className="form-label">Título do chamado</span>
        <input
          type="text"
          value={form.title}
          onChange={e => setField('title', e.target.value)}
          placeholder={autoTitlePreview || 'Auto-gerado se vazio'}
        />
        <small>Deixe vazio pra usar o título sugerido: <em>{autoTitlePreview || 'aguarde…'}</em></small>
      </label>

      <label className="form-field">
        <span className="form-label">Notas internas (opcional)</span>
        <textarea
          rows={2}
          value={form.notes}
          onChange={e => setField('notes', e.target.value)}
          placeholder="Ex.: solicitar foto adicional após chuva, anexar protocolo externo."
        />
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="decision-actions">
        <button type="button" className="btn-secondary btn-mini" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Criando…' : 'Criar chamado'}
        </button>
      </div>
    </form>
  )
}
