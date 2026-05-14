import { useEffect, useState } from 'react'
import { HydraMap } from '../map/HydraMap.jsx'
import { NearbyReportsList } from '../reports/NearbyReportsList.jsx'
import { ReportModal } from '../reports/ReportModal.jsx'
import { useReports } from '../../hooks/useReports.js'
import { Skeleton } from '../common/Skeleton.jsx'
import { BAIRRO_COORDS } from '../../data/bairro_coords.js'

const FALLBACK = [-8.1195, -34.9008]

export function MapStage({ bairro, risk, loading, error, darkMode }) {
  const { reports, loadNearby, submitReport, confirmReport } = useReports()
  const [modalOpen, setModalOpen] = useState(false)
  const [gpsCoords, setGpsCoords] = useState({ lat: null, lon: null })

  const center = BAIRRO_COORDS[bairro] ?? FALLBACK

  useEffect(() => {
    loadNearby(center[0], center[1])
  }, [bairro]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleOpenModal() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude })
          setModalOpen(true)
        },
        () => {
          setGpsCoords({ lat: center[0], lon: center[1] })
          setModalOpen(true)
        },
      )
    } else {
      setGpsCoords({ lat: center[0], lon: center[1] })
      setModalOpen(true)
    }
  }

  if (loading) {
    return (
      <main className="map-area" id="main-content">
        <Skeleton className="map-placeholder" label={`Carregando ${bairro}`} />
      </main>
    )
  }

  if (error) {
    return (
      <main className="map-area" id="main-content">
        <div className="map-placeholder error" role="alert">Erro: {error}</div>
      </main>
    )
  }

  return (
    <main className="map-area" id="main-content" aria-label="Mapa de risco">
      <HydraMap
        bairro={bairro}
        risk={risk}
        reports={reports}
        darkMode={darkMode ?? true}
      />
      <button
        className="btn-fab-report"
        onClick={handleOpenModal}
        aria-label="Criar report de ocorrência"
        title="Reportar ocorrência"
      >
        +
      </button>
      <aside className="reports-sidebar" aria-label="Reports recentes">
        <NearbyReportsList reports={reports} onConfirm={confirmReport} />
      </aside>
      <ReportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        lat={gpsCoords.lat}
        lon={gpsCoords.lon}
        onSubmit={async (payload) => {
          await submitReport(payload)
          loadNearby(center[0], center[1])
        }}
      />
    </main>
  )
}
