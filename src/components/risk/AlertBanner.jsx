export function AlertBanner({ risk, bairro }) {
  if (!risk) return null

  const level = risk.nivel || 'SEGURO'
  const isActionable = ['MODERADO', 'ALTO', 'SEVERO'].includes(level)
  const message = isActionable
    ? `Atenção em ${bairro}: revise seu trajeto e evite áreas de baixa altitude.`
    : `${bairro} sem alerta crítico agora. Monitore mudanças de chuva e maré.`

  return (
    <section className={`alert-banner risk-${level.toLowerCase()}`} aria-live="polite">
      <span className="alert-label">{level}</span>
      <span className="alert-msg">{message}</span>
    </section>
  )
}
