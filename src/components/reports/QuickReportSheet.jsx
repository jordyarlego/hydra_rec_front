import { useEffect, useMemo, useState } from 'react'
import { soundMgr } from '../../lib/soundManager.js'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import { api } from '../../lib/api.js'
import { CATEGORIES, CATEGORY_BY_ID } from '../../data/report_categories.js'
import { EmojiCategoryPicker } from './EmojiCategoryPicker.jsx'
import { PhotoCapture } from './PhotoCapture.jsx'
import { MapPin, PaperPlaneTilt, X } from '@phosphor-icons/react'

const MAX_DESCRIPTION = 140
const SEVERITIES = [
  ['leve', 'Leve'],
  ['moderado', 'Moderado'],
  ['grave', 'Grave'],
]
const SEV_BY_CATEGORY = { leve: 'leve', moderado: 'moderado', alto: 'grave', severo: 'grave' }

function inferCategory(weather) {
  const rain = Number(weather?.rain_1h_mm ?? weather?.rain_24h_mm ?? 0)
  if (rain >= 10) return 'alagamento'
  return null
}

const SOURCE_LABEL = {
  cemaden:         'CEMADEN',
  meteorologia24h: 'Estação Meteo',
  climatologico:   'Climatologia',
}

function rainLabel(rain) {
  if (rain == null) return null
  if (rain >= 30)   return 'Chuva severa'
  if (rain >= 10)   return 'Chuva forte'
  if (rain >= 2.5)  return 'Chuva moderada'
  if (rain >= 0.2)  return 'Chuva leve'
  return 'Sem chuva'
}

function freshnessLabel(captured_at) {
  if (!captured_at) return null
  const ts = new Date(captured_at)
  const diffMs = Date.now() - ts.getTime()
  if (Number.isNaN(diffMs)) return null
  const min = Math.floor(diffMs / 60000)
  if (min < 1)  return 'agora'
  if (min < 60) return `há ${min}min`
  return `há ${Math.floor(min / 60)}h`
}

function buildWeatherHint(weather) {
  if (!weather) return null
  const rain    = weather.rain_1h_mm
  const station = weather.station_name
  const source  = SOURCE_LABEL[weather.source] || 'APAC'
  const fresh   = freshnessLabel(weather.captured_at)
  const parts = []
  const label   = rainLabel(rain)

  if (rain != null) {
    parts.push(rain >= 0.2 ? `${label} (${Number(rain).toFixed(1)} mm/h)` : label)
  }
  if (station) parts.push(`Estação ${station} (${source})`)
  if (fresh)   parts.push(fresh)
  return parts.join(' · ')
}

export function QuickReportSheet({
  open,
  onClose,
  onSubmit,
  bairro,
  userLat,
  userLon,
  reportLat,
  reportLon,
}) {
  const [tipo, setTipo] = useState('alagamento')
  const [severidade, setSeveridade] = useState('moderado')
  const [descricao, setDescricao] = useState('')
  const [photo, setPhoto] = useState(null)
  const [weatherHint, setWeatherHint] = useState(null)
  const [assistantQuestion, setAssistantQuestion] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const trapRef = useFocusTrap(open, onClose)

  const canSubmit = userLat != null && userLon != null && reportLat != null && reportLon != null
  const locationLabel = useMemo(() => (
    reportLat != null && reportLon != null
      ? `${reportLat.toFixed(4)}, ${reportLon.toFixed(4)}`
      : 'Escolha um ponto no mapa'
  ), [reportLat, reportLon])

  useEffect(() => {
    if (!open) return
    setDescricao('')
    setPhoto(null)
    setError(null)
    setWeatherHint(null)
    setAssistantQuestion(null)
    setTipo('alagamento')
    setSeveridade('moderado')

    let cancelled = false
    if (reportLat != null && reportLon != null) {
      api.reportAssist(reportLat, reportLon)
        .then(data => {
          if (cancelled) return
          setAssistantQuestion(data.question || null)
          if (data.suggested_category && CATEGORY_BY_ID[data.suggested_category]) {
            const cat = CATEGORY_BY_ID[data.suggested_category]
            setTipo(cat.id)
            setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
          }
          const weather = data.weather || data
          const suggested = inferCategory(weather)
          if (suggested) {
            const cat = CATEGORY_BY_ID[suggested]
            setTipo(cat.id)
            setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
          }
          setWeatherHint(buildWeatherHint(weather))
        })
        .catch(() => {})
    }
    return () => { cancelled = true }
  }, [open, reportLat, reportLon])

  if (!open) return null

  function handleCategory(cat) {
    soundMgr.playClick()
    setTipo(cat.id)
    setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) {
      setError('Ative a localização e escolha um ponto no mapa.')
      return
    }
    setSubmitting(true)
    setError(null)
    soundMgr.playClick()
    try {
      const form = new FormData()
      form.append('tipo', tipo)
      form.append('severidade', severidade)
      form.append('lat', String(reportLat))
      form.append('lon', String(reportLon))
      form.append('user_lat', String(userLat))
      form.append('user_lon', String(userLon))
      if (bairro) form.append('bairro', bairro)
      if (descricao.trim()) form.append('descricao', descricao.trim())
      if (photo) form.append('photo', photo)
      await onSubmit(form, { lat: reportLat, lon: reportLon })
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function onOverlayClick(e) {
    if (e.target === e.currentTarget) onClose?.()
  }

  const selectedCategory = CATEGORY_BY_ID[tipo] || CATEGORY_BY_ID.outro

  return (
    <div className="modal-overlay quick-sheet-overlay" onClick={onOverlayClick}>
      <form
        ref={trapRef}
        className="modal-panel quick-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Reportar ocorrência"
        onSubmit={handleSubmit}
      >
        <header className="modal-header quick-sheet-header">
          <div className="quick-sheet-grabber" aria-hidden="true" />
          <div className="quick-sheet-title-wrap">
            <div>
              <h2 id="quick-report-title" className="modal-title">Novo report</h2>
              <div className="modal-subtitle">
                <MapPin size={12} weight="bold" aria-hidden="true" />
                {locationLabel}
              </div>
            </div>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
              <X size={17} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div className="quick-sheet-scroll">
          <section className="quick-section quick-section-hero">
            <div className="quick-category-summary" aria-live="polite">
              <span className="quick-category-icon" aria-hidden="true">
                <img src={selectedCategory.icon} alt="" draggable="false" />
              </span>
              <div>
                <span className="quick-category-kicker">Tipo selecionado</span>
                <strong>{selectedCategory.label}</strong>
              </div>
            </div>

            <EmojiCategoryPicker
              value={tipo}
              onChange={handleCategory}
              categories={CATEGORIES}
            />
          </section>

          <section className="quick-section">
            <span className="form-label">Registro visual</span>
            <PhotoCapture file={photo} onChange={setPhoto} />
          </section>

          <section className="quick-section">
            <span className="form-label">Severidade</span>
            <div className="severity-picker">
              {SEVERITIES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`severity-btn severity-${value}${severidade === value ? ' active' : ''}`}
                  onClick={() => setSeveridade(value)}
                >
                  <span className="severity-dot" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <label className="form-field quick-description-field">
            <span className="form-label">Descrição curta</span>
            <input
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder="Ex.: água cobrindo a faixa da direita"
              maxLength={MAX_DESCRIPTION}
            />
          </label>

          <div className="quick-context-row">
            {assistantQuestion && <div className="quick-assistant-question">{assistantQuestion}</div>}
            {weatherHint && (
              <div className="quick-weather-hint" title="Dados em tempo real APAC/CEMADEN">
                <span className="quick-weather-hint-badge">APAC</span>
                <span>{weatherHint}</span>
              </div>
            )}
          </div>

          {!canSubmit && <p className="form-error" role="alert">Localização do navegador necessária para enviar.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={submitting || !canSubmit}>
            <PaperPlaneTilt size={17} weight="bold" aria-hidden="true" />
            {submitting ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  )
}
