import { useState, useCallback, useEffect } from 'react'
import { api } from '../lib/api.js'
import {
  enqueueReport,
  isNetworkFailure,
  listQueuedReports,
  queuedRecordToReport,
  recordToFormData,
  removeQueuedReport,
} from '../lib/offlineReports.js'

export function useReports() {
  const [reports, setReports] = useState([])
  const [queued, setQueued] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshQueued = useCallback(async () => {
    if (!('indexedDB' in window)) return
    try {
      const items = await listQueuedReports()
      setQueued(items)
    } catch {
      setQueued([])
    }
  }, [])

  const syncQueued = useCallback(async () => {
    if (!navigator.onLine || !('indexedDB' in window)) return
    const items = await listQueuedReports()
    for (const item of items) {
      try {
        await api.createReportForm(recordToFormData(item))
        await removeQueuedReport(item.id)
      } catch {
        break
      }
    }
    await refreshQueued()
  }, [refreshQueued])

  useEffect(() => {
    refreshQueued()
    syncQueued()
    window.addEventListener('online', syncQueued)
    return () => window.removeEventListener('online', syncQueued)
  }, [refreshQueued, syncQueued])

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
    try {
      const data = payload instanceof FormData
        ? await api.createReportForm(payload)
        : await api.createReport(payload)
      return data
    } catch (e) {
      if (payload instanceof FormData && isNetworkFailure(e) && 'indexedDB' in window) {
        const record = await enqueueReport(payload)
        await refreshQueued()
        return { id: record.id, status: 'pendente_offline', offline: true }
      }
      throw e
    }
  }, [refreshQueued])

  const getReport = useCallback(async (id) => {
    return api.getReport(id)
  }, [])

  const confirmReport = useCallback(async (id) => {
    const data = await api.confirmReport(id)
    setReports(prev => prev.map(r => r.id === id
      ? { ...r, confirmed_count: data.confirmed_count }
      : r))
    return data
  }, [])

  const likeReport = useCallback(async (id, vote) => {
    const data = await api.likeReport(id, vote)
    setReports(prev => prev.map(r => r.id === id
      ? { ...r, likes_up: data.likes_up, likes_down: data.likes_down }
      : r))
    return data
  }, [])

  const allReports = [
    ...queued.map(queuedRecordToReport),
    ...reports,
  ]

  return { reports: allReports, loading, error, loadNearby, submitReport, confirmReport, likeReport, getReport, syncQueued }
}
