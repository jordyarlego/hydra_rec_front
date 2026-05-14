import { useEffect } from 'react'
import { useNarrative } from '../../hooks/useNarrative.js'
import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   AIInsight — boletim da IA (Gemini) com refresh manual
   Reusa o hook useNarrative existente
   ════════════════════════════════════════════════════ */

export function AIInsight({ bairro, risk, consensus, reports }) {
  const { narrative, loading, error, refresh } = useNarrative()

  useEffect(() => {
    if (bairro && risk) {
      refresh({ bairro, riskData: risk, consensusData: consensus, nearbyReports: reports })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bairro, risk?.nivel])

  function handleRefresh() {
    soundMgr.playClick()
    refresh({ bairro, riskData: risk, consensusData: consensus, nearbyReports: reports })
  }

  return (
    <section className="ai-insight" id="ai" aria-label="Análise IA — Defesa Civil">
      <header className="ai-header">
        <span className="ai-badge">IA · GEMINI</span>
        <span className="ai-title">Análise Contextual</span>
        <button
          className="ai-refresh"
          onClick={handleRefresh}
          disabled={loading || !risk}
          aria-label="Atualizar análise IA"
          title="Atualizar"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
            style={{ animation: loading ? 'spin 1.2s linear infinite' : 'none' }}>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <polyline points="21 4 21 10 15 10" />
          </svg>
        </button>
      </header>

      {loading && (
        <div className="ai-loading" aria-live="polite">
          <span className="ai-dot" />
          <span className="ai-status">Consultando Gemini...</span>
        </div>
      )}

      {!loading && error && (
        <p className="ai-error" role="alert">IA indisponível: {error}</p>
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
