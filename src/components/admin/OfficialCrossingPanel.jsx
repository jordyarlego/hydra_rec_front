import { useState, useEffect } from 'react'
import { adminFetchJson } from '../../lib/adminFetch.js'

const PRIORITY_COLORS = {
  urgente: 'var(--risk-severo)',
  alta:    'var(--risk-alto)',
  media:   'var(--risk-atencao)',
  baixa:   'var(--risk-seguro)',
}

const PRIORITY_LABELS = {
  urgente: 'URGENTE',
  alta: 'ALTA',
  media: 'MÉDIA',
  baixa: 'BAIXA',
}

function PriorityBadge({ priority, score }) {
  const color = PRIORITY_COLORS[priority] || 'var(--risk-atencao)'
  return (
    <span
      className="ocp-priority-badge"
      style={{ background: color }}
      title={`Score: ${score}/100`}
    >
      {PRIORITY_LABELS[priority] || priority?.toUpperCase()} · {score}
    </span>
  )
}

export default function OfficialCrossingPanel({ reportId }) {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!reportId) return
    setLoading(true)
    setError(null)
    adminFetchJson(`/api/admin/reports/${reportId}/official-crossing`)
      .then(setData)
      .catch(e => setError(e.message || String(e)))
      .finally(() => setLoading(false))
  }, [reportId])

  if (!reportId) return null
  if (loading) return <p className="ocp-loading">Carregando cruzamento oficial…</p>
  if (error)   return <p className="form-error" role="alert">Cruzamento oficial indisponível: {error}</p>
  if (!data || data.available === false) {
    return (
      <section className="ocp-panel ocp-panel-empty">
        <h4 className="ocp-heading">Cruzamento urbano</h4>
        <p className="ocp-empty">
          {data?.reason || 'Ainda não há base oficial suficiente para cruzar este report.'}
        </p>
      </section>
    )
  }

  const pr = data.priority_result
  const sourceNames = {
    seed_mvp: 'amostra seed',
    emlurb_156: 'EMLURB 156',
    defesa_civil: 'Defesa Civil',
  }
  const sources = (data.official_sources || []).map(s => sourceNames[s] || s).join(', ')

  return (
    <section className="ocp-panel">
      <h4 className="ocp-heading">Localização e histórico</h4>
      <p className="ocp-summary">Cruzamento com a base de dados oficial.</p>
      <p className="ocp-data-note">
        Base atual: {data.official_request_count ?? '—'} registro(s)
        {sources ? ` · ${sources}` : ''}.
      </p>

      <div className="ocp-geo-row">
        {data.neighborhood && <span className="ocp-chip">{data.neighborhood}</span>}
        {data.rpa           && <span className="ocp-chip ocp-chip--rpa" title="Região Político-Administrativa do Recife">{data.rpa}</span>}
      </div>

      {data.nearest_road_name && (
        <p className="ocp-row">
          <span className="ocp-label">Rua mais próxima</span>
          <span className="ocp-value">{data.nearest_road_name}</span>
        </p>
      )}

      {data.nearest_official_request_type && (
        <p className="ocp-row">
        <span className="ocp-label">Já houve chamado oficial parecido</span>
          <span className="ocp-value">
            {data.nearest_official_request_type}
            {data.nearest_official_request_distance_m != null && (
              <span className="ocp-dist"> (a {data.nearest_official_request_distance_m}m)</span>
            )}
          </span>
        </p>
      )}

      <p className="ocp-row">
        <span className="ocp-label" title="Quantas vezes problemas parecidos foram reportados na mesma região recentemente">Repetição na área</span>
        <span className="ocp-value ocp-mono">{data.recurrence_score ?? 0}</span>
      </p>

      {pr && (
        <div className="ocp-priority-section">
          <span className="ocp-label">Prioridade sugerida pela IA</span>
          <PriorityBadge priority={pr.priority} score={pr.score} />
          {pr.reasons?.length > 0 && (
            <ul className="ocp-reasons">
              {pr.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      {data.notes && (
        <p className="ocp-notes">
          {(() => {
            let txt = data.notes
              .replace('chamado(s) oficial(is) similar(es)', 'registro(s) parecido(s)')
            // Reformula "0 registro(s) parecido(s) em Xm" pra deixar claro que zero é bom sinal
            const match = txt.match(/^0\s+registro\(s\)\s+parecido\(s\)\s+em\s+(\d+)m/i)
            if (match) {
              return `Nenhum registro parecido a ${match[1]}m na base carregada. Pode existir fora da amostra/importação atual.`
            }
            return txt
          })()}
        </p>
      )}
    </section>
  )
}
