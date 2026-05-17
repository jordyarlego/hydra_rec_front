import { HydraMap } from '../map/HydraMap.jsx'
import { Plus, Minus, Stack, Crosshair, MagnifyingGlass } from '@phosphor-icons/react'
import { useRef } from 'react'

/* ════════════════════════════════════════════════════
   MapStage v3 — FAB stack BOTTOM-RIGHT.

   MUDANÇA CRÍTICA: resolve a queixa do usuário sobre o menu
   sobreposto. Antes os controles do Leaflet (top-left) e o
   botão de reportar (top-left) colidiam. Agora:
     • Leaflet com zoomControl: false
     • Stack à direita: zoom cluster + util cluster + FAB primário
   ════════════════════════════════════════════════════ */

export function MapStage({
  bairro,
  risk,
  reports,
  loading,
  error,
  darkMode,
  bairroFilter,        // ⬅ novo prop pra filtrar pins
  onCreateReport,
  onMapClick,
  onReportClick,
  mobile,
}) {
  // Refs / handlers expostos pelo HydraMap pra controlar zoom/centralizar
  const mapRef = useRef(null)
  const setMapRef = (m) => { mapRef.current = m }

  const zoomIn  = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const centerOnMe = () => mapRef.current?.centerOnUser?.()
  const toggleLayers = () => mapRef.current?.toggleHotspots?.()

  return (
    <div className="map-host map-stage">
      <HydraMap
        bairro={bairro}
        risk={risk}
        reports={reports}
        loading={loading}
        error={error}
        darkMode={darkMode}
        bairroFilter={bairroFilter}
        onMapClick={onMapClick}
        onReportClick={onReportClick}
        onMapReady={setMapRef}
      />

      {/* Top bar — search button discreto + bairro pill (mobile usa hamburger separado) */}
      {!mobile && (
        <div className="map-top-bar">
          <button type="button" className="icon-btn" style={{ width: 40, height: 40 }} aria-label="Buscar bairro">
            <MagnifyingGlass size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* FAB stack — bottom right */}
      <div className="fab-stack">
        {!mobile && (
          <div className="fab-cluster" role="group" aria-label="Zoom">
            <button type="button" onClick={zoomIn} aria-label="Aproximar"><Plus size={16} weight="bold" /></button>
            <button type="button" onClick={zoomOut} aria-label="Afastar"><Minus size={16} weight="bold" /></button>
          </div>
        )}
        <div className="fab-cluster" role="group" aria-label="Camadas e localização">
          <button type="button" onClick={toggleLayers} aria-label="Camadas"><Stack size={16} weight="bold" /></button>
          <button type="button" onClick={centerOnMe} aria-label="Centralizar em mim"><Crosshair size={16} weight="bold" /></button>
        </div>
        <button type="button" className="fab fab-primary" onClick={onCreateReport} aria-label="Reportar ocorrência">
          <Plus size={18} weight="bold" />
          Reportar
        </button>
      </div>
    </div>
  )
}
