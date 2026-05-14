import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useDashboard(bairro) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!bairro) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.getDashboard(bairro)
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [bairro])

  useEffect(() => { load() }, [load])

  return { data, loading, error, refresh: load }
}
