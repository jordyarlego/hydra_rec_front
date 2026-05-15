import { useState, useCallback } from 'react'
import { api } from '../lib/api.js'

export function useRoute() {
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const analyze = useCallback(async ({
    originLat, originLon,
    destLat,   destLon,
    originLabel = '',
    destLabel   = '',
    modo        = 'driving-car',
    rainNext    = 0,
  }) => {
    if (originLat == null || destLat == null) {
      setError('Selecione origem e destino válidos.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.getRouteRisk({
        origem_lat:   originLat,
        origem_lon:   originLon,
        destino_lat:  destLat,
        destino_lon:  destLon,
        perfil:       modo,
        rain_next:    rainNext,
        origem_nome:  originLabel,
        destino_nome: destLabel,
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
