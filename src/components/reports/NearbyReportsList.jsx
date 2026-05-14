import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   NearbyReportsList — ocorrências próximas
   ════════════════════════════════════════════════════ */

const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }
const TYPE_LABEL = {
  alagamento:        'Alagamento',
  deslizamento:      'Deslizamento',
  queda_arvore:      'Queda de árvore',
  via_intransitavel: 'Via intransitável',
  poste_caido:       'Poste caído',
  outro:             'Outro',
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diff < 1)  return 'agora'
  if (diff < 60) return `${diff}min`
  return `${Math.floor(diff / 60)}h`
}

export function NearbyReportsList({ reports, onConfirm }) {
  if (!reports?.length) {
    return <p className="reports-empty">Nenhum report nas últimas 24h nesta área.</p>
  }
  return (
    <ul className="reports-list" aria-label="Reports próximos">
      {reports.map(r => (
        <li key={r.id} className="report-item">
          <span
            className="report-dot"
            style={{
              background: SEV_COLOR[r.severity] || '#888',
              boxShadow: `0 0 8px ${SEV_COLOR[r.severity] || '#888'}55`,
            }}
          />
          <div className="report-info">
            <div className="report-info-top">
              <span className="report-type">{TYPE_LABEL[r.type] || r.type}</span>
              <span className="report-time">{timeAgo(r.created_at)}</span>
            </div>
            {r.description && <p className="report-desc">{r.description}</p>}
            <span className="report-confirms">{r.confirmed_count} confirmações</span>
          </div>
          {onConfirm && (
            <button
              type="button"
              onClick={() => { soundMgr.playClick(); onConfirm(r.id) }}
              className="report-confirm-btn"
              aria-label="Confirmar report"
            >
              +1
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
