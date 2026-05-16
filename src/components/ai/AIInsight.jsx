import { useEffect, useMemo } from 'react'
import { useNarrative } from '../../hooks/useNarrative.js'
import { useApac } from '../../hooks/useApac.js'
import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   AIInsight — só aparece quando há algo realmente ÚTIL a dizer.
   Regras: oculta quando está tudo limpo (sem chuva agora E sem acúmulo 24h
   E sem reports recentes E score < 30). Em outros casos, mostra texto
   curto e acionável.
   ════════════════════════════════════════════════════ */

const LEVEL_META = {
  SEGURO:   { label: 'Operação normal',     tone: 'safe' },
  ATENCAO:  { label: 'Atenção preventiva',  tone: 'watch' },
  MODERADO: { label: 'Risco em evolução',   tone: 'moderate' },
  ALTO:     { label: 'Ação recomendada',    tone: 'high' },
  SEVERO:   { label: 'Evite deslocamento',  tone: 'severe' },
}

function modelLabel(modelUsed) {
  if (!modelUsed || modelUsed === 'local') return 'Análise local'
  return modelUsed
}

export function AIInsight({ bairro, risk, consensus, weather, reports }) {
  const { narrative, modelUsed, loading, error, refresh } = useNarrative()
  const { boletim: apacBoletim } = useApac()
  const level = risk?.nivel || 'SEGURO'
  const meta = LEVEL_META[level] || LEVEL_META.SEGURO
  const lines = (narrative || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3)

  const rainNow = weather?.rain_1h_mm
  const rain24h = weather?.rain_24h_mm
  const score = risk?.score || 0
  const reportsCount = reports?.length || 0

  // Decisão: vale mostrar a IA?
  const hasRain        = (rainNow  ?? 0) >= 0.2
  const hasRecentRain  = (rain24h ?? 0) >= 5
  const hasReports     = reportsCount > 0
  const hasRiskSignal  = score >= 30
  const shouldShow     = hasRain || hasRecentRain || hasReports || hasRiskSignal

  useEffect(() => {
    if (!shouldShow) return
    if (bairro && risk) {
      refresh({ bairro, riskData: risk, consensusData: consensus, nearbyReports: reports, apacBoletim, weather })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bairro, risk?.nivel, weather?.rain_level, shouldShow])

  function handleRefresh() {
    soundMgr.playClick()
    refresh({ bairro, riskData: risk, consensusData: consensus, nearbyReports: reports, apacBoletim, weather })
  }

  // Estado oculto: tudo limpo + score baixo → não polui a tela
  if (!shouldShow) {
    return (
      <section className="ai-insight ai-safe ai-collapsed" aria-label="Análise IA">
        <p className="ai-collapsed-text">
          Sem alerta no momento — nenhum sinal de risco em {bairro}.
        </p>
      </section>
    )
  }

  return (
    <section className={`ai-insight ai-${meta.tone}`} id="ai" aria-label="Análise IA">
      <header className="ai-header">
        <span className="ai-title">Análise da situação</span>
        <span className="ai-badge">{modelLabel(modelUsed)}</span>
        <button
          className="ai-refresh"
          onClick={handleRefresh}
          disabled={loading || !risk}
          aria-label="Atualizar análise"
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
          <span className="ai-status">Analisando…</span>
        </div>
      )}

      {!loading && error && (
        <p className="ai-error" role="alert">Análise indisponível: {error}</p>
      )}

      {!loading && !error && narrative && (
        <div className="ai-body" aria-live="polite">
          <div className="ai-narrative">
            {lines.map((line, i) => (
              <p key={i} className={`ai-line ai-line-${i + 1}`}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
