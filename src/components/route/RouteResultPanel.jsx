const LEVEL_CLASS = { BAIXO: 'level-baixo', MEDIO: 'level-medio', ALTO: 'level-alto' }
const LEVEL_LABEL = { BAIXO: 'Risco baixo', MEDIO: 'Risco médio', ALTO: 'Risco alto' }
const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }

function HazardItem({ hazard }) {
  const color = SEV_COLOR[hazard.severity] ?? '#facc15'
  return (
    <li className="hazard-item">
      <span className="hazard-dot" style={{ background: color }} />
      <div className="hazard-info">
        <span className="hazard-name">{hazard.name || hazard.description}</span>
        {hazard.type === 'ponto_critico_historico'
          ? <span className="hazard-tag">Histórico</span>
          : <span className="hazard-tag">Reportado {hazard.last_seen_minutes_ago < 999 ? `há ${hazard.last_seen_minutes_ago}min` : ''}</span>
        }
      </div>
    </li>
  )
}

export function RouteResultPanel({ result, error }) {
  if (error) return <p className="route-error" role="alert">{error}</p>
  if (!result) return null

  const { risk_score, risk_level, hazards = [], bairros_atravessados = [] } = result
  const levelClass = LEVEL_CLASS[risk_level] ?? 'level-medio'

  return (
    <div className="route-result" aria-label="Resultado da análise de trajeto">
      <div className={`route-risk-badge ${levelClass}`}>
        <span className="route-risk-score">{risk_score}</span>
        <span className="route-risk-label">{LEVEL_LABEL[risk_level] ?? risk_level}</span>
      </div>

      {bairros_atravessados.length > 0 && (
        <p className="route-bairros">
          Passando por: {bairros_atravessados.join(', ')}
        </p>
      )}

      {hazards.length > 0 ? (
        <div className="hazards-wrap">
          <h3>Ocorrências no trajeto ({hazards.length})</h3>
          <ul className="hazards-list">
            {hazards.map((h, i) => <HazardItem key={i} hazard={h} />)}
          </ul>
        </div>
      ) : (
        <p className="route-clear">Nenhuma ocorrência conhecida neste trajeto.</p>
      )}
    </div>
  )
}
