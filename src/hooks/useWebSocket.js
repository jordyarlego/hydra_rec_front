import { useEffect, useRef, useCallback } from 'react'

export function useWebSocket(bairro, onData) {
  const wsRef    = useRef(null)
  const timerRef = useRef(null)
  const delay    = useRef(2000)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${location.host}/ws/${encodeURIComponent(bairro)}`)

    ws.onmessage = e => {
      try { onData(JSON.parse(e.data)); delay.current = 2000 } catch {}
    }
    ws.onclose = () => {
      timerRef.current = setTimeout(() => {
        delay.current = Math.min(delay.current * 2, 60000)
        connect()
      }, delay.current)
    }
    wsRef.current = ws
  }, [bairro, onData])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(timerRef.current)
      wsRef.current?.close()
    }
  }, [connect])
}
