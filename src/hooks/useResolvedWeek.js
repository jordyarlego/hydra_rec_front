import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'

const POLL_MS = 5 * 60 * 1000  // 5 min

export function useResolvedWeek({ days = 7, limit = 200 } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    function load() {
      api.getResolvedWeek({ days, limit })
        .then(r => { if (!cancelled && mountedRef.current) setData(r) })
        .catch(e => { if (!cancelled && mountedRef.current) setError(e?.message || 'erro') })
        .finally(() => { if (!cancelled && mountedRef.current) setLoading(false) })
    }

    load()
    const id = setInterval(load, POLL_MS)
    const onVisibility = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      mountedRef.current = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [days, limit])

  return { data, loading, error }
}
