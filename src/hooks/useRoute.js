import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'
import { BAIRRO_COORDS } from '../data/bairro_coords.js'

export function useRoute() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const analyze = useCallback(async ({ originBairro, destBairro }) => {
    const origin = BAIRRO_COORDS[originBairro]
    const dest = BAIRRO_COORDS[destBairro]
    if (!origin || !dest) {
      setError('Selecione bairros de origem e destino válidos.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.getRouteRisk({
        origem_lat: origin[0],
        origem_lon: origin[1],
        destino_lat: dest[0],
        destino_lon: dest[1],
      })
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { result, loading, error, analyze }
}
