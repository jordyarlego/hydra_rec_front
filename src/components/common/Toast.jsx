import { useState, useCallback, useContext, createContext, useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from '@phosphor-icons/react'

/* ════════════════════════════════════════════════════
   Toast — sistema centralizado pra feedback de ação.
   Substitui o `floating-form-error` espalhado pelo App.jsx.

   USO:
     // No App root:
     const ToastProvider = useToastProvider()
     <ToastProvider>
       <App />
     </ToastProvider>

     // Em qualquer componente filho:
     const { push } = useToast()
     push({ kind: 'success', text: 'Report enviado!' })
   ════════════════════════════════════════════════════ */

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  const push = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2)
    setItems(s => [...s, { id, ...toast }])
    setTimeout(() => setItems(s => s.filter(t => t.id !== id)), toast.duration || 3200)
  }, [])

  const dismiss = useCallback((id) => {
    setItems(s => s.filter(t => t.id !== id))
  }, [])

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <ToastStack items={items} onDismiss={dismiss} />
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast precisa de <ToastProvider>')
  return ctx
}

function ToastStack({ items, onDismiss }) {
  return (
    <div className="toast-stack" role="region" aria-live="polite" aria-label="Notificações">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.kind || 'info'}`} role={t.kind === 'error' ? 'alert' : 'status'}>
          <span className="toast-icon">
            {t.kind === 'success' ? <CheckCircle size={18} weight="fill" />
             : t.kind === 'error' ? <XCircle size={18} weight="fill" />
             : <Info size={18} weight="bold" />}
          </span>
          <span className="toast-text">{t.text}</span>
          {t.dismissible !== false && (
            <button type="button" onClick={() => onDismiss(t.id)} aria-label="Fechar" style={{ color: 'inherit', opacity: .6, marginLeft: 8 }}>
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
