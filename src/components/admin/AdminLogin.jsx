import { useState } from 'react'
import { HydraLogo } from '../effects/HydraLogo.jsx'
import { ArrowRight } from '@phosphor-icons/react'

/* ════════════════════════════════════════════════════
   AdminLogin v3 — glassmorphism premium.
   Continua usando o Supabase signIn do v2.
   ════════════════════════════════════════════════════ */

export function AdminLogin({ onSignIn, onSuccess }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (!onSignIn) throw new Error('Login indisponível.')
      await onSignIn(email, pw)
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Falha ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-stage">
      <form className="admin-login-card admin-login-panel" onSubmit={submit} aria-label="Entrar no painel administrativo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HydraLogo size={36} showText={false} />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '.18em', textTransform: 'uppercase' }}>
              HydraRec · Admin
            </div>
            <h1>Bem-vindo de volta</h1>
          </div>
        </div>
        <p>Entre com suas credenciais para acessar a triagem e os chamados.</p>

        <div className="form-field">
          <label htmlFor="admin-email">E-mail</label>
          <input
            id="admin-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="admin-pw">Senha</label>
          <input
            id="admin-pw"
            type="password"
            required
            autoComplete="current-password"
            value={pw}
            onChange={e => setPw(e.target.value)}
          />
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          {loading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'hr-spin .8s linear infinite' }}>
                <circle cx="12" cy="12" r="9" strokeOpacity=".25" />
                <path d="M21 12a9 9 0 0 1-9 9" />
              </svg>
              Entrando…
            </>
          ) : (
            <>Entrar <ArrowRight size={16} weight="bold" /></>
          )}
        </button>

        <div style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', marginTop: 8 }}>
          Apenas membros autorizados pela Defesa Civil/EMLURB.
        </div>
      </form>
    </div>
  )
}
