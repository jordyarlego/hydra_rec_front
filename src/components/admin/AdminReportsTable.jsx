import { useEffect, useState } from 'react'
import { CATEGORY_BY_ID, CATEGORIES } from '../../data/report_categories.js'
import { priorityLabel, statusLabel, STATUS_OPTIONS } from './adminLabels.js'
import { ArrowClockwise, CaretLeft, CaretRight, MagnifyingGlass } from '@phosphor-icons/react'

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` }
}

function shortId(id = '') {
  return id.slice(0, 8)
}

export function AdminReportsTable({ token, onSelect }) {
  const [rows, setRows] = useState([])
  const [filters, setFilters] = useState({ status: 'pending', tipo: '', q: '' })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const pageSize = 20

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      params.set('limit', String(pageSize))
      params.set('offset', String(page * pageSize))
      const res = await fetch(`/api/admin/reports?${params}`, { headers: authHeaders(token) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRows(data.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }

  const summary = rows.reduce((acc, row) => {
    const priority = row.priority_result?.priority || 'baixa'
    acc[priority] = (acc[priority] || 0) + 1
    return acc
  }, {})

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h1>Fila de triagem</h1>
          <p>Reports priorizados por IA, validação comunitária e cruzamento urbano.</p>
        </div>
        <button type="button" className="btn-secondary admin-icon-button" onClick={load}>
          <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      <div className="admin-priority-strip" aria-label="Resumo da página atual">
        <span><strong>{summary.urgente || 0}</strong> urgentes</span>
        <span><strong>{summary.alta || 0}</strong> alta prioridade</span>
        <span><strong>{summary.media || 0}</strong> médias</span>
        <span><strong>{summary.baixa || 0}</strong> baixas</span>
      </div>

      <div className="admin-filters">
        <label className="admin-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input placeholder="Buscar descrição" value={filters.q} onChange={e => updateFilter('q', e.target.value)} />
        </label>
        <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select value={filters.tipo} onChange={e => updateFilter('tipo', e.target.value)}>
          <option value="">Todos tipos</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button type="button" className="btn-primary" onClick={load}>Aplicar</button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="admin-queue">
        {loading ? (
          <p className="admin-empty">Carregando fila...</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">Nenhum report neste filtro.</p>
        ) : rows.map(row => {
          const cat = CATEGORY_BY_ID[row.type] || CATEGORY_BY_ID.outro
          const priority = row.priority_result || { priority: 'baixa', score: 0, reasons: [] }
          return (
            <button key={row.id} type="button" className="admin-report-card" onClick={() => onSelect(row.id)}>
              <img src={cat.icon} alt="" aria-hidden="true" />
              <span className="admin-report-main">
                <strong>{cat.label}</strong>
                <small>{row.bairro || 'Bairro não identificado'} · {row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : 'sem data'}</small>
                {row.description && <em>{row.description}</em>}
              </span>
              <span className="admin-report-meta">
                <span className={`admin-priority priority-${priority.priority}`}>{priorityLabel(priority.priority)} · {priority.score}</span>
                <span className={`admin-pill status-${row.status || 'pending'}`}>{statusLabel(row.status)}</span>
                <span className="admin-mono">IA {row.ai_validation_score != null ? `${Math.round(row.ai_validation_score * 100)}%` : '-'}</span>
                <span className="admin-mono">#{shortId(row.id)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="admin-pagination">
        <button type="button" className="btn-secondary" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
          <CaretLeft size={15} weight="bold" aria-hidden="true" />
          Anterior
        </button>
        <span>Página {page + 1} · {rows.length} itens</span>
        <button type="button" className="btn-secondary" disabled={rows.length < pageSize} onClick={() => setPage(p => p + 1)}>
          Próxima
          <CaretRight size={15} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
