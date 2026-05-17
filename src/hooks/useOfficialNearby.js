import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api.js'

const POLL_INTERVAL_MS = 10 * 60 * 1000  // 10 min

export function useOfficialNearby(lat, lon, { radius = 500, days = 30, limit = 10 } = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (typeof lat !== 'number' || typeof lon !== 'number') return
    if (Number.isNaN(lat) || Number.isNaN(lon)) return

    let cancelled = false
    setLoading(true)
    setError(null)

    function load() {
      api.getOfficialNearby(lat, lon, { radius, days, limit })
        .then(r => {
          if (cancelled || !mountedRef.current) return
          setData(r)
        })
        .catch(e => {
          if (cancelled || !mountedRef.current) return
          setError(e?.message || 'Erro ao carregar chamados oficiais')
        })
        .finally(() => {
          if (cancelled || !mountedRef.current) return
          setLoading(false)
        })
    }

    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [lat, lon, radius, days, limit])

  return { data, loading, error }
}
