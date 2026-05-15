import { useEffect } from 'react'
import { useNarrative } from '../../hooks/useNarrative.js'
import { useApac } from '../../hooks/useApac.js'
import { soundMgr } from '../../lib/soundManager.js'

const LEVEL_META = {
  SEGURO:   { label: 'Operação normal', tone: 'safe' },
  ATENCAO:  { label: 'Atenção preventiva', tone: 'watch' },
  MODERADO: { label: 'Risco em evolução', tone: 'moderate' },
  ALTO:     { label: 'Ação recomendada', tone: 'high' },
  SEVERO:   { label: 'Evite deslocamento', tone: 'severe' },
}

function stripPrefix(line) {
  // Remove "1. ", "2. ", etc. que alguns modelos adicionam mesmo sem pedir
  return line.replace(/^\d+\.\s*/, '').trim()
}

function splitNarrative(narrative) {
  const lines = (narrative || '')
    .split('\n')
    .map(l => stripPrefix(l.trim()))
    .filter(Boolean)
  return {
    diagnosis: lines[0] || 'Dados insuficientes para fechar diagnóstico agora.',
    location:  lines[1] || 'Sem ponto específico apontado neste momento.',
    timing:    lines[2] || 'Cenário se mantém nas próximas horas.',
    action:    lines[3] || 'Revise seu trajeto antes de sair.',
  }
}

function metric(value, fallback = '—') {
  return value == null || Number.isNaN(value) ? fallback : value
}

function modelLabel(modelUsed) {
  if (!modelUsed || modelUsed === 'local') return 'IA · Análise local'
  return `IA · ${modelUsed}`
}

export function AIInsight({ bairro, risk, consensus, reports }) {
  const { narrative, modelUsed, loading, error, refresh } = useNarrative()
  const { boletim: apacBoletim } = useApac()
  const level = risk?.nivel || 'SEGURO'
  const meta = LEVEL_META[level] || LEVEL_META.SEGURO
  const briefing = splitNarrative(narrative)
  const rainNext = metric(consensus?.rain_next_24h_mm)
  const rainPast = metric(consensus?.rain_past_24h_mm)
  const sources = consensus?.sources_count || 1

  useEffect(() => {
    if (bairro && risk) {
      refresh({ bairro, riskData: risk, consensusData: consensus, nearbyReports: reports, apacBoletim })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bairro, risk?.nivel])

  function handleRefresh() {
    soundMgr.playClick()
    refresh({ bairro, riskData: risk, consensusData: consensus, nearbyReports: reports, apacBoletim })
  }

  return (
    <section className={`ai-insight ai-${meta.tone}`} id="ai" aria-label="Análise IA — Defesa Civil">
      <header className="ai-header">
        <span className="ai-badge">{modelLabel(modelUsed)}</span>
        <span className="ai-title">Boletim operacional</span>
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
          <span className="ai-status">Consultando IA...</span>
        </div>
      )}

      {!loading && error && (
        <p className="ai-error" role="alert">IA indisponível: {error}</p>
      )}

      {!loading && !error && narrative && (
        <div className="ai-body" aria-live="polite">
          <div className="ai-briefing-head">
            <div>
              <span className="ai-risk-kicker">{meta.label}</span>
              <strong>{bairro}</strong>
            </div>
            <span className="ai-score-chip">{risk?.score ?? '—'}/100</span>
          </div>

          <div className="ai-narrative">
            <p className="ai-diagnosis">{briefing.diagnosis}</p>
            <p className="ai-location">{briefing.location}</p>
            <p className="ai-timing">{briefing.timing}</p>
            <p className="ai-action">{briefing.action}</p>
          </div>

          <div className="ai-metrics-row" aria-label="Dados usados pela IA">
            <span>{rainNext}mm próximas 24h</span>
            <span>{rainPast}mm últimas 24h</span>
            <span>{reports?.length || 0} reports</span>
            <span>{sources} fontes</span>
          </div>
        </div>
      )}

      {!loading && !error && !narrative && (
        <p className="ai-placeholder">Selecione um bairro para gerar análise.</p>
      )}
    </section>
  )
}
