import { useState, useCallback } from 'react'

export function useExplain() {
  const [text, setText]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [open, setOpen]       = useState(false)

  const explain = useCallback(async (bairro) => {
    setOpen(true)
    setLoading(true)
    setError(null)
    setText(null)
    try {
      const res = await fetch(`/api/explain/${encodeURIComponent(bairro)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setText(data.explanation)
    } catch {
      setError('Não foi possível gerar a explicação agora. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setText(null)
    setError(null)
  }, [])

  return { text, loading, error, open, explain, close }
}
