import { getRiskColor } from '../../lib/riskColors.js'

/* ════════════════════════════════════════════════════
   ApacBanner — só aparece quando HÁ CHUVA REAL.
   Não polui a tela com aviso "amarelo" quando ninguém está vendo chuva.
   Texto cita os bairros onde está chovendo (nada de "algumas áreas").
   ════════════════════════════════════════════════════ */

const NIVEL = {
  SEVERO:   { label: 'Chuva muito forte agora', acao: 'Evite sair de casa. Risco de alagamento e deslizamento.' },
  ALTO:     { label: 'Chuva forte agora',        acao: 'Evite ruas baixas e dirigir por canais.' },
  MODERADO: { label: 'Chuva moderada agora',     acao: 'Cuidado em vias baixas se for sair.' },
}

function timeAgoLong(captured) {
  if (!captured) return null
  const diffMs = Date.now() - new Date(captured).getTime()
  if (Number.isNaN(diffMs)) return null
  const min = Math.floor(diffMs / 60000)
  if (min < 1)  return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  return `há ${Math.floor(min / 60)} h`
}

function exactTime(captured) {
  if (!captured) return null
  try {
    return new Date(captured).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

function pretty(raw) {
  if (!raw) return ''
  let s = String(raw).trim().replace(/\s+\d+\s*$/, '')
  if (/[A-Z]{3,}/.test(s) && s === s.toUpperCase()) {
    s = s.split(' ').map(w => {
      const l = w.toLowerCase()
      if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(l)) return l
      return w.charAt(0) + w.slice(1).toLowerCase()
    }).join(' ')
    s = s.charAt(0).toUpperCase() + s.slice(1)
  }
  return s
}

function formatPlace(estacao) {
  if (!estacao?.nome) return null
  const nome = pretty(estacao.nome)
  const cidade = pretty(estacao.cidade)
  return cidade ? `${nome} (${cidade})` : nome
}

export function ApacBanner({ boletim, light = false }) {
  // Não mostra banner quando: sem boletim, seguro, ou atenção (garoa leve)
  if (!boletim) return null
  if (boletim.nivel === 'SEGURO' || boletim.nivel === 'ATENCAO') return null

  const meta = NIVEL[boletim.nivel]
  if (!meta) return null

  // Sem estações com chuva real → não mostra
  const estacoes = (boletim.estacoes || []).filter(e => Number(e.mm ?? e.chuva_mm ?? 0) >= 0.5)
  if (estacoes.length === 0) return null

  const color = getRiskColor(boletim.nivel)
  const ago = timeAgoLong(boletim.coletado_em)
  const at  = exactTime(boletim.coletado_em)

  // Texto explicativo cita os locais reais
  const lugares = estacoes.slice(0, 3).map(formatPlace).filter(Boolean).join(', ')

  return (
    <div
      className={`apac-banner${light ? ' light' : ''}`}
      role="alert"
      aria-live="assertive"
      style={{ borderLeft: `3px solid ${color}`, background: `${color}12` }}
    >
      <div className="apac-banner-header">
        <span className="apac-nivel" style={{ color }}>{meta.label}</span>
        {at && <span className="apac-fresh" title={ago || ''}>{at}</span>}
      </div>

      <p className="apac-texto">
        Está chovendo em <strong>{lugares}</strong>
        {estacoes.length > 3 && ` e mais ${estacoes.length - 3}`}.
      </p>

      <p className="apac-acao">{meta.acao}</p>
    </div>
  )
}
