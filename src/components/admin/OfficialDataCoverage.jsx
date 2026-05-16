import { useEffect, useState } from 'react'
import { MapPin, FileText, Buildings, ArrowClockwise } from '@phosphor-icons/react'
import { adminFetchJson } from '../../lib/adminFetch.js'

/**
 * Mostra o que está populado AGORA no banco de bases oficiais.
 * Resolve a queixa do user: "nunca baixa direito; deveria deixar
 * claro quais bairros estão mapeados no momento (MVP)".
 */
export default function OfficialDataCoverage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  function load() {
    setLoading(true)
    setError(null)
    adminFetchJson('/api/admin/official-data/coverage')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  if (loading) return <p className="admin-empty">Carregando cobertura…</p>
  if (error) return <p className="form-error" role="alert">{error}</p>
  if (!data) return null

  const nb = data.neighborhoods || {}
  const reqs = data.official_requests || {}

  return (
    <section className="coverage-card">
      <header className="coverage-head">
        <div>
          <strong>O que está mapeado agora</strong>
          <small>Transparência do estado atual da base — MVP, importação ainda manual.</small>
        </div>
        <button type="button" className="btn-secondary btn-mini" onClick={load}>
          <ArrowClockwise size={13} weight="bold" aria-hidden="true" /> Atualizar
        </button>
      </header>

      <div className="coverage-grid">
        <div className="coverage-stat">
          <MapPin size={20} weight="bold" aria-hidden="true" />
          <strong>{nb.count ?? 0}</strong>
          <small>bairros oficiais cadastrados</small>
          {nb.rpas?.length > 0 && (
            <span className="coverage-rpas">RPAs: {nb.rpas.join(', ')}</span>
          )}
        </div>
        <div className="coverage-stat">
          <FileText size={20} weight="bold" aria-hidden="true" />
          <strong>{reqs.total ?? 0}</strong>
          <small>chamados oficiais importados (EMLURB/Defesa Civil)</small>
          {reqs.last_opened_at && (
            <span className="coverage-rpas">
              Mais recente: {new Date(reqs.last_opened_at).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
        <div className="coverage-stat">
          <Buildings size={20} weight="bold" aria-hidden="true" />
          <strong>{data.roads?.count ?? 0}</strong>
          <small>vias/logradouros cadastradas</small>
        </div>
      </div>

      {reqs.by_neighborhood_top10?.length > 0 && (
        <details className="coverage-details">
          <summary>Top 10 bairros com mais chamados oficiais</summary>
          <ul>
            {reqs.by_neighborhood_top10.map(item => (
              <li key={item.neighborhood}>
                <strong>{item.neighborhood}</strong> — {item.count} chamado(s)
              </li>
            ))}
          </ul>
        </details>
      )}
      {reqs.by_category?.length > 0 && (
        <details className="coverage-details">
          <summary>Top categorias importadas</summary>
          <ul>
            {reqs.by_category.map(item => (
              <li key={item.category}>
                <strong>{item.category}</strong> — {item.count}
              </li>
            ))}
          </ul>
        </details>
      )}

      {nb.sample?.length > 0 && (
        <details className="coverage-details">
          <summary>Amostra de bairros mapeados ({nb.sample.length})</summary>
          <p className="coverage-sample">{nb.sample.join(' · ')}</p>
        </details>
      )}

      {(nb.count === 0 && (reqs.total ?? 0) === 0) && (
        <p className="coverage-warning">
          ⚠ Nenhuma base oficial foi importada ainda. Clique em "Importar agora"
          abaixo. A primeira importação leva 30s–2min.
        </p>
      )}
    </section>
  )
}
