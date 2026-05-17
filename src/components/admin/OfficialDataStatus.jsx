import { useState, useEffect, useCallback } from 'react'
import { adminFetch, adminFetchJson } from '../../lib/adminFetch.js'

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

export default function OfficialDataStatus() {
  const [sources, setSources]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [importing, setImporting] = useState(false)
  const [seedImporting, setSeedImporting] = useState(false)
  const [error, setError]       = useState(null)
  const [importMsg, setImportMsg] = useState(null)

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchJson('/api/admin/official-data/status')
      setSources(data.sources || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  async function handleSeedImport() {
    setSeedImporting(true)
    setImportMsg('Carregando amostra pré-curada…')
    try {
      const data = await adminFetchJson('/api/admin/official-data/import-seed', { method: 'POST' })
      const r = data?.result || {}
      if (r.err > 0 && r.ok === 0) {
        setImportMsg(`Erro ao carregar amostra: ${r.error || 'desconhecido'}`)
      } else {
        setImportMsg(`Amostra carregada: ${r.ok} registros (${r.duration_s}s).`)
      }
      await fetchStatus()
    } catch (e) {
      setImportMsg(`Erro: ${e.message}`)
    } finally {
      setSeedImporting(false)
    }
  }

  async function handleImport() {
    setImporting(true)
    setImportMsg('Iniciando importação em background…')
    try {
      const data = await adminFetchJson('/api/admin/official-data/import', { method: 'POST' })
      if (data.status === 'already_running') {
        setImportMsg('Já existe uma importação em andamento. Aguardando terminar…')
      } else {
        setImportMsg('Importação rodando — vou acompanhar e te aviso.')
      }
      // Polling do status a cada 3s
      const poll = setInterval(async () => {
        try {
          const status = await adminFetchJson('/api/admin/official-data/import-status')
          if (!status.running) {
            clearInterval(poll)
            const result = status.result || {}
            if (result.error) {
              setImportMsg(`Erro: ${result.error}`)
            } else {
              const total = Object.values(result).reduce((s, r) => s + (r?.ok || 0), 0)
              const errs = Object.values(result).reduce((s, r) => s + (r?.err || 0), 0)
              setImportMsg(`Concluído em ${status.elapsed_s}s · ${total} registros importados${errs ? ` · ${errs} erros` : ''}.`)
            }
            await fetchStatus()
            setImporting(false)
          } else {
            setImportMsg(`Importando há ${status.elapsed_s}s…`)
          }
        } catch (e) {
          // mantém polling
        }
      }, 3000)
    } catch (e) {
      setImportMsg(`Erro: ${e.message}`)
      setImporting(false)
    }
  }

  return (
    <section className="odh-card">
      <div className="odh-header">
        <div>
          <h3 className="odh-title">Bases oficiais para priorização</h3>
          <p className="odh-subtitle">
            Quando o banco tem o histórico oficial (EMLURB 156, Defesa Civil),
            a plataforma consegue:
          </p>
          <ul className="odh-bullets">
            <li>Saber em qual bairro/RPA cada report está</li>
            <li>Aumentar a prioridade de reports em ruas com histórico oficial</li>
            <li>Mostrar no mapa quais áreas têm mais ocorrências históricas</li>
            <li>Sugerir “esta rua tem 3 chamados em aberto” no popup do report</li>
          </ul>
          <p className="odh-subtitle odh-subtitle--small">
            <strong>Importação direta do Portal de Dados Abertos</strong> baixa
            milhares de chamados — leva 30s–2min e às vezes falha (timeout,
            schema mudou). <strong>Carregar amostra MVP</strong> popula ~120
            chamados pré-curados em 1 segundo, ideal pra demo/teste e independe
            do portal estar no ar.
          </p>
        </div>
        <div className="odh-buttons">
          <button
            className="btn btn-primary odh-import-btn"
            onClick={handleSeedImport}
            disabled={importing || seedImporting}
            title="Carrega ~120 chamados pré-curados em <1s. Funciona mesmo se o Portal estiver fora do ar."
          >
            {seedImporting ? 'Carregando…' : '⚡ Carregar amostra MVP (~120)'}
          </button>
          <button
            className="btn btn-ghost odh-import-btn"
            onClick={handleImport}
            disabled={importing || seedImporting}
            title="Baixa o dataset completo do Portal de Dados Abertos. Pode levar 30s–2min e às vezes falha."
          >
            {importing ? 'Importando…' : 'Importar do Portal (completo)'}
          </button>
        </div>
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
          <span>Se aparecer 0 registros, o sistema só não encontrou dados novos nessa fonte. A triagem continua funcionando; o que fica mais fraco é a priorização por reincidência/via.</span>
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
