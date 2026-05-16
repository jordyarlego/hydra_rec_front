import { useState } from 'react'
import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   NearbyReportsList — ocorrências próximas, compacto.
   Mostra 3 por padrão + "ver mais" pra abrir o resto.
   ════════════════════════════════════════════════════ */

const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }
const TYPE_LABEL = {
  alagamento:        'Alagamento',
  deslizamento:      'Deslizamento',
  queda_arvore:      'Árvore caída',
  via_intransitavel: 'Via interditada',
  poste_caido:       'Poste caído',
  buraco:            'Buraco na via',
  lixo:              'Acúmulo de lixo',
  iluminacao:        'Sem iluminação',
  outro:             'Outro',
}

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (diff < 1)  return 'agora'
  if (diff < 60) return `${diff} min`
  if (diff < 1440) return `${Math.floor(diff / 60)} h`
  return `${Math.floor(diff / 1440)} d`
}

const VISIBLE_DEFAULT = 3

export function NearbyReportsList({ reports, onConfirm }) {
  const [showAll, setShowAll] = useState(false)

  if (!reports?.length) {
    return <p className="reports-empty">Nenhuma ocorrência registrada por aqui nas últimas 24h.</p>
  }

  const visible = showAll ? reports : reports.slice(0, VISIBLE_DEFAULT)
  const hidden = Math.max(0, reports.length - VISIBLE_DEFAULT)

  return (
    <div className="reports-block">
      <ul className="reports-list" aria-label="Reports próximos">
        {visible.map(r => (
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
              {r.confirmed_count > 0 && (
                <span className="report-confirms">{r.confirmed_count} confirmações</span>
              )}
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

      {hidden > 0 && (
        <button
          type="button"
          className="reports-toggle"
          onClick={() => { soundMgr.playClick(); setShowAll(v => !v) }}
        >
          {showAll ? 'Mostrar menos' : `Ver mais ${hidden}`}
        </button>
      )}
    </div>
  )
}
