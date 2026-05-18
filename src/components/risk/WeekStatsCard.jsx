import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'

const POLL_MS = 10 * 60 * 1000

/* WeekStatsCard — transparência cívica.
   Card sutil no rodapé da sidebar mostrando:
     • N reports enviados em 7 dias
     • Y resolvidos pela prefeitura
     • tempo médio de resolução
     • categoria mais reportada
*/
export function WeekStatsCard({ days = 7 }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false
    function load() {
      api.getWeekStats({ days })
        .then(d => { if (!cancelled) setStats(d) })
        .catch(() => { /* silencioso — não cria barulho na UI */ })
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [days])

  if (!stats || (!stats.reports_total && !stats.resolved)) return null

  const topCat = stats.top_category ? (CATEGORY_BY_ID[stats.top_category] || null) : null

  return (
    <div className="week-stats-card" role="region" aria-label={`Atividade dos últimos ${days} dias`}>
      <div className="week-stats-head">
        <span className="week-stats-title">Últimos {days} dias</span>
      </div>
      <ul className="week-stats-list">
        <li>
          <strong>{stats.reports_total}</strong>
          <span>{stats.reports_total === 1 ? 'report' : 'reports'}</span>
        </li>
        <li>
          <strong className="week-stats-green">{stats.resolved}</strong>
          <span>{stats.resolved === 1 ? 'resolvido' : 'resolvidos'}</span>
        </li>
        {stats.avg_resolution_days != null && (
          <li>
            <strong>{stats.avg_resolution_days}</strong>
            <span>{stats.avg_resolution_days === 1 ? 'dia médio' : 'dias médios'}</span>
          </li>
        )}
      </ul>
      {topCat && (
        <p className="week-stats-foot">
          Mais reportado: <strong>{topCat.label}</strong>
        </p>
      )}
    </div>
  )
}
