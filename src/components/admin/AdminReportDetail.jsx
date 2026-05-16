import { useEffect, useState } from 'react'
import OfficialCrossingPanel from './OfficialCrossingPanel.jsx'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'
import { priorityLabel } from './adminLabels.js'
import {
  CheckCircle, Robot, X, Warning, XCircle, MagnifyingGlass,
  CloudRain, Buildings, Stack,
} from '@phosphor-icons/react'
import { adminFetch, adminFetchJson } from '../../lib/adminFetch.js'
import { TicketCreateForm } from './TicketCreateForm.jsx'

// ───── Helpers UI ────────────────────────────────────────────────────
function verdict(score) {
  if (score == null) return { label: 'Sem análise', tone: 'na', justification: 'Nenhuma análise automática disponível ainda.' }
  const pct = Math.round(score * 100)
  if (score < 0.20) {
    return {
      label: `Suspeito · ${pct}%`,
      tone: 'suspeito',
      justification: 'Vision IA não reconheceu cena urbana ou confidence muito baixa.',
    }
  }
  if (score < 0.50) {
    return {
      label: `Inconclusivo · ${pct}%`,
      tone: 'inconclusivo',
      justification: 'Sinais mistos: parte coerente, parte sem evidência.',
    }
  }
  if (score < 0.75) {
    return {
      label: `Coerente · ${pct}%`,
      tone: 'coerente',
      justification: 'Foto + clima + descrição batem entre si.',
    }
  }
  return {
    label: `Alta confiança · ${pct}%`,
    tone: 'alta',
    justification: 'Vision IA + dados oficiais reforçam o report.',
  }
}

const ORG_SHORT = {
  EMLURB_DRENAGEM:     'EMLURB · Drenagem',
  EMLURB_ARBORIZACAO:  'EMLURB · Arborização',
  EMLURB_PAVIMENTACAO: 'EMLURB · Pavimentação',
  EMLURB_LIMPEZA:      'EMLURB · Limpeza Urbana',
  CELPE:               'Celpe / Neoenergia',
  DEFESA_CIVIL:        'Defesa Civil',
  OUTRO:               'A definir',
}

const ORG_BY_TYPE = {
  alagamento:        'EMLURB_DRENAGEM',
  queda_arvore:      'EMLURB_ARBORIZACAO',
  poste_caido:       'CELPE',
  iluminacao:        'CELPE',
  buraco:            'EMLURB_PAVIMENTACAO',
  lixo:              'EMLURB_LIMPEZA',
  deslizamento:      'DEFESA_CIVIL',
  via_intransitavel: 'EMLURB_PAVIMENTACAO',
  outro:             'OUTRO',
}

const REJECT_REASONS = [
  { key: 'duplicado',    label: 'Duplicado' },
  { key: 'foto_invalida', label: 'Foto inválida (não é problema urbano)' },
  { key: 'fora_escopo',  label: 'Fora de escopo' },
  { key: 'trote',        label: 'Trote / brincadeira' },
]

function formatRain(rain1h, rain24h) {
  const r1 = Number(rain1h)
  const r24 = Number(rain24h)
  if (Number.isFinite(r1) && r1 > 0) return `${r1.toFixed(1).replace('.', ',')} mm na última hora`
  if (Number.isFinite(r24) && r24 > 0) return `${r24.toFixed(1).replace('.', ',')} mm nas últimas 24h`
  return 'Sem chuva relevante registrada'
}

// ───── Componente ────────────────────────────────────────────────────
export function AdminReportDetail({ reportId, onClose, onChanged, onOpenTickets }) {
  const [report, setReport] = useState(null)
  const [duplicates, setDuplicates] = useState([])
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  // Estado de fluxos
  const [mode, setMode] = useState('idle') // idle | validate | flag | reject
  const [flagNote, setFlagNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!reportId) {
      setReport(null); setDuplicates([]); setMode('idle')
      setError(null); setMessage(null)
      setFlagNote(''); setRejectReason('')
      return
    }
    setError(null); setMessage(null)
    setMode('idle')
    setFlagNote(''); setRejectReason('')

    adminFetchJson(`/api/admin/reports/${reportId}`)
      .then(data => setReport(data))
      .catch(err => setError(err.message))

    // Duplicates em paralelo — falhas silenciosas
    adminFetchJson(`/api/admin/reports/${reportId}/duplicates`)
      .then(d => setDuplicates(d.data || []))
      .catch(() => setDuplicates([]))
  }, [reportId])

  if (!reportId) return null

  async function patchReport(payload) {
    const res = await adminFetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      throw new Error(detail.detail || `HTTP ${res.status}`)
    }
  }

  async function handleFlag() {
    setError(null)
    if (!flagNote.trim() || flagNote.trim().length < 8) {
      setError('Descreva o motivo da revisão (mín. 8 caracteres).')
      return
    }
    try {
      await patchReport({ status: 'flagged', ai_validation_notes: flagNote, bucket: 'revisar' })
      setMessage('Report marcado para revisão de campo.')
      setMode('idle')
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  async function handleReject() {
    setError(null)
    if (!rejectReason) {
      setError('Escolha o motivo da rejeição.')
      return
    }
    try {
      await patchReport({
        status: 'rejected',
        bucket: 'filtrado',
        rejection_reason: rejectReason,
      })
      setMessage('Report rejeitado.')
      setMode('idle')
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  async function handleAggregate(ticketId) {
    setError(null)
    try {
      const res = await adminFetch(`/api/admin/reports/${reportId}/aggregate-to/${ticketId}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setMessage(`Agregado ao chamado #${ticketId.slice(0, 8)}.`)
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  function onTicketCreated(ticket) {
    setMessage(`Chamado #${ticket.id?.slice(0, 8) || ''} criado e vinculado.`)
    setMode('idle')
    setReport(prev => prev ? { ...prev, ticket_id: ticket.id, status: 'validated' } : prev)
    onChanged?.()
  }

  if (!report && error) {
    return (
      <aside className="admin-detail">
        <header className="admin-detail-head">
          <div><h2>Triagem do report</h2></div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={17} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <p className="form-error" role="alert">{error}</p>
      </aside>
    )
  }
  if (!report) {
    return (
      <aside className="admin-detail">
        <p>Carregando…</p>
      </aside>
    )
  }

  const cat = CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro
  const priority = report.priority_result
  const v = verdict(report.ai_validation_score)
  const suggestedOrg = ORG_BY_TYPE[report.type] || 'OUTRO'
  const orgLabel = ORG_SHORT[suggestedOrg] || 'A definir'
  const weather = report.weather
  const hasDuplicates = duplicates.length > 0

  return (
    <aside className="admin-detail">
      <header className="admin-detail-head">
        <div>
          <h2>Triagem do report</h2>
          <p>3 caminhos: validar e gerar chamado, marcar pra revisão, ou rejeitar.</p>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={17} weight="bold" aria-hidden="true" />
        </button>
      </header>

      {report.photo_url && <img className="admin-report-photo" src={report.photo_url} alt="Foto do report" />}

      <div className="admin-detail-hero">
        <img src={cat.icon} alt="" aria-hidden="true" />
        <div>
          <span>{report.bairro || 'Bairro não identificado'}</span>
          <strong>{cat.label}</strong>
          <small>{report.created_at ? new Date(report.created_at).toLocaleString('pt-BR') : 'Sem data'}</small>
        </div>
      </div>

      {/* Card "Apoio da IA" reformulado */}
      <div className="admin-ai-box">
        <div className="admin-ai-title">
          <Robot size={18} weight="bold" aria-hidden="true" />
          Apoio da IA
        </div>
        <div className={`verdict-banner verdict-${v.tone}`}>
          <strong>{v.label}</strong>
          <small>{v.justification}</small>
        </div>
        <div className="admin-ai-grid">
          <span>Prioridade sugerida</span>
          <strong>{priority ? `${priorityLabel(priority.priority)} (${priority.score}/100)` : 'Calculando…'}</strong>
          <span>Órgão destino</span>
          <strong className="org-suggestion">
            <Buildings size={14} weight="bold" aria-hidden="true" /> {orgLabel}
          </strong>
          <span>Comunidade</span>
          <strong>↑ {report.likes_up ?? 0}  ↓ {report.likes_down ?? 0}</strong>
        </div>
      </div>

      {report.description && <p className="admin-description">{report.description}</p>}

      {weather && (
        <p className="admin-weather">
          <CloudRain size={14} weight="bold" aria-hidden="true" />
          {' '}{formatRain(weather.rain_1h_mm, weather.rain_24h_mm)}
          {weather.station_name && (
            <> · estação {weather.station_name} (APAC)</>
          )}
        </p>
      )}

      {/* Banner de duplicata acima dos botões */}
      {hasDuplicates && (
        <div className="dup-banner" role="alert">
          <Stack size={18} weight="bold" aria-hidden="true" />
          <div>
            <strong>Possível duplicata detectada</strong>
            <small>
              {duplicates[0].distance_m}m daqui, mesmo tipo, há{' '}
              {duplicates[0].created_at
                ? new Date(duplicates[0].created_at).toLocaleString('pt-BR')
                : 'pouco tempo'}.
            </small>
          </div>
          {duplicates[0].ticket_id ? (
            <button
              type="button"
              className="btn-secondary btn-mini"
              onClick={() => handleAggregate(duplicates[0].ticket_id)}
            >
              Agregar ao chamado existente
            </button>
          ) : (
            <small className="dup-no-ticket">(sem chamado vinculado ainda)</small>
          )}
        </div>
      )}

      <OfficialCrossingPanel reportId={reportId} />

      {/* Bloco de decisão — feedback ao lado dos botões */}
      <section className="decision-block">
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="admin-success" role="status">{message}</p>}

        {report.ticket_id ? (
          <div className="admin-ticket-linked">
            <CheckCircle size={16} weight="bold" aria-hidden="true" />
            Este report já tem chamado vinculado.
            <button type="button" className="btn-primary btn-mini" onClick={onOpenTickets}>
              Ver em Chamados
            </button>
          </div>
        ) : mode === 'validate' ? (
          <TicketCreateForm
            reportId={reportId}
            suggestedOrg={suggestedOrg}
            suggestedPriority={priority?.priority || 'media'}
            reportType={report.type}
            onCreated={onTicketCreated}
            onCancel={() => setMode('idle')}
          />
        ) : mode === 'flag' ? (
          <div className="decision-form">
            <label className="form-field">
              <span className="form-label">Por que precisa de revisão de campo?</span>
              <textarea
                value={flagNote}
                onChange={e => setFlagNote(e.target.value)}
                rows={3}
                placeholder="Ex.: foto da via mas equipe precisa confirmar se ainda está alagada."
                autoFocus
              />
            </label>
            <div className="decision-actions">
              <button type="button" className="btn-secondary btn-mini" onClick={() => setMode('idle')}>Cancelar</button>
              <button type="button" className="btn-primary btn-warn" onClick={handleFlag}>Marcar pra revisão</button>
            </div>
          </div>
        ) : mode === 'reject' ? (
          <div className="decision-form">
            <fieldset className="form-field reject-fieldset">
              <legend className="form-label">Motivo da rejeição</legend>
              {REJECT_REASONS.map(r => (
                <label key={r.key} className="reject-radio">
                  <input
                    type="radio"
                    name="reject-reason"
                    value={r.key}
                    checked={rejectReason === r.key}
                    onChange={() => setRejectReason(r.key)}
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <div className="decision-actions">
              <button type="button" className="btn-secondary btn-mini" onClick={() => setMode('idle')}>Cancelar</button>
              <button type="button" className="btn-primary btn-danger" onClick={handleReject}>Confirmar rejeição</button>
            </div>
          </div>
        ) : (
          <div className="decision-buttons">
            <button
              type="button"
              className="btn-decision btn-decision-validate"
              onClick={() => setMode('validate')}
            >
              <CheckCircle size={18} weight="bold" aria-hidden="true" />
              Validar e gerar chamado
            </button>
            <button
              type="button"
              className="btn-decision btn-decision-flag"
              onClick={() => setMode('flag')}
            >
              <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
              Marcar pra revisão de campo
            </button>
            <button
              type="button"
              className="btn-decision btn-decision-reject"
              onClick={() => setMode('reject')}
            >
              <XCircle size={18} weight="bold" aria-hidden="true" />
              Rejeitar
            </button>
          </div>
        )}
      </section>

      {report.audit?.length > 0 && (
        <div className="admin-audit">
          <h3>Auditoria</h3>
          {report.audit.map(item => (
            <p key={item.id}><span>{item.action}</span> {new Date(item.created_at).toLocaleString('pt-BR')}</p>
          ))}
        </div>
      )}
    </aside>
  )
}
