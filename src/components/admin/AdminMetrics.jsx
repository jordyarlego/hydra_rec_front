import { useEffect, useState } from 'react'
import { adminFetchJson } from '../../lib/adminFetch.js'

export function AdminMetrics() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminFetchJson('/api/admin/metrics')
      .then(setData)
      .catch(err => setError(err.message))
  }, [])

  const max = Math.max(...(data?.top_bairros || []).map(x => x.count), 1)

  return (
    <section className="admin-section">
      <div className="admin-section-head">
        <div>
          <h1>Métricas</h1>
          <p>Visão de volume, fila e bairros que precisam de atenção.</p>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!data ? <p>Carregando...</p> : (
        <>
          <div className="admin-kpis">
            <div><span>Últimas 24h</span><strong>{data.last24h}</strong></div>
            <div><span>Pendentes</span><strong>{data.pending}</strong></div>
            <div><span>Validados</span><strong>{data.validated}</strong></div>
            <div><span>Resolvidos</span><strong>{data.resolved}</strong></div>
          </div>
          <h2 className="admin-subheading">Bairros com mais reports</h2>
          <div className="admin-chart">
            {(data.top_bairros || []).map(item => (
              <div key={item.bairro} className="admin-bar-row">
                <span>{item.bairro}</span>
                <div><i style={{ width: `${(item.count / max) * 100}%` }} /></div>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
