const LABEL  = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' }
const TEXT   = { ALTA: '#22c55e', MEDIA: '#e8a030', BAIXA: 'rgba(255,255,255,.45)' }
const BG     = { ALTA: 'rgba(34,197,94,.08)', MEDIA: 'rgba(234,179,8,.07)', BAIXA: 'rgba(255,255,255,.04)' }
const BORDER = { ALTA: 'rgba(34,197,94,.20)', MEDIA: 'rgba(234,179,8,.16)', BAIXA: 'rgba(255,255,255,.08)' }

export function ConfidenceBadge({ consensus }) {
  const confidence   = consensus?.confidence || consensus?.confianca || 'MEDIA'
  const sources      = consensus?.sources_count ?? consensus?.sourcesCount ?? 0
  const failed       = consensus?.sources_failed || []
  const color        = TEXT[confidence]   || TEXT.MEDIA
  const bg           = BG[confidence]     || BG.MEDIA
  const borderColor  = BORDER[confidence] || BORDER.MEDIA

  const failedNames = failed.map(f => f.source).join(', ')

  return (
    <div
      className={`confidence-badge confidence-${confidence.toLowerCase()}`}
      style={{ background: bg, borderColor }}
      aria-label={`${sources} fontes ativas · Confiança ${LABEL[confidence] || confidence}${failed.length ? ` · ${failedNames} offline` : ''}`}
      title={failed.length ? `Fontes offline: ${failed.map(f => `${f.source} (${f.reason})`).join(' · ')}` : undefined}
    >
      <span className="confidence-level" style={{ color }}>
        {sources} {sources === 1 ? 'fonte' : 'fontes'} · {LABEL[confidence] || confidence}
      </span>
      {failed.length > 0 && (
        <span className="confidence-offline">
          {failedNames} offline
        </span>
      )}
    </div>
  )
}
