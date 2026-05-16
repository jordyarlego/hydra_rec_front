import { useEffect, useState } from 'react'
import { priorityLabel } from './adminLabels.js'
import { ArrowClockwise, CheckCircle } from '@phosphor-icons/react'

export function AdminTickets({ token }) {
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  async function load() {
    try {
      const res = await fetch('/api/admin/tickets', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRows(data.data || [])
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function closeTicket(id) {
    const res = await fetch(`/api/admin/tickets/${id}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await load()
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h1>Tickets</h1>
          <p>Tarefas operacionais geradas a partir de reports validados.</p>
        </div>
        <button type="button" className="btn-secondary admin-icon-button" onClick={load}>
          <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
          Atualizar
        </button>
      </div>
      <p className="admin-explainer">
        Abrir chamado cria uma tarefa para equipe de campo. Resolver chamado marca o ticket como resolvido e também muda o report vinculado para resolvido.
      </p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>Bairro</th><th>Tipo</th><th>Prioridade</th><th>Status</th><th>Ação</th></tr>
          </thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id}>
                <td className="admin-mono">{t.id.slice(0, 8)}</td>
                <td>{t.bairro || '-'}</td>
                <td>{t.type || '-'}</td>
                <td><span className={`admin-priority priority-${t.priority}`}>{priorityLabel(t.priority)}</span></td>
                <td><span className="admin-pill">{t.status}</span></td>
                <td>
                  <button type="button" className="btn-secondary admin-icon-button" onClick={() => closeTicket(t.id).catch(e => setError(e.message))}>
                    <CheckCircle size={16} weight="bold" aria-hidden="true" />
                    Resolver
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="6">Nenhum ticket.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
