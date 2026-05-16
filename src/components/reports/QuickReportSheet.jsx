import { useEffect, useMemo, useState } from 'react'
import { soundMgr } from '../../lib/soundManager.js'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import { api } from '../../lib/api.js'
import { CATEGORIES, CATEGORY_BY_ID } from '../../data/report_categories.js'
import { EmojiCategoryPicker } from './EmojiCategoryPicker.jsx'
import { PhotoCapture } from './PhotoCapture.jsx'
import { SuccessOverlay } from '../common/SuccessOverlay.jsx'
import { MapPin, PaperPlaneTilt, X, ChatCircleText } from '@phosphor-icons/react'

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

function rainLabel(rain) {
  if (rain == null) return null
  if (rain >= 30)   return 'Chuva muito forte'
  if (rain >= 10)   return 'Chuva forte'
  if (rain >= 2.5)  return 'Chuva moderada'
  if (rain >= 0.2)  return 'Chuva fraca'
  return 'Sem chuva'
}

function freshnessLabel(captured_at) {
  if (!captured_at) return null
  const ts = new Date(captured_at)
  const diffMs = Date.now() - ts.getTime()
  if (Number.isNaN(diffMs)) return null
  const min = Math.floor(diffMs / 60000)
  // Acima de 1h a leitura é antiga demais pra ser útil como contexto do report
  if (min >= 60) return null
  if (min < 1)   return 'agora há pouco'
  return `há ${min} min`
}

function buildWeatherHint(weather) {
  if (!weather) return null
  const rain  = weather.rain_1h_mm
  const fresh = freshnessLabel(weather.captured_at)
  if (rain == null) return null
  const label = rainLabel(rain)
  const main  = rain >= 0.2 ? `${label} (${Number(rain).toFixed(1)} mm/h)` : label
  return fresh ? `${main} · ${fresh}` : main
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
  // Marca que o user mexeu manualmente — IA não sobrescreve depois disso
  const [tipoLocked, setTipoLocked] = useState(false)
  const [severidadeLocked, setSeveridadeLocked] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [photo, setPhoto] = useState(null)
  const [weatherHint, setWeatherHint] = useState(null)
  const [assistantQuestion, setAssistantQuestion] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
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
    setTipoLocked(false)
    setSeveridadeLocked(false)

    let cancelled = false
    if (reportLat != null && reportLon != null) {
      api.reportAssist(reportLat, reportLon)
        .then(data => {
          if (cancelled) return
          setAssistantQuestion(data.question || null)
          if (data.suggested_category && CATEGORY_BY_ID[data.suggested_category]) {
            const cat = CATEGORY_BY_ID[data.suggested_category]
            if (!tipoLocked)        setTipo(cat.id)
            if (!severidadeLocked)  setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
          }
          const weather = data.weather || data
          const suggested = inferCategory(weather)
          if (suggested) {
            const cat = CATEGORY_BY_ID[suggested]
            if (!tipoLocked)        setTipo(cat.id)
            if (!severidadeLocked)  setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
          }
          setWeatherHint(buildWeatherHint(weather))
        })
        .catch(() => {})
    }
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reportLat, reportLon])

  if (!open) return null

  function handleCategory(cat) {
    soundMgr.playClick()
    setTipo(cat.id)
    setTipoLocked(true)
    // Severidade sugerida pela categoria — só aplica se user ainda não mexeu
    if (!severidadeLocked) {
      setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
    }
  }

  function handleSeverityChange(value) {
    setSeveridade(value)
    setSeveridadeLocked(true)
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
      // Mostra overlay de sucesso e fecha modal só depois da animação
      setShowSuccess(true)
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
          {/* 1. O QUE VOCÊ ESTÁ VENDO — destaque máximo */}
          <section className="quick-section quick-section-prompt">
            <label className="form-field quick-description-field quick-description-hero">
              <span className="form-label form-label-hero">
                <ChatCircleText size={16} weight="bold" aria-hidden="true" />
                O que você está vendo?
              </span>
              <input
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value.slice(0, MAX_DESCRIPTION))}
                placeholder="Descreva em uma frase. Ex.: água cobrindo a faixa da direita."
                maxLength={MAX_DESCRIPTION}
                className="quick-description-input-hero"
                autoFocus
              />
              <small className="quick-description-hint">{descricao.length}/{MAX_DESCRIPTION}</small>
            </label>
            {assistantQuestion && <div className="quick-assistant-question">{assistantQuestion}</div>}
          </section>

          {/* 2. FOTO — IA já analisa enquanto preenche */}
          <section className="quick-section">
            <span className="form-label">Foto (opcional, mas ajuda muito)</span>
            <PhotoCapture
              file={photo}
              onChange={setPhoto}
              onAiSuggest={(typeId) => {
                const cat = CATEGORY_BY_ID[typeId]
                if (!cat) return
                // Respeita override manual do usuário
                if (!tipoLocked)       setTipo(cat.id)
                if (!severidadeLocked) setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
              }}
            />
          </section>

          {/* 3. CATEGORIA */}
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

          {/* 4. SEVERIDADE */}
          <section className="quick-section">
            <span className="form-label">O quão grave parece?</span>
            <div className="severity-picker">
              {SEVERITIES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`severity-btn severity-${value}${severidade === value ? ' active' : ''}`}
                  onClick={(e) => { try { e.currentTarget.blur() } catch {} ; handleSeverityChange(value) }}
                  aria-pressed={severidade === value}
                >
                  <span className="severity-dot" />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <div className="quick-context-row">
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

      {showSuccess && (
        <SuccessOverlay
          title="Report enviado!"
          subtitle="A IA já está analisando — você verá o pin no mapa em instantes."
          duration={1800}
          onDone={() => { setShowSuccess(false); onClose?.() }}
        />
      )}
    </div>
  )
}
