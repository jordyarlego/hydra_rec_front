import { useEffect, useState } from 'react'
import OfficialCrossingPanel from './OfficialCrossingPanel.jsx'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'
import { priorityLabel, statusLabel, STATUS_HELP, STATUS_OPTIONS } from './adminLabels.js'
import { CheckCircle, ClipboardText, Robot, Ticket, X } from '@phosphor-icons/react'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export function AdminReportDetail({ token, reportId, onClose, onChanged }) {
  const [report, setReport] = useState(null)
  const [status, setStatus] = useState('pending')
  const [notes, setNotes] = useState('')
  const [ticketNotes, setTicketNotes] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    if (!reportId) return
    setError(null)
    setMessage(null)
    fetch(`/api/admin/reports/${reportId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => {
        setReport(data)
        setStatus(data.status || 'pending')
        setNotes(data.ai_validation_notes || '')
      })
      .catch(err => setError(err.message))
  }, [reportId, token])

  if (!reportId) return null

  async function save() {
    const res = await fetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ status, ai_validation_notes: notes }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    setMessage('Triagem salva.')
    onChanged?.()
  }

  async function createTicket() {
    const res = await fetch(`/api/admin/reports/${reportId}/ticket`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ priority: 'media', notes: ticketNotes }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ticket = await res.json()
    setMessage(`Chamado operacional aberto: #${ticket.id.slice(0, 8)}.`)
    onChanged?.()
  }

  const cat = report ? (CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro) : null
  const priority = report?.priority_result

  return (
    <aside className="admin-detail">
      <header className="admin-detail-head">
        <div>
          <h2>Triagem do report</h2>
          <p>Decida se vira chamado, revisão ou resolução.</p>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={17} weight="bold" aria-hidden="true" />
        </button>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="admin-success" role="status">{message}</p>}
      {!report ? <p>Carregando...</p> : (
        <>
          {report.photo_url && <img className="admin-report-photo" src={report.photo_url} alt="Foto do report" />}
          <div className="admin-detail-hero">
            <img src={cat.icon} alt="" aria-hidden="true" />
            <div>
              <span>{report.bairro || 'Bairro não identificado'}</span>
              <strong>{cat.label}</strong>
              <small>{report.created_at ? new Date(report.created_at).toLocaleString('pt-BR') : 'Sem data'}</small>
            </div>
          </div>

          <div className="admin-ai-box">
            <div className="admin-ai-title">
              <Robot size={18} weight="bold" aria-hidden="true" />
              Apoio da IA
            </div>
            <div className="admin-ai-grid">
              <span>Prioridade</span>
              <strong>{priority ? `${priorityLabel(priority.priority)} · ${priority.score}/100` : 'Calculando pelos dados disponíveis'}</strong>
              <span>Credibilidade</span>
              <strong>{report.ai_validation_score != null ? `${Math.round(report.ai_validation_score * 100)}%` : 'Sem foto validada'}</strong>
              <span>Comunidade</span>
              <strong>↑{report.likes_up ?? 0} ↓{report.likes_down ?? 0}</strong>
            </div>
            {priority?.reasons?.length > 0 && (
              <ul className="admin-ai-reasons">
                {priority.reasons.slice(0, 3).map((reason, index) => <li key={index}>{reason}</li>)}
              </ul>
            )}
          </div>

          {report.description && <p className="admin-description">{report.description}</p>}
          {report.weather && (
            <p className="admin-weather">APAC: {report.weather.rain_1h_mm ?? report.weather.rain_24h_mm ?? '-'} mm · {report.weather.station_name}</p>
          )}
          <label className="form-field admin-decision-field">
            <span className="form-label">Status</span>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <small>{STATUS_HELP[status]}</small>
          </label>
          <label className="form-field">
            <span className="form-label">Observação da triagem</span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Opcional: motivo para revisar, rejeitar ou encaminhar."
            />
          </label>
          <button type="button" className="btn-primary admin-icon-button" onClick={() => save().catch(e => setError(e.message))}>
            <CheckCircle size={17} weight="bold" aria-hidden="true" />
            Salvar triagem
          </button>

          <OfficialCrossingPanel reportId={reportId} token={token} />

          <section className="admin-action-card">
            <div>
              <h3><Ticket size={17} weight="bold" aria-hidden="true" /> Chamado operacional</h3>
              <p>Cria uma tarefa para equipe de campo e vincula ao report. Ao resolver o chamado, o report vira resolvido.</p>
            </div>
            <label className="form-field">
              <span className="form-label">Resumo para equipe</span>
              <textarea
                value={ticketNotes}
                onChange={e => setTicketNotes(e.target.value)}
                rows={2}
                placeholder="Ex.: verificar ponto, enviar equipe de drenagem, anexar protocolo externo."
              />
            </label>
            <button type="button" className="btn-secondary admin-icon-button" onClick={() => createTicket().catch(e => setError(e.message))}>
              <ClipboardText size={17} weight="bold" aria-hidden="true" />
              Gerar chamado
            </button>
          </section>

          {report.audit?.length > 0 && (
            <div className="admin-audit">
              <h3>Auditoria</h3>
              {report.audit.map(item => (
                <p key={item.id}><span>{item.action}</span> {new Date(item.created_at).toLocaleString('pt-BR')}</p>
              ))}
            </div>
          )}
        </>
      )}
    </aside>
  )
}
