import { ReportForm } from './ReportForm.jsx'

export function ReportModal({ open, onClose, onSubmit, lat, lon }) {
  if (!open) return null
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Criar report">
      <div className="modal-panel">
        <div className="modal-header">
          <h2>Reportar ocorrência</h2>
          <button onClick={onClose} aria-label="Fechar" className="modal-close">✕</button>
        </div>
        {lat && lon
          ? <ReportForm onSubmit={async (p) => { await onSubmit(p); onClose() }} onCancel={onClose} lat={lat} lon={lon} />
          : <p className="modal-info">Permita acesso à localização para reportar.</p>
        }
      </div>
    </div>
  )
}
