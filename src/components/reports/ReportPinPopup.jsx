import { useState } from 'react'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'
import { X, ThumbsUp, ThumbsDown } from '@phosphor-icons/react'

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

/* ReportPinPopup v3 — photo-first */
export function ReportPinPopup({ report, onClose, onVote }) {
  const [vote, setVote] = useState(null)
  if (!report) return null
  const cat = CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro
  const aiScore = report.ai_validation_score ?? report.ai_score ?? 0.6
  const aiTone = aiScore >= 0.75 ? 'alta' : aiScore >= 0.5 ? 'coerente' : aiScore >= 0.2 ? 'inconclusivo' : 'suspeito'
  const aiLabel = aiScore >= 0.75 ? 'Confirmado'
                : aiScore >= 0.5 ? 'Provavelmente real'
                : aiScore >= 0.2 ? 'Pouca evidência'
                : 'Suspeito'

  const handleVote = (kind) => {
    setVote(v => v === kind ? null : kind)
    onVote?.(report.id, kind)
  }

  return (
    <div className="pin-popup-card">
      {report.photo_url && (
        <div className="pin-popup-photo" style={{ backgroundImage: `url(${report.photo_url})` }}>
          <div className="pin-popup-photo-overlay">
            <span className={`verdict-pill verdict-${aiTone}`} style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', color: 'white' }}>
              <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }}/>
              {aiLabel} · {Math.round(aiScore * 100)}%
            </span>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar" style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(8px)', color: 'white' }}>
              <X size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}
      <div className="pin-popup-body">
        <div className="pin-popup-title">
          <img src={cat.icon} alt="" />
          <div>
            <h3>{cat.label}</h3>
            <div className="pin-popup-meta">{report.bairro} · {timeAgo(report.created_at)}</div>
          </div>
        </div>
        {report.description && <div className="pin-popup-desc">{report.description}</div>}
        <div className="pin-popup-votes">
          <button
            type="button"
            className={`pin-popup-vote-btn up ${vote === 'up' ? 'active' : ''}`}
            onClick={() => handleVote('up')}
          >
            <ThumbsUp size={14} weight="bold" />
            <span>Confirmo</span>
            <strong>{(report.likes_up ?? 0) + (vote === 'up' ? 1 : 0)}</strong>
          </button>
          <button
            type="button"
            className={`pin-popup-vote-btn down ${vote === 'down' ? 'active' : ''}`}
            onClick={() => handleVote('down')}
          >
            <ThumbsDown size={14} weight="bold" />
            <span>Discordo</span>
            <strong>{(report.likes_down ?? 0) + (vote === 'down' ? 1 : 0)}</strong>
          </button>
        </div>
      </div>
    </div>
  )
}
