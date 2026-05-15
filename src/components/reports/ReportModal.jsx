import { useEffect, useRef, useState } from 'react'
import { soundMgr } from '../../lib/soundManager.js'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'

/* ════════════════════════════════════════════════════
   ReportModal — modal pra criar nova ocorrência
   Combina ReportModal + ReportForm anteriores em um só.
   Props:
     open       bool
     onClose    () => void
     onSubmit   async (payload) => any
     bairro      string
     userLat/Lon number (GPS do usuário)
   ════════════════════════════════════════════════════ */

const TIPOS = [
  ['alagamento',        'Alagamento'],
  ['deslizamento',      'Deslizamento'],
  ['queda_arvore',      'Queda de árvore'],
  ['via_intransitavel', 'Via intransitável'],
  ['poste_caido',       'Poste caído'],
  ['outro',             'Outro'],
]

const SEVERIDADES = [
  ['leve',     'Leve'],
  ['moderado', 'Moderado'],
  ['grave',    'Grave'],
]

const SEV_COLOR = { leve: '#22c55e', moderado: '#f97316', grave: '#ef4444' }
const MAX_REPORT_DISTANCE_M = 1500

function distanceMeters(aLat, aLon, bLat, bLon) {
  const R = 6371000
  const dLat = (bLat - aLat) * Math.PI / 180
  const dLon = (bLon - aLon) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * Math.PI / 180) * Math.cos(bLat * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function useReportAddressSearch(query, enabled, userLat, userLon) {
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!enabled || !query || query.trim().length < 3 || userLat == null || userLon == null) {
      setSuggestions([])
      setSearching(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const q = /recife|pe\b/i.test(query) ? query : `${query}, Recife, PE`
        const params = new URLSearchParams({
          q,
          format: 'json',
          limit: '6',
          countrycodes: 'br',
          'accept-language': 'pt-BR,pt',
        })
        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          headers: { 'User-Agent': 'HydraRec/2.0 (TCC UFPE 2026; jordyarlego@gmail.com)' },
        })
        const data = await res.json()
        setSuggestions(data.map(item => {
          const lat = parseFloat(item.lat)
          const lon = parseFloat(item.lon)
          return {
            label: item.display_name
              .replace(/, Região Nordeste, Brasil$/, '')
              .replace(/, Brasil$/, '')
              .replace(/, Pernambuco,/, ','),
            lat,
            lon,
            distance: distanceMeters(userLat, userLon, lat, lon),
          }
        }))
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 450)

    return () => clearTimeout(timerRef.current)
  }, [enabled, query, userLat, userLon])

  return { suggestions, searching }
}

export function ReportModal({ open, onClose, onSubmit, bairro, userLat, userLon }) {
  const [tipo, setTipo]               = useState('alagamento')
  const [severidade, setSeveridade]   = useState('moderado')
  const [descricao, setDescricao]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState(null)
  const [locationMode, setLocationMode] = useState('current')
  const [addressQuery, setAddressQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [addressOpen, setAddressOpen] = useState(false)
  const { suggestions, searching } = useReportAddressSearch(addressQuery, open && locationMode === 'address', userLat, userLon)
  const trapRef = useFocusTrap(open, onClose)

  useEffect(() => {
    if (!open) return
    setLocationMode('current')
    setAddressQuery('')
    setError(null)
    setSelectedLocation(userLat != null && userLon != null
      ? { lat: userLat, lon: userLon, label: 'Minha localização atual', distance: 0 }
      : null)
  }, [open, userLat, userLon])

  if (!open) return null

  const hasGps = userLat != null && userLon != null
  const reportLat = selectedLocation?.lat
  const reportLon = selectedLocation?.lon
  const selectedDistance = hasGps && selectedLocation
    ? distanceMeters(userLat, userLon, selectedLocation.lat, selectedLocation.lon)
    : null
  const selectedTooFar = selectedDistance != null && selectedDistance > MAX_REPORT_DISTANCE_M

  function useCurrentLocation() {
    setLocationMode('current')
    setAddressOpen(false)
    setAddressQuery('')
    setError(null)
    if (hasGps) {
      setSelectedLocation({ lat: userLat, lon: userLon, label: 'Minha localização atual', distance: 0 })
    }
  }

  function useAddressLocation() {
    setLocationMode('address')
    setSelectedLocation(null)
    setError(null)
  }

  function handleAddressSelect(suggestion) {
    if (suggestion.distance > MAX_REPORT_DISTANCE_M) {
      setSelectedLocation(null)
      setError('Esse endereço está longe demais da sua localização atual. Use um ponto em até 1,5 km.')
      return
    }
    setSelectedLocation(suggestion)
    setAddressQuery(suggestion.label)
    setAddressOpen(false)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hasGps) {
      setError('Ative a localização do navegador para reportar uma ocorrência.')
      return
    }
    if (!selectedLocation || reportLat == null || reportLon == null) {
      setError('Escolha onde a ocorrência está acontecendo.')
      return
    }
    if (selectedTooFar) {
      setError('O report precisa estar a até 1,5 km da sua localização atual.')
      return
    }
    setSubmitting(true)
    setError(null)
    soundMgr.playClick()
    try {
      await onSubmit({
        tipo,
        severidade,
        lat: reportLat,
        lon: reportLon,
        user_lat: userLat,
        user_lon: userLon,
        bairro,
        descricao: descricao || undefined,
      })
      /* reset and close */
      setTipo('alagamento')
      setSeveridade('moderado')
      setDescricao('')
      onClose && onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function onOverlayClick(e) {
    if (e.target === e.currentTarget) onClose && onClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={onOverlayClick}
    >
      <form
        ref={trapRef}
        className="modal-panel report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        onSubmit={handleSubmit}
      >
        <header className="modal-header">
          <div>
            <h2 id="report-modal-title" className="modal-title">Reportar ocorrência</h2>
            <div className="modal-subtitle">
              {hasGps
                ? `GPS atual: ${userLat.toFixed(4)}, ${userLon.toFixed(4)}`
                : 'Localização necessária'}
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >✕</button>
        </header>

        {!hasGps && (
          <p className="form-error" role="alert">
            Permita o uso da localização para reportar. Isso evita marcações longe do local real.
          </p>
        )}

        <div className="report-location-panel">
          <span className="form-label">Local da ocorrência</span>
          <div className="report-location-toggle" role="group" aria-label="Local da ocorrência">
            <button
              type="button"
              className={`report-location-option${locationMode === 'current' ? ' active' : ''}`}
              onClick={useCurrentLocation}
              disabled={!hasGps}
            >
              Estou aqui
            </button>
            <button
              type="button"
              className={`report-location-option${locationMode === 'address' ? ' active' : ''}`}
              onClick={useAddressLocation}
              disabled={!hasGps}
            >
              Endereço próximo
            </button>
          </div>

          {locationMode === 'address' && (
            <div className="report-address-wrap">
              <input
                className="addr-input report-address-input"
                value={addressQuery}
                onChange={e => {
                  setAddressQuery(e.target.value)
                  setAddressOpen(true)
                  setSelectedLocation(null)
                  setError(null)
                }}
                onFocus={() => setAddressOpen(true)}
                placeholder="Rua, avenida ou ponto de referência próximo"
                autoComplete="off"
                spellCheck="false"
                disabled={!hasGps}
              />
              {addressOpen && (searching || suggestions.length > 0) && (
                <ul className="addr-suggestions report-address-suggestions" role="listbox">
                  {searching && <li className="addr-searching">Buscando endereço...</li>}
                  {!searching && suggestions.map((s, i) => {
                    const tooFar = s.distance > MAX_REPORT_DISTANCE_M
                    return (
                      <li
                        key={`${s.lat}-${s.lon}-${i}`}
                        className={`addr-suggestion report-address-suggestion${tooFar ? ' disabled' : ''}`}
                        role="option"
                        aria-disabled={tooFar}
                        onMouseDown={() => handleAddressSelect(s)}
                      >
                        <span>{s.label}</span>
                        <small>{(s.distance / 1000).toFixed(1)} km {tooFar ? '· longe demais' : ''}</small>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {selectedLocation && (
            <div className="report-location-summary">
              <strong>{selectedLocation.label}</strong>
              {selectedDistance != null && (
                <span>{selectedDistance < 20 ? 'no seu ponto atual' : `${(selectedDistance / 1000).toFixed(1)} km de você`}</span>
              )}
            </div>
          )}
        </div>

        <label className="form-field">
          <span className="form-label">Tipo</span>
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>

        <div className="form-field">
          <span className="form-label">Severidade</span>
          <div className="severity-picker">
            {SEVERIDADES.map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setSeveridade(v)}
                className={`severity-btn${severidade === v ? ' active' : ''}`}
                style={severidade === v
                  ? { background: `${SEV_COLOR[v]}26`, borderColor: SEV_COLOR[v], color: SEV_COLOR[v] }
                  : undefined}
              >
                <span className="severity-dot" style={{ background: SEV_COLOR[v] }} />
                {l}
              </button>
            ))}
          </div>
        </div>

        <label className="form-field">
          <span className="form-label">Descrição (opcional)</span>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={3}
            maxLength={280}
            placeholder="O que você está vendo?"
          />
        </label>

        {error && <p className="form-error" role="alert">{error}</p>}

        <div className="form-actions">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >Cancelar</button>
          <button
            type="submit"
            disabled={submitting || !hasGps || !selectedLocation || selectedTooFar}
            className="btn-primary"
          >
            {submitting ? 'Enviando...' : 'Enviar report'}
          </button>
        </div>
      </form>
    </div>
  )
}
