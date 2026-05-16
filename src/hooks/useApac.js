import { useState, useEffect, useRef } from 'react'

const POLL_INTERVAL_MS = 5 * 60 * 1000  // 5 min

export function useApac() {
  const [boletim, setBoletim] = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    function load() {
      fetch('/api/apac/boletim')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (mountedRef.current) setBoletim(d?.boletim ?? null) })
        .catch(() => { if (mountedRef.current) setBoletim(null) })
        .finally(() => { if (mountedRef.current) setLoading(false) })
    }

    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    const onVisibility = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mountedRef.current = false
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return { boletim, loading }
}
