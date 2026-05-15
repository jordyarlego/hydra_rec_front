import { useEffect, useRef } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useFocusTrap(active, onEscape) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active || !ref.current) return

    const el = ref.current
    const focusables = () => [...el.querySelectorAll(FOCUSABLE)]

    const previousFocus = document.activeElement
    focusables()[0]?.focus()

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onEscape?.()
        return
      }
      if (e.key !== 'Tab') return

      const items = focusables()
      if (!items.length) { e.preventDefault(); return }

      const first = items[0]
      const last  = items[items.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => {
      el.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [active, onEscape])

  return ref
}
