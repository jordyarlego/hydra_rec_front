/* ════════════════════════════════════════════════════
   ConfidenceBadge — pill com nível de confiança + fontes
   ════════════════════════════════════════════════════ */

const COLOR = { ALTA: '#22c55e', MEDIA: '#eab308', BAIXA: '#ef4444' }
const LABEL = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' }

export function ConfidenceBadge({ consensus }) {
  const confidence = consensus?.confidence || consensus?.confianca || 'MEDIA'
  const sources    = consensus?.sources_count ?? consensus?.sourcesCount ?? 0
  const c = COLOR[confidence] || '#888'

  return (
    <div
      className={`confidence-badge confidence-${confidence.toLowerCase()}`}
      style={{ background: `${c}1a` }}
    >
      <span className="confidence-dot" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
      <span className="confidence-level" style={{ color: c }}>
        Confiança {LABEL[confidence] || confidence}
      </span>
      <span className="confidence-sources">· {sources} {sources === 1 ? 'fonte' : 'fontes'}</span>
    </div>
  )
}
