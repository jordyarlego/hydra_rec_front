export function ConfidenceBadge({ consensus }) {
  const confidence = consensus?.confidence || consensus?.confianca || 'BAIXA'
  const sources = consensus?.sources_count ?? consensus?.sourcesCount ?? 0

  return (
    <div className={`confidence-badge confidence-${confidence.toLowerCase()}`}>
      <span>{confidence}</span>
      <small>{sources} fontes</small>
    </div>
  )
}
