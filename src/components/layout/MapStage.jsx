import { useState } from 'react'
import { HydraMap } from '../map/HydraMap.jsx'
import { LiveClock } from '../common/LiveClock.jsx'
import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   MapStage — wrapper de chrome do mapa Leaflet
   Adiciona: live clock + Extended FAB de reportar.
   O Extended FAB tem ícone de megafone + label "Reportar"
   + badge "+", muito mais intuitivo que um botão "+" só.
   ════════════════════════════════════════════════════ */

export function MapStage({ bairro, risk, reports = [], loading, error, darkMode, onCreateReport, onMapClick, onReportClick, mobile }) {
  return (
    <div className="map-stage">
      <HydraMap
        bairro={bairro}
        risk={risk}
        reports={reports}
        darkMode={darkMode}
        onMapClick={onMapClick}
        onReportClick={onReportClick}
      />

      {/* Top-right: live clock */}
      <div className="map-overlay-tr">
        <div className="map-clock-panel">
          <LiveClock compact={mobile} />
        </div>
      </div>

      {/* Bottom-right: Report action */}
      <button
        type="button"
        className="map-fab-extended"
        aria-label="Reportar ocorrência"
        title="Reportar ocorrência"
        onClick={() => { soundMgr.playClick(); onCreateReport && onCreateReport() }}
      >
        <span aria-hidden="true" className="map-fab-accent" />
        <svg
          width="17" height="17"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10z" />
          <circle cx="12" cy="11" r="2.4" />
        </svg>
        <span className="map-fab-copy">
          <span>Reportar</span>
          <small>ocorrência</small>
        </span>
      </button>

      {loading && (
        <div className="map-loading-overlay" role="status" aria-live="polite" aria-busy="true">Carregando {bairro}...</div>
      )}
    </div>
  )
}
