import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('hydrarec-theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('hydrarec-theme', theme)
    // CSS atual usa .app-root.light em ~200 lugares — sincroniza
    // classes nos elementos altos pra evitar texto preto em fundo escuro.
    const targets = [
      document.documentElement,
      document.body,
      document.querySelector('.app-root'),
      document.querySelector('.admin-page'),
    ].filter(Boolean)
    for (const el of targets) {
      el.classList.toggle('light', theme === 'light')
      el.classList.toggle('dark', theme === 'dark')
      if (!el.classList.contains('app-root')) {
        el.classList.add('app-root')
      }
    }
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}
