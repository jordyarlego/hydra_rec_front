import { useState, useEffect, useCallback } from 'react'

export function useForecast(bairro) {
  const [forecast, setForecast] = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const load = useCallback(async () => {
    if (!bairro) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forecast/${encodeURIComponent(bairro)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setForecast(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [bairro])

  useEffect(() => { load() }, [load])

  return { forecast, loading, error, refresh: load }
}
