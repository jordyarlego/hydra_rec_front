const CONF_LABEL = { ALTA: 'Alta', MEDIA: 'Média', BAIXA: 'Baixa' }
const CONF_CLASS = { ALTA: 'conf-alta', MEDIA: 'conf-media', BAIXA: 'conf-baixa' }

function Row({ label, hydra, official, help }) {
  return (
    <tr>
      <td title={help}>{label}</td>
      <td className="cell-hydra">{hydra ?? '—'}</td>
      <td className="cell-official">{official ?? '—'}</td>
    </tr>
  )
}

export function DifferentialTable({ consensus, risk }) {
  if (!consensus || !risk) return null

  const conf = consensus.confidence ?? 'MEDIA'
  const sources = consensus.sources_count ?? 1

  return (
    <section className="diff-table-wrap" aria-label="Benchmark de dados">
      <header className="diff-header">
        <h2>Fontes de dados</h2>
        <span className={`conf-badge ${CONF_CLASS[conf] ?? 'conf-media'}`}>
          Confiança {CONF_LABEL[conf] ?? conf}
        </span>
      </header>
      <table className="diff-table" aria-label="Comparativo HydraRec vs fontes oficiais">
        <thead>
          <tr>
            <th scope="col">Métrica</th>
            <th scope="col">HydraRec</th>
            <th scope="col">Oficial</th>
          </tr>
        </thead>
        <tbody>
          <Row
            label="Chuva prev. 24h"
            hydra={`${consensus.rain_next_24h_mm ?? '—'} mm`}
            official={consensus.inmet_rain_next ?? `~${consensus.rain_next_24h_mm ?? '—'} mm`}
            help="Chuva prevista para as próximas 24h"
          />
          <Row
            label="Chuva acum. 24h"
            hydra={`${consensus.rain_past_24h_mm ?? '—'} mm`}
            official={consensus.inmet_rain_past ?? `~${consensus.rain_past_24h_mm ?? '—'} mm`}
            help="Chuva acumulada nas últimas 24h"
          />
          <Row
            label="Fontes ativas"
            hydra={`${sources} fonte${sources !== 1 ? 's' : ''}`}
            official="INMET / APAC"
          />
          <Row
            label="Score HydraRec"
            hydra={`${risk.score ?? '—'}/100`}
            official={risk.nivel ?? '—'}
            help="Score calculado pelo modelo HydraRec v2"
          />
        </tbody>
      </table>
    </section>
  )
}
