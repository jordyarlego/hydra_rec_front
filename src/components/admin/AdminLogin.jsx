import { useState } from 'react'
import { HydraLogo } from '../effects/HydraLogo.jsx'

export function AdminLogin({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onSignIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login">
      <form className="modal-panel admin-login-panel" onSubmit={handleSubmit}>
        <HydraLogo size={34} showText />
        <label className="form-field">
          <span className="form-label">Email</span>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label className="form-field">
          <span className="form-label">Senha</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
