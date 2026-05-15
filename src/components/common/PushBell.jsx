import { usePushNotifications } from '../../hooks/usePushNotifications.js'
import { soundMgr } from '../../lib/soundManager.js'

export function PushBell() {
  const { status, subscribe, unsubscribe } = usePushNotifications()

  if (status === 'unsupported') return null

  const isOn = status === 'subscribed'
  const isDenied = status === 'denied'

  function handle() {
    soundMgr.playClick()
    if (isOn) unsubscribe()
    else subscribe()
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={isDenied}
      title={isDenied ? 'Notificações bloqueadas no navegador' : isOn ? 'Desativar alertas' : 'Ativar alertas de risco'}
      aria-label={isOn ? 'Desativar alertas push' : 'Ativar alertas push'}
      style={{
        background: 'none', border: 'none', cursor: isDenied ? 'not-allowed' : 'pointer',
        padding: '4px 6px', borderRadius: '6px', opacity: isDenied ? 0.4 : 1,
        color: isOn ? '#e8a030' : 'rgba(255,255,255,.45)',
        transition: 'color .2s',
      }}
    >
      {isOn ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" fill="none" strokeWidth="2"/>
          <circle cx="18" cy="6" r="4" fill="#22c55e"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      )}
    </button>
  )
}
