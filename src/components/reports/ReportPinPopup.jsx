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

const SEV_BG = {
  leve:     'linear-gradient(160deg, rgba(58,214,130,.30), rgba(58,214,130,.05))',
  moderado: 'linear-gradient(160deg, rgba(251,146,60,.30), rgba(251,146,60,.05))',
  grave:    'linear-gradient(160deg, rgba(248,113,113,.30), rgba(248,113,113,.05))',
}
const SEV_LABEL = {
  leve:     { label: 'Leve',     color: 'var(--risk-seguro)'    },
  moderado: { label: 'Moderado', color: 'var(--risk-moderado)'  },
  grave:    { label: 'Grave',    color: 'var(--risk-alto)'      },
}

/* ReportPinPopup — ÍCONE DA CATEGORIA é o hero, foto enviada é opcional. */
export function ReportPinPopup({ report, onClose, onVote }) {
  const [vote, setVote] = useState(null)
  if (!report) return null
  const cat = CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro
  const sev = SEV_LABEL[report.severity] || { label: '—', color: 'var(--text-3)' }
  const sevBg = SEV_BG[report.severity] || 'linear-gradient(160deg, rgba(120,140,180,.25), rgba(120,140,180,.05))'

  const aiScore = report.ai_validation_score ?? report.ai_score ?? null
  const aiTone = aiScore == null ? 'na'
              : aiScore >= 0.75 ? 'alta'
              : aiScore >= 0.5 ? 'coerente'
              : aiScore >= 0.2 ? 'inconclusivo'
              : 'suspeito'
  const aiLabel = aiScore == null ? null
               : aiScore >= 0.75 ? 'Confirmado'
               : aiScore >= 0.5 ? 'Provavelmente real'
               : aiScore >= 0.2 ? 'Pouca evidência'
               : 'Suspeito'

  const handleVote = (kind) => {
    setVote(v => v === kind ? null : kind)
    onVote?.(report.id, kind)
  }

  return (
    <div className="pin-popup-overlay" role="dialog" aria-label={cat.label} onClick={e => {
      if (e.target === e.currentTarget) onClose?.()
    }}>
      <div className="pin-popup-card">
        {/* HERO: ícone da categoria grande + cor da severidade */}
        <div className="pin-popup-hero" style={{ background: sevBg }}>
          <button type="button" className="pin-popup-close" onClick={onClose} aria-label="Fechar">
            <X size={14} weight="bold" />
          </button>
          <div className="pin-popup-hero-icon">
            <img src={cat.icon} alt={cat.label} />
          </div>
          <div className="pin-popup-hero-meta">
            <span className="pin-popup-sev-pill" style={{ color: sev.color, borderColor: sev.color }}>
              {sev.label}
            </span>
            {aiLabel && (
              <span className={`verdict-pill verdict-${aiTone}`}>
                {aiLabel}{aiScore != null && ` · ${Math.round(aiScore * 100)}%`}
              </span>
            )}
          </div>
        </div>

        {/* CORPO */}
        <div className="pin-popup-body">
          <h3 className="pin-popup-title-h3">{cat.label}</h3>
          <div className="pin-popup-meta">{report.bairro || 'Bairro não identificado'} · {timeAgo(report.created_at)}</div>
          {report.description && <p className="pin-popup-desc">{report.description}</p>}

          {/* Foto enviada pelo cidadão — preview menor, opcional */}
          {report.photo_url && (
            <div className="pin-popup-userphoto">
              <small>📷 Foto enviada</small>
              <img src={report.photo_url} alt="Foto do report" />
            </div>
          )}

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
    </div>
  )
}
