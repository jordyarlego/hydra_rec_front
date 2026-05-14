const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }
const TYPE_LABEL = { alagamento:'Alagamento', deslizamento:'Deslizamento', queda_arvore:'Queda de árvore',
  via_intransitavel:'Via intransitável', poste_caido:'Poste caído', outro:'Outro' }

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `${diff}min`
  return `${Math.floor(diff/60)}h`
}

export function NearbyReportsList({ reports, onConfirm }) {
  if (!reports?.length) return <p className="reports-empty">Nenhum report nas últimas 24h nesta área.</p>
  return (
    <ul className="reports-list" aria-label="Reports próximos">
      {reports.map(r => (
        <li key={r.id} className="report-item">
          <span className="report-dot" style={{ background: SEV_COLOR[r.severity] || '#888' }} />
          <div className="report-info">
            <span className="report-type">{TYPE_LABEL[r.type] || r.type}</span>
            {r.description && <span className="report-desc">{r.description}</span>}
            <span className="report-meta">{timeAgo(r.created_at)} · {r.confirmed_count} confirmações</span>
          </div>
          {onConfirm && (
            <button onClick={() => onConfirm(r.id)} className="btn-confirm" aria-label="Confirmar report">+1</button>
          )}
        </li>
      ))}
    </ul>
  )
}
