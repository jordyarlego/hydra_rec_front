import { useEffect, useState, useCallback, useMemo } from 'react'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'
import { priorityLabel } from './adminLabels.js'
import { ArrowClockwise, CheckCircle, ClipboardText, ArrowRight, Buildings, Warning } from '@phosphor-icons/react'
import { adminFetch, adminFetchJson } from '../../lib/adminFetch.js'

// ───── Constantes UI ────────────────────────────────────────────────
const COLUMNS = [
  { key: 'aberto',         label: 'Aberto',          next: 'em_atendimento', nextLabel: 'Iniciar atendimento' },
  { key: 'em_atendimento', label: 'Em atendimento',  next: 'resolvido',      nextLabel: 'Marcar resolvido' },
  { key: 'resolvido',      label: 'Resolvido',       next: 'fechado',        nextLabel: 'Fechar' },
  { key: 'fechado',        label: 'Fechado',         next: null,             nextLabel: null },
]

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

  // Agrupa tickets por coluna kanban
  const byColumn = useMemo(() => {
    const groups = { aberto: [], em_atendimento: [], resolvido: [], fechado: [] }
    for (const t of tickets) {
      const col = deriveKanbanState(t)
      if (groups[col]) groups[col].push(t)
    }
    return groups
  }, [tickets])

  async function moveTo(ticket, nextState) {
    setError(null)
    setMessage(null)
    try {
      // Caso especial: ir pra "resolvido" exige nota (mantém regra original)
      if (nextState === 'resolvido') {
        const note = (resolutionNotes[ticket.id] || '').trim()
        if (note.length < 8) {
          setError('Informe o que foi feito antes de marcar como resolvido.')
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
        setMessage('Chamado resolvido. Report vinculado também marcado como resolvido.')
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
          <h1>Kanban de chamados</h1>
          <p>Cada coluna é um estado de execução. Cards piscam quando passa do SLA da prioridade.</p>
        </div>
        <button type="button" className="btn-secondary admin-icon-button admin-compact-action" onClick={load}>
          <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {message && <p className="admin-success" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading && <p className="admin-empty">Carregando chamados…</p>}

      <div className="kanban-board">
        {COLUMNS.map(col => (
          <div key={col.key} className={`kanban-column kanban-col-${col.key}`}>
            <header className="kanban-col-head">
              <strong>{col.label}</strong>
              <span className="kanban-col-count">{byColumn[col.key]?.length || 0}</span>
            </header>
            <div className="kanban-col-body">
              {byColumn[col.key]?.length === 0 ? (
                <p className="kanban-empty">Nenhum.</p>
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
                          className="kanban-resolution"
                          rows={2}
                          placeholder="Como foi resolvido? (mín. 8 caracteres)"
                          value={resolutionNotes[ticket.id] || ''}
                          onChange={e => setResolutionNotes(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                        />
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
    </section>
  )
}
