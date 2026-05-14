import { useEffect } from 'react'
import { useNarrative } from '../../hooks/useNarrative.js'

export function AIInsight({ bairro, risk, consensus, reports }) {
  const { narrative, loading, error, refresh } = useNarrative()

  useEffect(() => {
    if (bairro && risk) {
      refresh({ bairro, riskData: risk, consensusData: consensus, nearbyReports: reports })
    }
  }, [bairro, risk?.nivel]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="ai-insight" id="ai" aria-label="Análise IA — Defesa Civil">
      <header className="ai-header">
        <span className="ai-badge">IA</span>
        <h2>Análise contextual</h2>
        <button
          className="ai-refresh"
          onClick={() => refresh({ bairro, riskData: risk, consensusData: consensus, nearbyReports: reports })}
          disabled={loading || !risk}
          aria-label="Atualizar análise IA"
          title="Atualizar"
        >
          ↺
        </button>
      </header>

      {loading && (
        <div className="ai-loading" aria-live="polite">
          <span className="ai-dot" />
          <span className="ai-dot" />
          <span className="ai-dot" />
        </div>
      )}

      {!loading && error && (
        <p className="ai-error" role="alert">Erro ao carregar análise: {error}</p>
      )}

      {!loading && !error && narrative && (
        <div className="ai-body" aria-live="polite">
          {narrative.split('\n').filter(Boolean).map((line, i) => (
            <p key={i} className="ai-line">{line}</p>
          ))}
        </div>
      )}

      {!loading && !error && !narrative && (
        <p className="ai-placeholder">Selecione um bairro para gerar análise.</p>
      )}
    </section>
  )
}
