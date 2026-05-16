import { adminFetch } from '../../lib/adminFetch.js'

export default function ExportPanel() {
  function download(url, filename) {
    const a = document.createElement('a')
    a.setAttribute('download', filename)
    adminFetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.blob()
      })
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob)
        a.href = objectUrl
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(objectUrl)
      })
      .catch(e => alert(`Erro ao exportar: ${e.message}`))
  }

  return (
    <section className="export-panel">
      <h4 className="export-panel__heading">Exportar dados</h4>
      <div className="export-panel__btns">
        <button
          className="btn-secondary"
          onClick={() => download('/api/admin/export/reports.csv', 'reports.csv')}
        >
          Exportar CSV
        </button>
        <button
          className="btn-secondary"
          onClick={() => download('/api/admin/export/reports.geojson', 'reports.geojson')}
        >
          Exportar GeoJSON
        </button>
      </div>
    </section>
  )
}
