import { useState, useRef, useEffect } from 'react'
import { BAIRROS } from '../../data/bairros.js'

function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function BairroSearch({ value, onChange, placeholder = 'Buscar bairro…' }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const matches = query.length >= 1
    ? BAIRROS.filter(b => normalize(b).includes(normalize(query))).slice(0, 8)
    : []

  function select(bairro) {
    setQuery(bairro)
    setOpen(false)
    onChange(bairro)
  }

  function handleKey(e) {
    if (!open || !matches.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused(f => Math.min(f + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocused(f => Math.max(f - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matches[focused]) select(matches[focused])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Sync quando valor externo muda
  useEffect(() => { if (value !== query) setQuery(value || '') }, [value])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (!inputRef.current?.closest('.bairro-search')?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="bairro-search" role="combobox" aria-expanded={open} aria-haspopup="listbox">
      <div className="bairro-search-input-wrap">
        <svg className="search-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5"/>
          <path d="m10 10 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          className="bairro-search-input"
          value={query}
          placeholder={placeholder}
          aria-label="Buscar bairro de Recife"
          aria-autocomplete="list"
          aria-controls="bairro-search-list"
          onChange={e => { setQuery(e.target.value); setOpen(true); setFocused(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
        />
        {query && (
          <button
            className="search-clear"
            onClick={() => { setQuery(''); inputRef.current?.focus(); setOpen(false) }}
            aria-label="Limpar busca"
            type="button"
          >✕</button>
        )}
      </div>
      {open && matches.length > 0 && (
        <ul
          id="bairro-search-list"
          ref={listRef}
          className="bairro-search-list"
          role="listbox"
          aria-label="Bairros de Recife"
        >
          {matches.map((b, i) => (
            <li
              key={b}
              role="option"
              aria-selected={i === focused}
              className={`bairro-option ${i === focused ? 'focused' : ''}`}
              onMouseDown={() => select(b)}
              onMouseEnter={() => setFocused(i)}
            >
              <span className="option-pin">📍</span>
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
