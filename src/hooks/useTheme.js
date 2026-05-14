import { useState, useEffect } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('hydrarec-theme') || 'dark'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('hydrarec-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}
