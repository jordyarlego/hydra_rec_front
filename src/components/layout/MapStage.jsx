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

export function MapStage({ bairro, risk, reports = [], loading, error, darkMode, onCreateReport, mobile }) {
  return (
    <div className="map-stage">
      <HydraMap
        bairro={bairro}
        risk={risk}
        reports={reports}
        darkMode={darkMode}
      />

      {/* Top-right: live clock */}
      <div className="map-overlay-tr">
        <div className="map-clock-panel">
          <LiveClock compact={mobile} />
        </div>
      </div>

      {/* Bottom-right: Extended FAB "Reportar" */}
      <button
        type="button"
        className="map-fab-extended"
        aria-label="Reportar ocorrência"
        title="Reportar ocorrência"
        onClick={() => { soundMgr.playClick(); onCreateReport && onCreateReport() }}
      >
        {/* Ping ring (continuous attention pulse) */}
        <span aria-hidden="true" className="map-fab-ping" />

        {/* Megaphone icon */}
        <svg
          width="18" height="18"
          viewBox="0 0 24 24"
          fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m3 11 18-5v12L3 14v-3z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>

        <span className="map-fab-label">Reportar</span>

        <span className="map-fab-plus" aria-hidden="true">+</span>
      </button>

      {loading && (
        <div className="map-loading-overlay" role="status">Carregando {bairro}...</div>
      )}
      {error && (
        <div className="map-error-overlay" role="alert">Erro: {error}</div>
      )}
    </div>
  )
}
