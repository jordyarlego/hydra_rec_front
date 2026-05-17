import { useEffect, useMemo, useState } from 'react'
import { soundMgr } from '../../lib/soundManager.js'
import { useFocusTrap } from '../../hooks/useFocusTrap.js'
import { api } from '../../lib/api.js'
import { CATEGORIES, CATEGORY_BY_ID } from '../../data/report_categories.js'
import { CategoryGrid } from './CategoryGrid.jsx'
import { PhotoCapture } from './PhotoCapture.jsx'
import { useToast } from '../common/Toast.jsx'
import { MapPin, PaperPlaneTilt, X, Check, Robot, CloudRain } from '@phosphor-icons/react'

/* ════════════════════════════════════════════════════
   QuickReportSheet v3 — single-screen, GRID 3×3, IA inline.

   Diferenças do v2:
   • UMA pergunta principal — sem "assistantQuestion" duplicada
   • Categorias em GRID 3×3 fixo (NÃO scroll horizontal)
   • Quando a IA escolhe uma categoria, a tile pulsa com glow azul
     (anima 1.2s e dissipa, via classe `.ai-picked` + chave de
     reset `aiPulseKey`)
   • Severidade em pílulas
   • Submit: spinner → check → fecha + toast no parent
   ════════════════════════════════════════════════════ */

const MAX_DESCRIPTION = 140
const SEVERITIES = [
  ['leve',     'Leve'],
  ['moderado', 'Moderado'],
  ['grave',    'Grave'],
]
const SEV_BY_CATEGORY = { leve: 'leve', moderado: 'moderado', alto: 'grave', severo: 'grave' }

function inferCategory(weather) {
  const rain = Number(weather?.rain_1h_mm ?? weather?.rain_24h_mm ?? 0)
  if (rain >= 10) return 'alagamento'
  return null
}

function buildWeatherHint(weather) {
  if (!weather) return null
  const rain = weather.rain_1h_mm
  if (rain == null) return null
  if (rain >= 30) return `Chuva muito forte — ${Number(rain).toFixed(1)} mm/h pela APAC`
  if (rain >= 10) return `Chuva forte — ${Number(rain).toFixed(1)} mm/h pela APAC`
  if (rain >= 2.5) return `Chuva moderada — ${Number(rain).toFixed(1)} mm/h pela APAC`
  if (rain >= 0.2) return `Chuva leve — ${Number(rain).toFixed(1)} mm/h pela APAC`
  return null
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
  const [tipoLocked, setTipoLocked] = useState(false)
  const [severidade, setSeveridade] = useState('moderado')
  const [severidadeLocked, setSeveridadeLocked] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [photo, setPhoto] = useState(null)
  const [weatherHint, setWeatherHint] = useState(null)
  const [aiSuggestion, setAiSuggestion] = useState(null) // {category, source: 'photo'|'rain'}
  const [aiPulseKey, setAiPulseKey] = useState(0)        // re-mount glow ring on each AI pick
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)
  const trapRef = useFocusTrap(open, onClose)
  const toast = useToast()

  const canSubmit = userLat != null && userLon != null && reportLat != null && reportLon != null
  const locationLabel = useMemo(() => (
    reportLat != null && reportLon != null
      ? `${bairro || ''} · ${reportLat.toFixed(4)}, ${reportLon.toFixed(4)}`
      : 'Escolha um ponto no mapa'
  ), [reportLat, reportLon, bairro])

  // Reset when modal opens
  useEffect(() => {
    if (!open) return
    setDescricao(''); setPhoto(null); setError(null)
    setWeatherHint(null); setAiSuggestion(null); setAiPulseKey(0)
    setTipo('alagamento'); setSeveridade('moderado')
    setTipoLocked(false); setSeveridadeLocked(false)
    setSubmitting(false); setDone(false)

    let cancelled = false
    if (reportLat != null && reportLon != null) {
      api.reportAssist(reportLat, reportLon)
        .then(data => {
          if (cancelled) return
          // Sugestão server-side baseada em chuva
          if (data.suggested_category && CATEGORY_BY_ID[data.suggested_category] && !tipoLocked) {
            const cat = CATEGORY_BY_ID[data.suggested_category]
            setTipo(cat.id)
            if (!severidadeLocked) setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
            setAiSuggestion({ category: cat.id, source: 'rain' })
            setAiPulseKey(k => k + 1)
          } else {
            const w = data.weather || data
            const suggested = inferCategory(w)
            if (suggested && !tipoLocked) {
              const cat = CATEGORY_BY_ID[suggested]
              setTipo(cat.id)
              if (!severidadeLocked) setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
              setAiSuggestion({ category: cat.id, source: 'rain' })
              setAiPulseKey(k => k + 1)
            }
          }
          setWeatherHint(buildWeatherHint(data.weather || data))
        })
        .catch(() => {})
    }
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reportLat, reportLon])

  if (!open) return null

  // User clica manual → desliga locked AI pulse pra não re-pular
  const handleCategoryClick = (cat) => {
    soundMgr.playClick()
    setTipo(cat.id)
    setTipoLocked(true)
    setAiSuggestion(null)
    if (!severidadeLocked) setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
  }

  const handleSeverity = (v) => {
    setSeveridade(v)
    setSeveridadeLocked(true)
  }

  // Foto + AI: dispara animação na tile escolhida
  const handlePhotoAi = (typeId) => {
    const cat = CATEGORY_BY_ID[typeId]
    if (!cat) return
    setAiSuggestion({ category: cat.id, source: 'photo' })
    if (!tipoLocked) {
      setTipo(cat.id)
      setAiPulseKey(k => k + 1)
    }
    if (!severidadeLocked) setSeveridade(SEV_BY_CATEGORY[cat.sev] || 'moderado')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) { setError('Ative a localização e escolha um ponto no mapa.'); return }
    setSubmitting(true); setError(null); soundMgr.playClick()
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
      setDone(true)
      toast.push({ kind: 'success', text: 'Report enviado. O pin já entrou no mapa e vai para triagem.' })
      setTimeout(() => onClose?.(), 650)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <form
        ref={trapRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Reportar ocorrência"
        onSubmit={handleSubmit}
      >
        <div className="modal-grabber" aria-hidden="true" />
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Novo report</h2>
            <div className="modal-subtitle">
              <MapPin size={11} weight="bold" aria-hidden="true" />
              <span>{locationLabel}</span>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={15} weight="bold" />
          </button>
        </div>

        <div className="modal-body scroll-y">
          {/* 1. DESCRIÇÃO — pergunta única */}
          <div className="form-field">
            <label htmlFor="report-desc" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)' }}>
              O que você está vendo?
            </label>
            <input
              id="report-desc"
              autoFocus
              type="text"
              value={descricao}
              onChange={e => setDescricao(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder="Em uma frase. Ex: rua alagada na faixa da direita"
              maxLength={MAX_DESCRIPTION}
              style={{ height: 52, fontSize: 15 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-4)' }}>
              <span>{descricao.length}/{MAX_DESCRIPTION}</span>
              <span>Quanto mais claro, melhor a IA classifica</span>
            </div>
          </div>

          {/* 2. FOTO + IA inline */}
          <div className="form-field">
            <label>Foto (opcional, mas ajuda muito a IA)</label>
            <PhotoCapture file={photo} onChange={setPhoto} onAiSuggest={handlePhotoAi} />
          </div>

          {/* 3. CATEGORIA — grid 3×3 com badge "Sugerido pela IA" */}
          <div className="form-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <label style={{ margin: 0 }}>Categoria</label>
              {aiSuggestion && (
                <span className="ai-pill" aria-live="polite">
                  <span className="dot" />
                  <Robot size={12} weight="bold" />
                  Sugerido pela IA
                </span>
              )}
            </div>
            <CategoryGrid
              value={tipo}
              onChange={handleCategoryClick}
              categories={CATEGORIES}
              aiPickedId={aiSuggestion?.category}
              aiPulseKey={aiPulseKey}
            />
          </div>

          {/* 4. SEVERIDADE */}
          <div className="form-field">
            <label>O quão grave parece?</label>
            <div className="severity-row">
              {SEVERITIES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`severity-pill ${severidade === value ? 'active' : ''}`}
                  data-sev={value}
                  onClick={() => handleSeverity(value)}
                  aria-pressed={severidade === value}
                >
                  <span className="dot" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. CONTEXTO APAC */}
          {weatherHint && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              background: 'var(--brand-blue-soft)',
              border: '1px solid rgba(109,184,255,.18)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
            }}>
              <CloudRain size={18} weight="bold" style={{ color: 'var(--brand-blue)' }} />
              <span style={{ color: 'var(--text-2)' }}>{weatherHint}</span>
            </div>
          )}

          {!canSubmit && <p className="form-error" role="alert">Localização do navegador necessária para enviar.</p>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={submitting || done || !canSubmit} style={{ flex: 2 }}>
            {done ? (
              <><Check size={16} weight="bold" /> Enviado</>
            ) : submitting ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'hr-spin .8s linear infinite' }}>
                  <circle cx="12" cy="12" r="9" strokeOpacity=".25" />
                  <path d="M21 12a9 9 0 0 1-9 9" />
                </svg>
                Enviando…
              </>
            ) : (
              <><PaperPlaneTilt size={15} weight="bold" /> Enviar report</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
