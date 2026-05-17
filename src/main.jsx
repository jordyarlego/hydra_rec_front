import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './components/common/Toast.jsx'
import './styles/globals.css'

const AdminPage = lazy(() => import('./pages/AdminPage.jsx').then(mod => ({ default: mod.AdminPage })))

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      const checkForUpdate = () => reg.update().catch(() => {})
      setInterval(checkForUpdate, 15 * 60 * 1000)

      window.addEventListener('focus', checkForUpdate)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })

      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return
        refreshing = true
        window.location.reload()
      })

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
    }).catch(err => {
      console.error('[SW] falha ao registrar /sw.js:', err)
    })
  })
} else if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then(registrations => registrations.forEach(registration => registration.unregister()))
    .catch(() => {})
}

const Root = window.location.pathname.startsWith('/admin') ? AdminPage : App

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Suspense fallback={null}>
      <ToastProvider>
        <Root />
      </ToastProvider>
    </Suspense>
  </React.StrictMode>
)
