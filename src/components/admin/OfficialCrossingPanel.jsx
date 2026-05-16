import { useState, useEffect } from 'react'

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

export default function OfficialCrossingPanel({ reportId, token }) {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!reportId) return
    setLoading(true)
    setError(null)
    fetch(`/api/admin/reports/${reportId}/official-crossing`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(setData)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [reportId, token])

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

  return (
    <section className="ocp-panel">
      <h4 className="ocp-heading">Cruzamento urbano</h4>

      <div className="ocp-geo-row">
        {data.neighborhood && <span className="ocp-chip">{data.neighborhood}</span>}
        {data.rpa           && <span className="ocp-chip ocp-chip--rpa">{data.rpa}</span>}
        {data.microregion   && <span className="ocp-chip ocp-chip--micro">{data.microregion}</span>}
      </div>

      {data.nearest_road_name && (
        <p className="ocp-row">
          <span className="ocp-label">Via mais próxima</span>
          <span className="ocp-value">{data.nearest_road_name}</span>
        </p>
      )}

      {data.nearest_official_request_type && (
        <p className="ocp-row">
        <span className="ocp-label">Registro oficial próximo</span>
          <span className="ocp-value">
            {data.nearest_official_request_type}
            {data.nearest_official_request_distance_m != null && (
              <span className="ocp-dist"> ({data.nearest_official_request_distance_m}m)</span>
            )}
          </span>
        </p>
      )}

      <p className="ocp-row">
        <span className="ocp-label">Recorrência na área</span>
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
        <p className="ocp-notes">{data.notes}</p>
      )}
    </section>
  )
}
