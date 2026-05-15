import { useState, useEffect, useCallback } from 'react'

export function usePushNotifications() {
  const [status, setStatus] = useState('idle') // idle | subscribed | denied | unsupported

  const supported = 'serviceWorker' in navigator && 'PushManager' in window

  useEffect(() => {
    if (!supported) { setStatus('unsupported'); return }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        setStatus(sub ? 'subscribed' : 'idle')
      })
    )
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported) return
    try {
      const res = await fetch('/api/push/vapid-public-key')
      const { key } = await res.json()
      if (!key) return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlBase64ToUint8Array(key),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setStatus('subscribed')
    } catch (e) {
      if (Notification.permission === 'denied') setStatus('denied')
    }
  }, [supported])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
    await sub.unsubscribe()
    setStatus('idle')
  }, [supported])

  return { status, subscribe, unsubscribe, supported }
}

function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}
