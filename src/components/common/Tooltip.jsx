export function Tooltip({ label, children }) {
  return (
    <span className="tooltip-wrap">
      {children}
      <span className="tooltip-content" role="tooltip">{label}</span>
    </span>
  )
}
