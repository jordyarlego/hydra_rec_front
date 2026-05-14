import { useState } from 'react'
import { BAIRROS } from '../../data/bairros.js'

export function RouteInput({ currentBairro, onAnalyze, loading }) {
  const [origin, setOrigin] = useState(currentBairro || BAIRROS[0])
  const [dest, setDest] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!dest) return
    onAnalyze({ originBairro: origin, destBairro: dest })
  }

  return (
    <form className="route-input-form" onSubmit={handleSubmit} aria-label="Análise de trajeto">
      <h2>Análise de trajeto</h2>
      <div className="route-fields">
        <label className="route-field">
          <span>Origem</span>
          <select value={origin} onChange={e => setOrigin(e.target.value)}>
            {BAIRROS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <span className="route-arrow" aria-hidden="true">→</span>
        <label className="route-field">
          <span>Destino</span>
          <select value={dest} onChange={e => setDest(e.target.value)}>
            <option value="">Selecione...</option>
            {BAIRROS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
      </div>
      <button type="submit" className="btn-primary route-submit" disabled={loading || !dest}>
        {loading ? 'Analisando…' : 'Analisar rota'}
      </button>
    </form>
  )
}
