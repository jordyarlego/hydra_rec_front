import { useState, useEffect } from 'react'
import { usePushNotifications } from '../../hooks/usePushNotifications.js'
import { soundMgr } from '../../lib/soundManager.js'

export function PushBell() {
  const { status, error, loading, subscribe, unsubscribe } = usePushNotifications()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (error) {
      setToast({ type: 'error', msg: error })
      const t = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(t)
    }
  }, [error])

  useEffect(() => {
    if (status === 'subscribed' && !error) {
      setToast({ type: 'ok', msg: 'Alertas ativados! Você receberá notificações de risco.' })
      const t = setTimeout(() => setToast(null), 3500)
      return () => clearTimeout(t)
    }
  }, [status, error])

  if (status === 'unsupported') return null

  const isOn     = status === 'subscribed'
  const isDenied = status === 'denied'
  const isError  = status === 'error'

  async function handle() {
    soundMgr.playClick()
    if (isOn) await unsubscribe()
    else await subscribe()
  }

  const title = isDenied
    ? 'Notificações bloqueadas — habilite nas configurações do navegador'
    : isError ? `Erro: ${error}`
    : isOn ? 'Desativar alertas push'
    : 'Ativar alertas de risco'

  const color = isOn ? '#e8a030'
    : isError ? '#ef4444'
    : 'rgba(255,255,255,.45)'

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={handle}
        disabled={isDenied || loading}
        title={title}
        aria-label={title}
        style={{
          background: 'none', border: 'none',
          cursor: (isDenied || loading) ? 'not-allowed' : 'pointer',
          padding: '4px 6px', borderRadius: '6px',
          opacity: isDenied ? 0.4 : 1,
          color, transition: 'color .2s',
        }}
      >
        {loading ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
          </svg>
        ) : isOn ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                  stroke="currentColor" fill="none" strokeWidth="2" />
            <circle cx="18" cy="6" r="4" fill="#22c55e" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        )}
      </button>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed', top: '60px', right: '12px',
            maxWidth: '280px', padding: '10px 12px',
            background: toast.type === 'error' ? 'rgba(239,68,68,.95)' : 'rgba(34,197,94,.95)',
            color: '#fff', borderRadius: '8px', fontSize: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,.35)',
            zIndex: 999, lineHeight: 1.4,
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
