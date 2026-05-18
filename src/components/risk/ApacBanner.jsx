import { getRiskColor } from '../../lib/riskColors.js'
import { exactTimeRecife, timeAgoFromApac } from '../../lib/apacTime.js'

/* ════════════════════════════════════════════════════
   ApacBanner — só aparece quando HÁ CHUVA REAL.
   Não polui a tela com aviso "amarelo" quando ninguém está vendo chuva.
   Texto cita os bairros onde está chovendo (nada de "algumas áreas").
   ════════════════════════════════════════════════════ */

const NIVEL = {
  SEVERO:   { label: 'Chuva muito forte na região', acao: 'Evite sair de casa. Risco de alagamento e deslizamento.' },
  ALTO:     { label: 'Chuva forte na região',        acao: 'Evite ruas baixas e dirigir por canais.' },
  MODERADO: { label: 'Chuva moderada na região',     acao: 'Cuidado em vias baixas se for sair.' },
}

/* timeAgo + exactTime agora delegam pro lib/apacTime.js (defensivo
   contra strings APAC sem timezone — sempre converte pra Recife). */
const timeAgoLong = timeAgoFromApac
const exactTime = exactTimeRecife

export function ApacBanner({ boletim, light = false }) {
  if (!boletim) return null
  if (boletim.nivel === 'SEGURO' || boletim.nivel === 'ATENCAO') return null

  const meta = NIVEL[boletim.nivel]
  if (!meta) return null

  // Só mostra se há pelo menos 1 estação com chuva real (≥0.5mm)
  const estacoes = (boletim.estacoes || []).filter(e => Number(e.mm ?? e.chuva_mm ?? 0) >= 0.5)
  if (estacoes.length === 0) return null

  const color = getRiskColor(boletim.nivel)
  const ago = timeAgoLong(boletim.coletado_em)
  const at  = exactTime(boletim.coletado_em)
  const totalEstacoes = estacoes.length
  const maxMm = Math.max(...estacoes.map(e => Number(e.mm ?? e.chuva_mm ?? 0)))

  /* ApacBanner agora é APENAS o alerta agregado da RMR + ação cidadã.
     A lista de estações vive UMA VEZ no WeatherOutlook abaixo, evitando
     repetir os mesmos nomes em dois cards diferentes.                */
  return (
    <div
      className={`apac-banner${light ? ' light' : ''}`}
      role="alert"
      aria-live="assertive"
      style={{ borderLeft: `3px solid ${color}`, background: `${color}12` }}
    >
      <div className="apac-banner-header">
        <span className="apac-nivel" style={{ color }}>{meta.label}</span>
        {at && <span className="apac-fresh" title={ago || ''}>{at} · Recife</span>}
      </div>

      <p className="apac-texto">
        <strong>{totalEstacoes}</strong> {totalEstacoes === 1 ? 'estação registra' : 'estações registram'} chuva agora,
        pico de <strong>{maxMm.toFixed(1)} mm/h</strong>.
      </p>

      <p className="apac-acao">{meta.acao}</p>
    </div>
  )
}
