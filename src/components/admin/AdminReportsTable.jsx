import { useEffect, useState, useCallback } from 'react'
import { CATEGORY_BY_ID, CATEGORIES } from '../../data/report_categories.js'
import { priorityLabel } from './adminLabels.js'
import { ArrowClockwise, CaretLeft, CaretRight, MagnifyingGlass, Funnel } from '@phosphor-icons/react'
import { adminFetchJson } from '../../lib/adminFetch.js'
import { BatchApproveCard } from './BatchApproveCard.jsx'

function shortId(id = '') {
  return id.slice(0, 8)
}

const BUCKET_META = {
  revisar:       { label: 'Precisa de você', tone: 'warn',    description: 'Reports na zona cinzenta da IA.' },
  filtrado:      { label: 'Filtrados pela IA', tone: 'danger', description: 'Provável foto inválida ou não-urbana.' },
  auto_validado: { label: 'Auto-validados', tone: 'success',  description: 'IA viu coerência alta. Aprove em lote.' },
  sem_bucket:    { label: 'Sem classificação', tone: 'muted', description: 'Reports antigos (pré-IA v2).' },
}

function scoreLabel(score) {
  if (score == null) return { label: '-', cls: 'verdict-na' }
  const pct = Math.round(score * 100)
  if (score < 0.20) return { label: `Suspeito ${pct}%`,        cls: 'verdict-suspeito' }
  if (score < 0.50) return { label: `Inconclusivo ${pct}%`,    cls: 'verdict-inconclusivo' }
  if (score < 0.75) return { label: `Coerente ${pct}%`,        cls: 'verdict-coerente' }
  return                  { label: `Alta confiança ${pct}%`,   cls: 'verdict-alta' }
}

export function AdminReportsTable({ onSelect, selectedId }) {
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({ filtrado: 0, revisar: 0, auto_validado: 0, sem_bucket: 0 })
  const [activeBucket, setActiveBucket] = useState('revisar')
  const [filters, setFilters] = useState({ tipo: '', q: '' })
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const pageSize = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (activeBucket) params.set('bucket', activeBucket)
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
      params.set('limit', String(pageSize))
      params.set('offset', String(page * pageSize))
      const data = await adminFetchJson(`/api/admin/reports?${params}`)
      setRows(data.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeBucket, filters, page])

  const loadCounts = useCallback(async () => {
    try {
      const c = await adminFetchJson('/api/admin/reports/counts-by-bucket')
      setCounts(c)
    } catch {
      // ignora; cards mostram 0 se falhar
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCounts() }, [loadCounts, rows])

  function pickBucket(b) {
    setActiveBucket(b)
    setPage(0)
  }

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(0)
  }

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h1>Fila de triagem</h1>
          <p>A IA pré-classifica cada report em 3 buckets. Você decide o que fazer com cada um.</p>
        </div>
        <button type="button" className="btn-secondary admin-icon-button admin-compact-action" onClick={() => { load(); loadCounts() }}>
          <ArrowClockwise size={16} weight="bold" aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {/* 3 cards-bucket no topo */}
      <div className="bucket-cards" role="tablist">
        {['revisar', 'filtrado', 'auto_validado'].map(key => {
          const meta = BUCKET_META[key]
          const active = activeBucket === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              className={`bucket-card bucket-${meta.tone} ${active ? 'is-active' : ''}`}
              onClick={() => pickBucket(key)}
            >
              <strong>{counts[key] || 0}</strong>
              <span>{meta.label}</span>
              <small>{meta.description}</small>
            </button>
          )
        })}
      </div>

      {/* Card de aprovação em lote — só visível quando bucket auto_validado */}
      {activeBucket === 'auto_validado' && rows.length > 0 && (
        <BatchApproveCard
          reports={rows}
          onApproved={() => { load(); loadCounts() }}
        />
      )}

      <div className="admin-filters">
        <label className="admin-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input placeholder="Buscar descrição" value={filters.q} onChange={e => updateFilter('q', e.target.value)} />
        </label>
        <select value={filters.tipo} onChange={e => updateFilter('tipo', e.target.value)} aria-label="Filtrar tipo">
          <option value="">Todos os tipos</option>
          {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <button type="button" className="btn-primary admin-compact-action" onClick={load}>
          <Funnel size={14} weight="bold" aria-hidden="true" />
          Aplicar
        </button>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="admin-queue">
        {loading ? (
          <p className="admin-empty">Carregando fila...</p>
        ) : rows.length === 0 ? (
          <p className="admin-empty">Nada neste bucket no momento.</p>
        ) : rows.map(row => {
          const cat = CATEGORY_BY_ID[row.type] || CATEGORY_BY_ID.outro
          const priority = row.priority_result || { priority: 'baixa', score: 0, reasons: [] }
          const verdict = scoreLabel(row.ai_validation_score)
          const isSelected = selectedId === row.id
          return (
            <button
              key={row.id}
              type="button"
              className={`admin-report-card ${isSelected ? 'is-selected' : ''}`}
              onClick={() => onSelect(row.id)}
              aria-pressed={isSelected}
            >
              <img src={cat.icon} alt="" aria-hidden="true" />
              <span className="admin-report-main">
                <strong>{cat.label}</strong>
                <small>{row.bairro || 'Bairro não identificado'} · {row.created_at ? new Date(row.created_at).toLocaleString('pt-BR') : 'sem data'}</small>
                {row.description && <em>{row.description}</em>}
              </span>
              <span className="admin-report-meta">
                <span className={`admin-priority priority-${priority.priority}`}>{priorityLabel(priority.priority)} · {priority.score}</span>
                <span className={`verdict-pill ${verdict.cls}`}>{verdict.label}</span>
                <span className="admin-mono">#{shortId(row.id)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="admin-pagination">
        <button type="button" className="btn-secondary admin-compact-action" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>
          <CaretLeft size={15} weight="bold" aria-hidden="true" />
          Anterior
        </button>
        <span>Página {page + 1} · {rows.length} itens</span>
        <button type="button" className="btn-secondary admin-compact-action" disabled={rows.length < pageSize} onClick={() => setPage(p => p + 1)}>
          Próxima
          <CaretRight size={15} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
