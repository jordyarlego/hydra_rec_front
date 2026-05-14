export function LegendChip({ color, label, range }) {
  return (
    <div className="legend-chip">
      <span className="legend-dot" style={{ background: color }} aria-hidden="true" />
      <span>{label}</span>
      {range && <small>{range}</small>}
    </div>
  )
}
