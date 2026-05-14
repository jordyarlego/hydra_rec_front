import { useState, useEffect } from 'react'
import { BAIRROS } from '../../data/bairros.js'
import { useRoute } from '../../hooks/useRoute.js'
import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   RouteAnalysis — fusão de RouteInput + RouteResultPanel
   Usa o hook useRoute existente
   ════════════════════════════════════════════════════ */

const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }
const LEVEL = {
  BAIXO: { label: 'Risco baixo', color: '#22c55e' },
  MEDIO: { label: 'Risco médio', color: '#f97316' },
  ALTO:  { label: 'Risco alto',  color: '#ef4444' },
}

export function RouteAnalysis({ currentBairro }) {
  const [origin, setOrigin] = useState(currentBairro || BAIRROS[0])
  const [dest, setDest]     = useState('')
  const { result, loading, error, analyze } = useRoute()

  useEffect(() => { setOrigin(currentBairro || BAIRROS[0]) }, [currentBairro])

  function handleSubmit(e) {
    e.preventDefault()
    if (!dest) return
    soundMgr.playClick()
    analyze({ originBairro: origin, destBairro: dest })
  }

  return (
    <form className="route-analysis" onSubmit={handleSubmit} aria-label="Análise de trajeto">
      <div className="route-fields">
        <label className="route-field">
          <span className="route-label">Origem</span>
          <select value={origin} onChange={e => setOrigin(e.target.value)}>
            {BAIRROS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <span className="route-arrow" aria-hidden="true">→</span>
        <label className="route-field">
          <span className="route-label">Destino</span>
          <select value={dest} onChange={e => setDest(e.target.value)}>
            <option value="">Selecione</option>
            {BAIRROS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="route-submit"
        disabled={!dest || loading}
        data-state={loading ? 'loading' : dest ? 'ready' : 'disabled'}
      >
        {loading ? 'Analisando...' : 'Analisar rota'}
      </button>

      {error && <p className="route-error" role="alert">{error}</p>}

      {result && !error && (
        <div className="route-result" aria-label="Resultado da análise de trajeto">
          <div
            className={`route-risk-badge level-${result.risk_level?.toLowerCase()}`}
            style={{
              background: `${(LEVEL[result.risk_level]?.color || '#888')}1a`,
              border: `1px solid ${(LEVEL[result.risk_level]?.color || '#888')}40`,
            }}
          >
            <div className="route-risk-left">
              <div className="route-risk-mini-label">Score do trajeto</div>
              <div
                className="route-risk-score"
                style={{ color: LEVEL[result.risk_level]?.color }}
              >
                {result.risk_score}<small>/100</small>
              </div>
            </div>
            <span
              className="route-risk-tag"
              style={{ color: LEVEL[result.risk_level]?.color }}
            >
              {LEVEL[result.risk_level]?.label || result.risk_level}
            </span>
          </div>

          {result.bairros_atravessados?.length > 0 && (
            <p className="route-bairros">
              <span className="route-bairros-label">Passa por:</span>{' '}
              {result.bairros_atravessados.join(' · ')}
            </p>
          )}

          {result.hazards?.length > 0 ? (
            <div className="hazards-wrap">
              <div className="hazards-title">
                Ocorrências no trajeto ({result.hazards.length})
              </div>
              <ul className="hazards-list">
                {result.hazards.map((h, i) => (
                  <li key={i} className="hazard-item">
                    <span
                      className="hazard-dot"
                      style={{ background: SEV_COLOR[h.severity] || '#888' }}
                    />
                    <span className="hazard-name">{h.name || h.description}</span>
                    <span className="hazard-tag">
                      {h.type === 'ponto_critico_historico'
                        ? 'Histórico'
                        : `Há ${h.last_seen_minutes_ago < 999 ? `${h.last_seen_minutes_ago}min` : '—'}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="route-clear">Nenhuma ocorrência conhecida neste trajeto.</p>
          )}
        </div>
      )}
    </form>
  )
}
