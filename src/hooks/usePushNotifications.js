import { useState, useEffect, useCallback } from 'react'

export function usePushNotifications() {
  const [status, setStatus] = useState('idle') // idle | subscribed | denied | unsupported | error
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const supported = typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window

  useEffect(() => {
    if (!supported) { setStatus('unsupported'); return }
    if (Notification.permission === 'denied') { setStatus('denied'); return }
    _ensureSWReady(3000)
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setStatus(sub ? 'subscribed' : 'idle'))
      .catch(() => setStatus('idle'))
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported) {
      setError('Seu navegador não suporta notificações push.')
      setStatus('unsupported')
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Step 1: garantir SW registrado (com timeout para não travar em dev)
      let reg
      try {
        reg = await _ensureSWReady(8000)
      } catch {
        setError('Service Worker não pôde ser ativado. Recarregue a página e tente novamente.')
        setStatus('error')
        return
      }

      // Step 2: pedir permissão primeiro (separadamente, para iOS/PWA)
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'idle')
        setError(perm === 'denied'
          ? 'Notificações bloqueadas. Habilite nas configurações do navegador.'
          : 'Permissão de notificação não concedida.')
        return
      }

      // Step 3: buscar chave VAPID
      const res = await fetch('/api/push/vapid-public-key')
      if (!res.ok) {
        setError(`Servidor retornou ${res.status} ao buscar chave VAPID.`)
        setStatus('error')
        return
      }
      const payload = await res.json()
      const key = (payload.key || '').trim()
      if (!key) {
        setError(payload.error || 'Servidor não tem VAPID_PUBLIC_KEY configurada.')
        setStatus('error')
        return
      }
      if (key.length !== 87) {
        setError(`VAPID_PUBLIC_KEY malformada (${key.length} chars, esperado 87). Verifique o .env do backend.`)
        setStatus('error')
        return
      }

      // Step 4: inscrever no PushManager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: _urlBase64ToUint8Array(key),
      })

      // Step 5: enviar subscription ao backend, com localização opcional para
      // alertas de validação por proximidade.
      const subscriptionPayload = sub.toJSON()
      const position = await _tryCurrentPosition()
      if (position) {
        subscriptionPayload.lat = position.lat
        subscriptionPayload.lon = position.lon
      }
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscriptionPayload),
      })
      if (!saveRes.ok) {
        setError(`Backend rejeitou a inscrição (HTTP ${saveRes.status}).`)
        setStatus('error')
        return
      }

      setStatus('subscribed')
    } catch (e) {
      const msg = e?.message || String(e)
      if (Notification.permission === 'denied') {
        setStatus('denied')
        setError('Notificações bloqueadas no navegador.')
      } else {
        setStatus('error')
        setError(`Falha ao ativar: ${msg.slice(0, 120)}`)
      }
    } finally {
      setLoading(false)
    }
  }, [supported])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      const reg = await _ensureSWReady(5000)
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sub.toJSON()),
        }).catch(() => {})
        await sub.unsubscribe()
      }
      setStatus('idle')
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [supported])

  return { status, error, loading, subscribe, unsubscribe, supported }
}

async function _tryCurrentPosition() {
  if (!('geolocation' in navigator)) return null
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 5 * 60 * 1000,
      })
    })
    return {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
    }
  } catch {
    return null
  }
}

function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

// Garante que existe um SW registrado e ativo, com timeout para não travar.
// Em dev, main.jsx só registra o SW após PROD check em algumas versões — então
// registramos aqui também como rede de segurança.
async function _ensureSWReady(timeoutMs = 5000) {
  const existing = await navigator.serviceWorker.getRegistration()
  if (!existing) {
    await navigator.serviceWorker.register('/sw.js')
  }
  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('serviceWorker.ready timeout')), timeoutMs)
    ),
  ])
}
