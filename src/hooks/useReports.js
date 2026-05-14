import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadNearby = useCallback(async (lat, lon, radius = 2000) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getNearbyReports(lat, lon, radius)
      setReports(data.reports || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const submitReport = useCallback(async (payload) => {
    const data = await api.createReport(payload)
    return data
  }, [])

  const confirmReport = useCallback(async (id) => {
    const data = await api.confirmReport(id)
    setReports(prev => prev.map(r => r.id === id
      ? { ...r, confirmed_count: data.confirmed_count }
      : r))
    return data
  }, [])

  return { reports, loading, error, loadNearby, submitReport, confirmReport }
}
