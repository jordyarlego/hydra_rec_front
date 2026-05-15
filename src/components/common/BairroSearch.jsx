import { useState, useRef, useEffect } from 'react'
import { BAIRROS } from '../../data/bairros.js'
import { soundMgr } from '../../lib/soundManager.js'

/* ════════════════════════════════════════════════════
   BairroSearch — autocomplete de bairro do Recife
   Mantém a mesma API do componente anterior:
     <BairroSearch value={bairro} onChange={setBairro} />
   ════════════════════════════════════════════════════ */

function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function BairroSearch({ value, onChange, placeholder = 'Buscar bairro...' }) {
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [focused, setFocused] = useState(0)
  const ref       = useRef(null)
  const inputRef  = useRef(null)

  const matches = query.length >= 1
    ? BAIRROS.filter(b => normalize(b).includes(normalize(query))).slice(0, 8)
    : []

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function select(b) {
    setQuery('')
    setOpen(false)
    soundMgr.playClick()
    onChange(b)
  }

  function handleKey(e) {
    if (!open || !matches.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocused(f => Math.min(f + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setFocused(f => Math.max(f - 1, 0)) }
    else if (e.key === 'Enter')     { e.preventDefault(); if (matches[focused]) select(matches[focused]) }
    else if (e.key === 'Escape')    { setOpen(false) }
  }

  const listboxId = 'bairro-listbox'

  return (
    <div className="bairro-search" ref={ref}>
      <div className="bairro-search-input-wrap">
        <svg className="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          className="bairro-search-input"
          value={query}
          placeholder={value || placeholder}
          aria-label="Buscar bairro de Recife"
          aria-autocomplete="list"
          aria-expanded={open && matches.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={open && matches[focused] ? `bairro-opt-${focused}` : undefined}
          onChange={e => { setQuery(e.target.value); setOpen(true); setFocused(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
        />
        {query && (
          <button
            type="button"
            className="search-clear"
            onClick={() => { setQuery(''); inputRef.current?.focus(); setOpen(false) }}
            aria-label="Limpar busca"
          >
            ✕
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <ul id={listboxId} className="bairro-search-list" role="listbox" aria-label="Bairros de Recife">
          {matches.map((b, i) => (
            <li
              key={b}
              id={`bairro-opt-${i}`}
              role="option"
              aria-selected={i === focused}
              className={`bairro-option ${i === focused ? 'focused' : ''}`}
              onMouseDown={() => select(b)}
              onMouseEnter={() => setFocused(i)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#e8a030" strokeWidth="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
