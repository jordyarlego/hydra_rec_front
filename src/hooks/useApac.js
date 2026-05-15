import { useState, useEffect } from 'react'

export function useApac() {
  const [boletim, setBoletim] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/apac/boletim')
      .then(r => r.ok ? r.json() : null)
      .then(d => setBoletim(d?.boletim ?? null))
      .catch(() => setBoletim(null))
      .finally(() => setLoading(false))
  }, [])

  return { boletim, loading }
}
