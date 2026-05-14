export function IconBtn({ icon, label, className = '', ...props }) {
  return (
    <button className={`icon-btn ${className}`.trim()} aria-label={label} title={label} {...props}>
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}
