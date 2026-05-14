/* ════════════════════════════════════════════════════
   AlertBanner — banner contextual baseado no nível de risco
   ════════════════════════════════════════════════════ */

const LEVEL = {
  SEGURO:   { label: 'Seguro',   color: '#22c55e' },
  ATENCAO:  { label: 'Atenção',  color: '#eab308' },
  MODERADO: { label: 'Moderado', color: '#f97316' },
  ALTO:     { label: 'Alto',     color: '#ef4444' },
  SEVERO:   { label: 'Severo',   color: '#a855f7' },
}

export function AlertBanner({ risk, bairro }) {
  if (!risk) return null
  const level = risk.nivel || 'SEGURO'
  const isActionable = ['MODERADO', 'ALTO', 'SEVERO'].includes(level)
  const cfg = LEVEL[level] || LEVEL.SEGURO

  const msg = isActionable
    ? `Atenção em ${bairro}: revise seu trajeto e evite áreas de baixa altitude.`
    : `${bairro} sem alerta crítico agora. Monitore mudanças de chuva e maré.`

  return (
    <div
      role="alert"
      className={`alert-banner alert-${level.toLowerCase()}${isActionable ? ' is-actionable' : ''}`}
      style={{
        background: `${cfg.color}1a`,
        border:     `1px solid ${cfg.color}40`,
      }}
    >
      <span
        className="alert-dot"
        style={{ background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` }}
      />
      <span className="alert-level" style={{ color: cfg.color }}>{cfg.label}</span>
      <span className="alert-msg">{msg}</span>
    </div>
  )
}
