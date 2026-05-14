import { useState } from 'react'
import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   ReportModal — modal pra criar nova ocorrência
   Combina ReportModal + ReportForm anteriores em um só.
   Props:
     open      bool
     onClose   () => void
     onSubmit  async (payload) => any
     lat, lon  number (GPS do usuário)
   ════════════════════════════════════════════════════ */

const TIPOS = [
  ['alagamento',        'Alagamento'],
  ['deslizamento',      'Deslizamento'],
  ['queda_arvore',      'Queda de árvore'],
  ['via_intransitavel', 'Via intransitável'],
  ['poste_caido',       'Poste caído'],
  ['outro',             'Outro'],
]

const SEVERIDADES = [
  ['leve',     'Leve'],
  ['moderado', 'Moderado'],
  ['grave',    'Grave'],
]

const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }

export function ReportModal({ open, onClose, onSubmit, lat, lon }) {
  const [tipo, setTipo]               = useState('alagamento')
  const [severidade, setSeveridade]   = useState('moderado')
  const [descricao, setDescricao]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState(null)

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    soundMgr.playClick()
    try {
      await onSubmit({
        tipo,
        severidade,
        lat, lon,
        descricao: descricao || undefined,
      })
      /* reset and close */
      setTipo('alagamento')
      setSeveridade('moderado')
      setDescricao('')
      onClose && onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function onOverlayClick(e) {
    if (e.target === e.currentTarget) onClose && onClose()
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Criar ocorrência"
      onClick={onOverlayClick}
    >
      <form className="modal-panel report-modal" onSubmit={handleSubmit}>
        <header className="modal-header">
          <div>
            <h2 className="modal-title">Reportar ocorrência</h2>
            <div className="modal-subtitle">
              {lat && lon
                ? `GPS: ${lat.toFixed(4)}, ${lon.toFixed(4)}`
                : 'Aguardando GPS...'}
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >✕</button>
        </header>

        <label className="form-field">
          <span className="form-label">Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>

        <div className="form-field">
          <span className="form-label">Severidade</span>
          <div className="severity-picker">
            {SEVERIDADES.map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setSeveridade(v)}
                className={`severity-btn${severidade === v ? ' active' : ''}`}
                style={severidade === v
                  ? { background: `${SEV_COLOR[v]}26`, borderColor: SEV_COLOR[v], color: SEV_COLOR[v] }
                  : undefined}
              >
                <span className="severity-dot" style={{ background: SEV_COLOR[v] }} />
                {l}
              </button>
            ))}
          </div>
        </div>

        <label className="form-field">
          <span className="form-label">Descrição (opcional)</span>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="O que você está vendo?"
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >Cancelar</button>
          <button
            type="submit"
            disabled={submitting || !lat || !lon}
            className="btn-primary"
          >
            {submitting ? 'Enviando...' : 'Enviar report'}
          </button>
        </div>
      </form>
    </div>
  )
}
