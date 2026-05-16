import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useNarrative() {
  const [narrative,  setNarrative]  = useState(null)
  const [modelUsed,  setModelUsed]  = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const refresh = useCallback(async ({ bairro, riskData, consensusData, nearbyReports, apacBoletim, weather }) => {
    if (!bairro || !riskData) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.getNarrative(bairro, riskData, consensusData, nearbyReports, apacBoletim, weather)
      setNarrative(result.narrative)
      setModelUsed(result.model_used || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { narrative, modelUsed, loading, error, refresh }
}
