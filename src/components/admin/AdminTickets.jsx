import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'
import { priorityLabel } from './adminLabels.js'
import { ArrowClockwise, CheckCircle, ClipboardText, ArrowRight, Buildings, Warning } from '@phosphor-icons/react'
import { adminFetch, adminFetchJson } from '../../lib/adminFetch.js'
import { DispatchTicketModal } from './DispatchTicketModal.jsx'
import { SuccessOverlay } from '../common/SuccessOverlay.jsx'

// ───── Constantes UI ────────────────────────────────────────────────
// Linguagem cidadã pros estados (item 11 do backlog):
//  - "Aberto": chamado criado, ninguém ainda foi acionado
//  - "Encaminhado": despachado pra um órgão (EMLURB/Defesa Civil)
//  - "Resolvido": equipe externa confirmou conclusão; aguarda follow-up
//  - "Fechado": resolvido e arquivado (auto-fecha após 7 dias)
const COLUMNS = [
  { key: 'aberto',         label: 'Aberto',           hint: 'Recém-criado pela triagem', next: 'em_atendimento', nextLabel: 'Encaminhar pro órgão' },
  { key: 'em_atendimento', label: 'Encaminhado',      hint: 'Despachado pra equipe responsável', next: 'resolvido', nextLabel: 'Marcar como resolvido' },
  { key: 'resolvido',      label: 'Resolvido',        hint: 'Confirmado pela equipe — aguarda fechamento automático em 7 dias', next: 'fechado', nextLabel: 'Fechar agora' },
  { key: 'fechado',        label: 'Fechado',          hint: 'Arquivados', next: null, nextLabel: null },
]

// Ordem de exibição por prioridade dentro de cada coluna (Trello-like)
const PRIORITY_ORDER = { urgente: 0, alta: 1, media: 2, baixa: 3 }

// Fallback: tickets antigos não têm kanban_state → derivar a partir do status legacy
function deriveKanbanState(ticket) {
  if (ticket.kanban_state) return ticket.kanban_state
  const s = ticket.status
  if (s === 'resolvido' || s === 'cancelado') return 'resolvido'
  if (s === 'em_andamento' || s === 'triagem' || s === 'aguardando') return 'em_atendimento'
  return 'aberto'
}

// SLA: pisca card se sla_deadline passou
function isOverdue(ticket) {
  if (!ticket.sla_deadline) return false
  if (deriveKanbanState(ticket) === 'fechado') return false
  return new Date(ticket.sla_deadline).getTime() < Date.now()
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `há ${days}d`
}

const ORG_SHORT = {
  EMLURB_DRENAGEM:     'EMLURB · Drenagem',
  EMLURB_ARBORIZACAO:  'EMLURB · Arborização',
  EMLURB_PAVIMENTACAO: 'EMLURB · Pavimentação',
  EMLURB_LIMPEZA:      'EMLURB · Limpeza',
  CELPE:               'Celpe',
  DEFESA_CIVIL:        'Defesa Civil',
  OUTRO:               'A definir',
}

// ───── Componente principal ─────────────────────────────────────────
export function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const noteRefs = useRef({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchJson('/api/admin/tickets?limit=100')
      setTickets(data.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Agrupa tickets por coluna, ordena por prioridade (urgentes primeiro)
  const byColumn = useMemo(() => {
    const groups = { aberto: [], em_atendimento: [], resolvido: [], fechado: [] }
    for (const t of tickets) {
      const col = deriveKanbanState(t)
      if (groups[col]) groups[col].push(t)
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 9
        const pb = PRIORITY_ORDER[b.priority] ?? 9
        if (pa !== pb) return pa - pb
        // Mesmo nível: mais novo primeiro
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      })
    }
    return groups
  }, [tickets])

  const [showClosed, setShowClosed] = useState(false)
  const [dispatchingTicket, setDispatchingTicket] = useState(null)
  const [success, setSuccess] = useState(null)

  async function moveTo(ticket, nextState) {
    setError(null)
    setMessage(null)

    // Caso especial: ir pra "em_atendimento" abre modal de despacho.
    // Admin precisa encaminhar pro órgão antes (e-mail / telefone).
    if (nextState === 'em_atendimento' && deriveKanbanState(ticket) === 'aberto') {
      setDispatchingTicket(ticket.id)
      return
    }
    try {
      // Caso especial: ir pra "resolvido" exige nota (mantém regra original)
      if (nextState === 'resolvido') {
        const note = (resolutionNotes[ticket.id] || '').trim()
        if (note.length < 8) {
          setFieldErrors(prev => ({
            ...prev,
            [ticket.id]: 'Descreva em poucas palavras o que foi feito antes de resolver.',
          }))
          noteRefs.current[ticket.id]?.focus()
          return
        }
        // Usa endpoint /close existente que registra resolution_note + atualiza report vinculado
        const res = await adminFetch(`/api/admin/tickets/${ticket.id}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution_note: note }),
        })
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}))
          throw new Error(detail.detail || `HTTP ${res.status}`)
        }
        // Garante que kanban_state também seja resolvido
        await adminFetch(`/api/admin/tickets/${ticket.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kanban_state: 'resolvido' }),
        })
        setResolutionNotes(prev => ({ ...prev, [ticket.id]: '' }))
        setFieldErrors(prev => ({ ...prev, [ticket.id]: null }))
        setMessage('Chamado resolvido. Report vinculado também marcado como resolvido.')
        setSuccess({ title: 'Chamado resolvido', subtitle: 'O report saiu da triagem pública do mapa.' })
      } else {
        const res = await adminFetch(`/api/admin/tickets/${ticket.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kanban_state: nextState }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setMessage(`Chamado movido para ${COLUMNS.find(c => c.key === nextState)?.label || nextState}.`)
      }
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="admin-section kanban-section">
      <div className="admin-section-head">
        <div>
          <h1>Chamados em andamento</h1>
          <p>
            Quadro operacional de chamados. O despacho abre o e-mail pronto e já move o chamado para encaminhado.
            Cards <strong>piscam vermelho</strong> quando passa do prazo esperado (Urgente: 2h · Alta: 24h · Média: 72h · Baixa: 7 dias).
            Arquivados ficam ocultos no fim — chamados resolvidos arquivam sozinhos depois de 7 dias.
          </p>
        </div>
        <button type="button" className="btn-secondary admin-icon-button admin-compact-action" onClick={load}>
          <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {message && <p className="admin-success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="admin-empty">Carregando chamados…</p>}

      <div className="kanban-board kanban-board-3col">
        {COLUMNS.filter(c => c.key !== 'fechado').map(col => (
          <div key={col.key} className={`kanban-column kanban-col-${col.key}`}>
            <header className="kanban-col-head">
              <div>
                <strong>{col.label}</strong>
                <small className="kanban-col-hint">{col.hint}</small>
              </div>
              <span className="kanban-col-count">{byColumn[col.key]?.length || 0}</span>
            </header>
            <div className="kanban-col-body">
              {byColumn[col.key]?.length === 0 ? (
                <p className="kanban-empty">Nenhum chamado por aqui.</p>
              ) : (
                byColumn[col.key].map(ticket => {
                  const cat = CATEGORY_BY_ID[ticket.type] || CATEGORY_BY_ID.outro
                  const overdue = isOverdue(ticket)
                  const isResolvendo = col.key === 'em_atendimento' // só nesta coluna mostra textarea
                  return (
                    <article key={ticket.id} className={`kanban-card prio-${ticket.priority || 'media'} ${overdue ? 'is-overdue' : ''}`}>
                      <div className="kanban-card-head">
                        <img src={cat.icon} alt="" aria-hidden="true" className="kanban-card-icon" />
                        <div className="kanban-card-title">
                          <strong>{cat.label}</strong>
                          <small>{ticket.bairro || 'Bairro não identificado'}</small>
                        </div>
                        {overdue && (
                          <span className="kanban-overdue-badge" title="Passou do SLA">
                            <Warning size={13} weight="fill" aria-hidden="true" /> SLA
                          </span>
                        )}
                      </div>

                      <div className="kanban-card-meta">
                        <span className={`admin-priority priority-${ticket.priority}`}>{priorityLabel(ticket.priority)}</span>
                        {ticket.assigned_org && (
                          <span className="kanban-org">
                            <Buildings size={12} weight="bold" aria-hidden="true" />
                            {ORG_SHORT[ticket.assigned_org] || ticket.assigned_org}
                          </span>
                        )}
                        <span className="kanban-time">{timeAgo(ticket.created_at)}</span>
                      </div>

                      {ticket.notes && (
                        <p className="kanban-card-note">
                          <ClipboardText size={13} aria-hidden="true" /> {ticket.notes}
                        </p>
                      )}

                      {isResolvendo && (
                        <textarea
                          ref={el => { noteRefs.current[ticket.id] = el }}
                          className="kanban-resolution"
                          rows={2}
                          placeholder="Como foi resolvido? (mín. 8 caracteres)"
                          value={resolutionNotes[ticket.id] || ''}
                          aria-invalid={Boolean(fieldErrors[ticket.id])}
                          onChange={e => {
                            setResolutionNotes(prev => ({ ...prev, [ticket.id]: e.target.value }))
                            if (fieldErrors[ticket.id]) {
                              setFieldErrors(prev => ({ ...prev, [ticket.id]: null }))
                            }
                          }}
                        />
                      )}
                      {fieldErrors[ticket.id] && (
                        <p className="kanban-field-error" role="alert">{fieldErrors[ticket.id]}</p>
                      )}

                      {col.next && (
                        <button
                          type="button"
                          className="btn-primary btn-mini kanban-next-btn"
                          onClick={() => moveTo(ticket, col.next)}
                        >
                          {col.next === 'resolvido' ? (
                            <><CheckCircle size={13} weight="bold" aria-hidden="true" /> {col.nextLabel}</>
                          ) : (
                            <>{col.nextLabel} <ArrowRight size={13} weight="bold" aria-hidden="true" /></>
                          )}
                        </button>
                      )}
                    </article>
                  )
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {dispatchingTicket && (
        <DispatchTicketModal
          ticketId={dispatchingTicket}
          onClose={() => setDispatchingTicket(null)}
          onDispatched={() => {
            setDispatchingTicket(null)
            setSuccess({ title: 'Chamado encaminhado!', subtitle: 'Movido pra coluna "Encaminhado".' })
            load()
          }}
        />
      )}
      {success && (
        <SuccessOverlay
          title={success.title}
          subtitle={success.subtitle}
          duration={1600}
          onDone={() => setSuccess(null)}
        />
      )}

      {/* Accordion de fechados — fora do board, ocupa toda largura */}
      <section className="kanban-closed-accordion">
        <button
          type="button"
          className="kanban-closed-toggle"
          onClick={() => setShowClosed(s => !s)}
          aria-expanded={showClosed}
        >
          <strong>Chamados arquivados</strong>
          <span className="kanban-col-count">{byColumn.fechado?.length || 0}</span>
          <span className="kanban-closed-caret">{showClosed ? '▼' : '▶'}</span>
        </button>
        {showClosed && (
          <div className="kanban-closed-body">
            {byColumn.fechado?.length === 0 ? (
              <p className="kanban-empty">Nenhum chamado arquivado ainda.</p>
            ) : (
              byColumn.fechado.map(ticket => {
                const cat = CATEGORY_BY_ID[ticket.type] || CATEGORY_BY_ID.outro
                return (
                  <article key={ticket.id} className="kanban-closed-card">
                    <img src={cat.icon} alt="" aria-hidden="true" />
                    <div>
                      <strong>{cat.label}</strong>
                      <small>{ticket.bairro || 'Bairro não identificado'} · {timeAgo(ticket.created_at)}</small>
                    </div>
                    {ticket.assigned_org && (
                      <span className="kanban-org">{ORG_SHORT[ticket.assigned_org] || ticket.assigned_org}</span>
                    )}
                  </article>
                )
              })
            )}
          </div>
        )}
      </section>
    </section>
  )
}
