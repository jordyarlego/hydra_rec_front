import { useEffect, useState, useCallback } from 'react'
import { CATEGORY_BY_ID, CATEGORIES } from '../../data/report_categories.js'
import { priorityLabel } from './adminLabels.js'
import { ArrowClockwise, MagnifyingGlass, Funnel, ArrowRight } from '@phosphor-icons/react'
import { adminFetchJson } from '../../lib/adminFetch.js'
import { BatchApproveCard } from './BatchApproveCard.jsx'

/* ════════════════════════════════════════════════════
   AdminReportsTable v3 — buckets visuais melhores +
   row cards (não tabela) + verdict pill + priority pill.
   Mesma API HTTP — só visual e estrutura mudou.
   ════════════════════════════════════════════════════ */

const BUCKETS = [
  { id: 'revisar',       tone: 'warn',    label: 'Pra você decidir',     description: 'A IA achou coerente, mas pediu um humano pra confirmar.' },
  { id: 'filtrado',      tone: 'danger',  label: 'Filtrados pela IA',     description: 'Foto não parece um problema urbano real. Confirme em lote.' },
  { id: 'auto_validado', tone: 'success', label: 'Prontos pra chamado',  description: 'A IA viu evidência forte. Aprove tudo de uma vez.' },
]

function shortId(id = '') { return id.slice(0, 8) }
function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function aiVerdict(score) {
  if (score == null) return { label: '—', cls: 'verdict-na' }
  const pct = Math.round(score * 100)
  if (score < 0.20) return { label: `Suspeito · ${pct}%`,        cls: 'verdict-suspeito' }
  if (score < 0.50) return { label: `Inconclusivo · ${pct}%`,    cls: 'verdict-inconclusivo' }
  if (score < 0.75) return { label: `Coerente · ${pct}%`,        cls: 'verdict-coerente' }
  return                  { label: `Alta confiança · ${pct}%`,   cls: 'verdict-alta' }
}

export function AdminReportsTable({ onSelect, selectedId }) {
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({ filtrado: 0, revisar: 0, auto_validado: 0 })
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
      params.set('bucket', activeBucket)
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
    } catch { /* silently fail */ }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadCounts() }, [loadCounts, rows])

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1>Triagem de reports</h1>
          <p>A IA olha cada report enviado e separa em 3 montes. Você decide o que fazer com cada um.</p>
        </div>
        <button type="button" className="btn" onClick={() => { load(); loadCounts() }}>
          <ArrowClockwise size={14} weight="bold" />
          Atualizar
        </button>
      </header>

      <main className="admin-main">
        <div className="bucket-grid" role="tablist">
          {BUCKETS.map(b => {
            const active = activeBucket === b.id
            return (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`bucket-card ${active ? 'active' : ''}`}
                data-tone={b.tone}
                onClick={() => { setActiveBucket(b.id); setPage(0) }}
              >
                <strong>{counts[b.id] || 0}</strong>
                <span className="bucket-label">{b.label}</span>
                <span className="bucket-desc">{b.description}</span>
              </button>
            )
          })}
        </div>

        {activeBucket === 'auto_validado' && rows.length > 0 && (
          <BatchApproveCard
            reports={rows}
            onApproved={() => { load(); loadCounts() }}
          />
        )}

        <div className="admin-filters">
          <div className="admin-search-input">
            <MagnifyingGlass size={14} />
            <input
              placeholder="Buscar descrição"
              value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            />
          </div>
          <select
            className="admin-search-input"
            style={{ flex: 0, paddingRight: 12 }}
            aria-label="Filtrar tipo"
            value={filters.tipo}
            onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}
          >
            <option value="">Todos os tipos</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button type="button" className="btn btn-primary" onClick={load}>
            <Funnel size={13} weight="bold" /> Aplicar
          </button>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="admin-list" aria-busy={loading}>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>Carregando fila…</div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>Nada neste bucket no momento.</div>
          ) : rows.map(r => {
            const cat = CATEGORY_BY_ID[r.type] || CATEGORY_BY_ID.outro
            const verdict = aiVerdict(r.ai_validation_score)
            const priority = r.priority_result || { priority: 'baixa', score: 0 }
            const sel = selectedId === r.id
            return (
              <button
                key={r.id}
                type="button"
                className={`admin-row ${sel ? 'active' : ''}`}
                onClick={() => onSelect(r.id)}
                aria-pressed={sel}
              >
                <img src={cat.icon} alt="" aria-hidden="true" />
                <div className="admin-row-main">
                  <strong>{cat.label}</strong>
                  <small>{r.bairro || 'Bairro não identificado'} · {timeAgo(r.created_at)}</small>
                  {r.description && <em>{r.description}</em>}
                </div>
                <div className="admin-row-meta">
                  <span className={`priority-pill ${priority.priority}`}>{priorityLabel(priority.priority)} · {priority.score}</span>
                  <span className={`verdict-pill ${verdict.cls}`}>{verdict.label}</span>
                </div>
                <ArrowRight size={14} style={{ color: 'var(--text-4)' }} />
              </button>
            )
          })}
        </div>
      </main>
    </>
  )
}
