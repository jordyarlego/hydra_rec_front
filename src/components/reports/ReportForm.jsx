import { useState } from 'react'

const TIPOS = ['alagamento','deslizamento','queda_arvore','via_intransitavel','poste_caido','outro']
const SEVERIDADES = ['leve','moderado','grave']

export function ReportForm({ onSubmit, onCancel, lat, lon }) {
  const [tipo, setTipo] = useState('alagamento')
  const [severidade, setSeveridade] = useState('moderado')
  const [descricao, setDescricao] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [erro, setErro] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setErro(null)
    try {
      await onSubmit({ tipo, severidade, lat, lon, descricao: descricao || undefined })
    } catch (err) {
      setErro(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="report-form">
      <div className="form-field">
        <label htmlFor="rf-tipo">Tipo</label>
        <select id="rf-tipo" value={tipo} onChange={e => setTipo(e.target.value)}>
          {TIPOS.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="rf-sev">Severidade</label>
        <select id="rf-sev" value={severidade} onChange={e => setSeveridade(e.target.value)}>
          {SEVERIDADES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="rf-desc">Descrição (opcional)</label>
        <textarea id="rf-desc" maxLength={280} rows={3} value={descricao}
          onChange={e => setDescricao(e.target.value)} placeholder="O que você está vendo?" />
      </div>
      {erro && <p className="form-error" role="alert">{erro}</p>}
      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Enviando…' : 'Enviar report'}
        </button>
      </div>
    </form>
  )
}
