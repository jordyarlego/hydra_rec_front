import { useState, useEffect, useCallback } from 'react'

const SOURCE_LABELS = {
  neighborhoods_geojson: 'Bairros (GeoJSON)',
  emlurb_156:            'EMLURB 156',
  defesa_civil:          'Defesa Civil',
  postes_iluminacao:     'Postes de Iluminação',
  logradouros:           'Logradouros',
  logradouros_recife:    'Logradouros Recife',
}

function StatusDot({ ok, err }) {
  if (err > 0) return <span className="odh-dot odh-dot--error" title="Com erros" />
  if (ok > 0)  return <span className="odh-dot odh-dot--ok"    title="Ok" />
  return              <span className="odh-dot odh-dot--idle"   title="Sem dados" />
}

export default function OfficialDataStatus({ token }) {
  const [sources, setSources]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError]       = useState(null)
  const [importMsg, setImportMsg] = useState(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/official-data/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setSources(data.sources || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  async function handleImport() {
    setImporting(true)
    setImportMsg(null)
    try {
      const res = await fetch('/api/admin/official-data/import', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const total = Object.values(data.results || {}).reduce((s, r) => s + (r.ok || 0), 0)
      setImportMsg(`Importação concluída: ${total} registros processados.`)
      await fetchStatus()
    } catch (e) {
      setImportMsg(`Erro: ${e.message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="odh-card">
      <div className="odh-header">
        <div>
          <h3 className="odh-title">Bases oficiais</h3>
          <p className="odh-subtitle">
            Importa bases urbanas usadas pela IA para saber bairro/RPA, via próxima, recorrência e relação com chamados públicos.
          </p>
        </div>
        <button
          className="btn-secondary odh-import-btn"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? 'Importando…' : 'Importar dados oficiais'}
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">{error}</p>
      )}
      {importMsg && <p className="odh-import-msg">{importMsg}</p>}

      {loading ? (
        <p className="odh-loading">Carregando status…</p>
      ) : sources.length === 0 ? (
        <div className="odh-empty">
          <strong>Nenhuma base registrada ainda.</strong>
          <span>“0 registros processados” significa que a fonte consultada não retornou linhas novas ou a base externa está vazia/indisponível. O admin continua funcionando, mas a IA perde recorrência e cruzamento por via.</span>
        </div>
      ) : (
        <table className="odh-table">
          <thead>
            <tr>
              <th>Fonte</th>
              <th>Registros OK</th>
              <th>Erros</th>
              <th>Duração</th>
              <th>Última importação</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sources.map(s => (
              <tr key={s.source}>
                <td>{SOURCE_LABELS[s.source] || s.source}</td>
                <td className="odh-mono">{s.records_ok ?? '—'}</td>
                <td className="odh-mono">{s.records_err ?? '—'}</td>
                <td className="odh-mono">{s.duration_s != null ? `${s.duration_s}s` : '—'}</td>
                <td className="odh-mono">
                  {s.started_at
                    ? new Date(s.started_at).toLocaleString('pt-BR')
                    : '—'}
                </td>
                <td><StatusDot ok={s.records_ok} err={s.records_err} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
