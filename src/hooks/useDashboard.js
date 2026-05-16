import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api.js'

const POLL_INTERVAL_MS = 5 * 60 * 1000  // 5 min — TTL do cache backend

export function useDashboard(bairro) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!bairro) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await api.getDashboard(bairro)
      if (mountedRef.current) setData(result)
    } catch (e) {
      if (mountedRef.current) setError(e.message)
    } finally {
      if (mountedRef.current && !silent) setLoading(false)
    }
  }, [bairro])

  useEffect(() => {
    mountedRef.current = true
    load()
    const id = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load({ silent: true })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      mountedRef.current = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [load])

  return { data, loading, error, refresh: load, setData }
}
