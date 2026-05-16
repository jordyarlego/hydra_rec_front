import { useEffect } from 'react'
import { CheckCircle } from '@phosphor-icons/react'

/**
 * Overlay de sucesso com animação de check.
 * Renderiza por `duration` ms e depois chama onDone.
 * Usado quando o cidadão envia um report, quando admin valida/rejeita, etc.
 */
export function SuccessOverlay({ title = 'Pronto!', subtitle, duration = 1600, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duration)
    return () => clearTimeout(t)
  }, [duration, onDone])

  return (
    <div className="success-overlay" role="status" aria-live="polite">
      <div className="success-card">
        <span className="success-check-ring">
          <CheckCircle size={56} weight="fill" aria-hidden="true" />
        </span>
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </div>
  )
}
