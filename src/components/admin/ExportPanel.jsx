export default function ExportPanel({ token }) {
  function download(url, filename) {
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', filename)
    // Adiciona auth como query param apenas se necessário; prefer fetch + blob para maior controle
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
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
