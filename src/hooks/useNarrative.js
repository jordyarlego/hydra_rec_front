import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useNarrative() {
  const [narrative, setNarrative] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ bairro, riskData, consensusData, nearbyReports }) => {
    if (!bairro || !riskData) return
    setLoading(true)
    setError(null)
    try {
      const result = await api.getNarrative(bairro, riskData, consensusData, nearbyReports)
      setNarrative(result.narrative)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { narrative, loading, error, refresh }
}
