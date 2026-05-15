import { getRiskColor } from '../../lib/riskColors.js'

/* ════════════════════════════════════════════════════
   ApacBanner — boletim oficial da APAC
   Só renderiza quando há boletim ativo e afeta Recife.
   ════════════════════════════════════════════════════ */

const NIVEL_LABEL = {
  SEVERO:   'Alerta Severo',
  ALTO:     'Alerta Vermelho',
  MODERADO: 'Alerta Laranja',
  ATENCAO:  'Alerta Amarelo',
  SEGURO:   'Sem Alerta',
}

export function ApacBanner({ boletim, light = false }) {
  if (!boletim || boletim.nivel === 'SEGURO') return null

  const color = getRiskColor(boletim.nivel)
  const label = NIVEL_LABEL[boletim.nivel] ?? 'Alerta APAC'

  return (
    <div
      className={`apac-banner${light ? ' light' : ''}`}
      role="alert"
      aria-live="assertive"
      style={{ borderLeft: `3px solid ${color}`, background: `${color}12` }}
    >
      <div className="apac-banner-header">
        <span className="apac-badge" style={{ color, borderColor: `${color}50` }}>
          APAC · Oficial
        </span>
        <span className="apac-nivel" style={{ color }}>{label}</span>
      </div>

      {boletim.titulo && (
        <div className="apac-titulo">{boletim.titulo}</div>
      )}

      <p className="apac-texto">{boletim.texto}</p>

      {boletim.url && (
        <a
          href={boletim.url}
          target="_blank"
          rel="noopener noreferrer"
          className="apac-link"
          style={{ color }}
        >
          Ver boletim completo →
        </a>
      )}

      <div className="apac-footer">
        Fonte: Agência Pernambucana de Águas e Clima
        {boletim.coletado_em && (
          <> · {new Date(boletim.coletado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
        )}
      </div>
    </div>
  )
}
