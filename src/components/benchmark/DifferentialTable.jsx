/* ════════════════════════════════════════════════════
   DifferentialTable — Comparativo HydraRec vs INMET/APAC
   ════════════════════════════════════════════════════ */

export function DifferentialTable({ consensus, risk }) {
  if (!consensus || !risk) return null
  const sources = consensus.sources_count ?? 1

  const rows = [
    {
      label: 'Chuva prev. 24h',
      hydra: `${consensus.rain_next_24h_mm ?? '—'} mm`,
      official: consensus.inmet_rain_next ?? `~${consensus.rain_next_24h_mm ?? '—'} mm`,
    },
    {
      label: 'Chuva acum. 24h',
      hydra: `${consensus.rain_past_24h_mm ?? '—'} mm`,
      official: consensus.inmet_rain_past ?? `~${consensus.rain_past_24h_mm ?? '—'} mm`,
    },
    {
      label: 'Fontes ativas',
      hydra: `${sources} ${sources === 1 ? 'fonte' : 'fontes'}`,
      official: 'INMET / APAC',
    },
    {
      label: 'Score HydraRec',
      hydra: `${risk.score ?? '—'}/100`,
      official: risk.nivel ?? '—',
    },
  ]

  return (
    <table className="diff-table" aria-label="Comparativo HydraRec vs fontes oficiais">
      <thead>
        <tr>
          <th scope="col">Métrica</th>
          <th scope="col" className="diff-col-hydra">HydraRec</th>
          <th scope="col" className="diff-col-official">Oficial</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label}>
            <td className="diff-label">{r.label}</td>
            <td className="diff-hydra">{r.hydra}</td>
            <td className="diff-official">{r.official}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
