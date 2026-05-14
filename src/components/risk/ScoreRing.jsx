export function ScoreRing({ risk }) {
  if (!risk) return null

  const score = Number(risk.score ?? 0)
  const clamped = Math.max(0, Math.min(100, score))

  return (
    <div
      className={`score-ring risk-${risk.nivel?.toLowerCase()}`}
      style={{ '--score': `${clamped * 3.6}deg` }}
      aria-label={`Hydra Score ${score} de 100, risco ${risk.nivel}`}
    >
      <span className="ring-number">{score}</span>
      <small className="ring-label">{risk.nivel}</small>
    </div>
  )
}
