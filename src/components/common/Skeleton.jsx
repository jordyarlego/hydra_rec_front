export function Skeleton({ label = 'Carregando', className = '' }) {
  return (
    <div className={`skeleton ${className}`.trim()} aria-busy="true">
      <span>{label}</span>
    </div>
  )
}
