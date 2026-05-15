import { useFocusTrap } from '../../hooks/useFocusTrap.js'

/* Modal "Por que esse score?" — renderiza texto da IA com formatação simples */

function renderMd(text) {
  return text
    .split('\n')
    .map((line, i) => {
      // **bold**
      const parts = line.split(/\*\*(.*?)\*\*/g)
      const nodes = parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)
      return line.trim() ? <p key={i} className="score-explain-line">{nodes}</p> : <div key={i} className="score-explain-gap" />
    })
}

export function ScoreExplain({ open, loading, text, error, onClose, light }) {
  const trapRef = useFocusTrap(open, onClose)

  if (!open) return null

  return (
    <div className="score-explain-backdrop" onClick={onClose}>
      <div
        ref={trapRef}
        className={`score-explain-panel${light ? ' light' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="score-explain-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="score-explain-header">
          <div id="score-explain-title" className="score-explain-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8a030" strokeWidth="2.2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            Por que esse score?
          </div>
          <button className="score-explain-close" onClick={onClose} aria-label="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="score-explain-body scroll-y">
          {loading && (
            <div className="score-explain-loading">
              <div className="score-explain-spinner" />
              <span>Analisando os dados...</span>
            </div>
          )}
          {error && <p className="score-explain-error">{error}</p>}
          {text && <div className="score-explain-text">{renderMd(text)}</div>}
        </div>

        <div className="score-explain-footer">
          Análise gerada por IA · dados em tempo real
        </div>
      </div>
    </div>
  )
}
