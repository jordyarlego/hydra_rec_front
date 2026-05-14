export function Chip({ tone = 'neutral', label, value }) {
  return (
    <div className={`chip chip-${tone}`}>
      <span className="chip-label">{label}</span>
      {value !== undefined && <strong className="chip-value">{value}</strong>}
    </div>
  )
}
