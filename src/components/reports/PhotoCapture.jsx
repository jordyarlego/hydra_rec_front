import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImageSquare, X, Sparkle, Robot } from '@phosphor-icons/react'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'

/* PhotoCapture — sem getUserMedia/WebRTC.

   Em mobile o jeito certo é delegar pro app de câmera nativo via
   <input type="file" accept="image/*" capture="environment">. Isso:
     • Abre a câmera real do celular (Android + iOS), com UI nativa
     • Não exige permissão JavaScript extra
     • Não dá tela preta em PWA / Safari iOS / HTTP local
     • EXIF preservado (backend Pillow trata orientação)

   No desktop, o mesmo input vira seletor de arquivo padrão — esperado.
*/
export function PhotoCapture({ file, onChange, onAiSuggest }) {
  const inputRef = useRef(null)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file])

  // Dispara análise IA com debounce 1.5s + cache
  useEffect(() => {
    if (!file) {
      setAiAnalysis(null); setAiError(null); setAiLoading(false)
      return
    }

    // Cache key: usa só nome+tamanho. Cache só persiste sucesso real (description).
    const cacheKey = `${file.name}|${file.size}`
    const cached = sessionStorage.getItem(`hr_ai_photo_v2:${cacheKey}`)
    if (cached) {
      try {
        const data = JSON.parse(cached)
        // Só usa cache se tiver descrição válida
        if (data?.description) {
          setAiAnalysis(data)
          if (data.suggested_type && CATEGORY_BY_ID[data.suggested_type]) {
            onAiSuggest?.(data.suggested_type)
          }
          return
        }
      } catch { /* ignora */ }
    }

    let cancelled = false
    setAiLoading(true)
    setAiAnalysis(null)
    setAiError(null)

    // Debounce mais curto (800ms) — usuário fica menos esperando
    const debounceTimer = setTimeout(() => {
      if (cancelled) return
      const form = new FormData()
      form.append('photo', file)
      const startedAt = Date.now()
      fetch('/api/ai/describe-photo', { method: 'POST', body: form })
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        })
        .then(data => {
          if (cancelled) return
          console.info('[ai/describe-photo]', `${Date.now()-startedAt}ms`, data)
          // Só cacheia se tiver description (não cacheia "all_providers_failed")
          if (data?.description) {
            try { sessionStorage.setItem(`hr_ai_photo_v2:${cacheKey}`, JSON.stringify(data)) } catch {}
          }
          setAiAnalysis(data)
          if (data?.suggested_type && CATEGORY_BY_ID[data.suggested_type]) {
            onAiSuggest?.(data.suggested_type)
          }
        })
        .catch(err => {
          if (!cancelled) {
            console.warn('[ai/describe-photo] erro:', err)
            setAiError(err.message || 'IA indisponível')
            setAiAnalysis(null)
          }
        })
        .finally(() => { if (!cancelled) setAiLoading(false) })
    }, 800)

    return () => {
      cancelled = true
      clearTimeout(debounceTimer)
    }
  }, [file, onAiSuggest])

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  /* Abre câmera nativa do celular (ou seletor de arquivo no desktop).
     O atributo capture="environment" no <input> faz Android/iOS
     mostrarem a câmera traseira direto. */
  function openCamera() {
    inputRef.current?.click()
  }

  /* Versão sem capture pra escolher da galeria explicitamente. */
  function openPicker() {
    const el = inputRef.current
    if (!el) return
    const prev = el.getAttribute('capture')
    el.removeAttribute('capture')
    el.click()
    // Restaura capture pro próximo "abrir câmera"
    setTimeout(() => { if (prev) el.setAttribute('capture', prev) }, 200)
  }

  // Mostra IA quando: tem descrição (mesmo se ai_used=false do fallback)
  const showAiLine = previewUrl && (aiLoading || aiAnalysis?.description || aiError)
  const aiCat = aiAnalysis?.suggested_type && CATEGORY_BY_ID[aiAnalysis.suggested_type]

  // ────────── EMPTY STATE: container inteiro vira CTA ──────────
  if (!file) {
    return (
      <>
        <div className="photo-capture photo-capture-empty">
          <span className="photo-empty-icon">
            <Camera size={36} weight="bold" aria-hidden="true" />
          </span>
          <strong>Adicionar foto</strong>
          <small>Toque pra abrir a câmera</small>
          <button type="button" className="photo-empty-main" onClick={openCamera}>
            Abrir câmera
          </button>
          <button
            type="button"
            className="photo-empty-alt"
            onClick={(e) => { e.stopPropagation(); openPicker() }}
          >
            <ImageSquare size={12} weight="bold" /> ou escolher da galeria
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="photo-input"
          onChange={e => onChange(e.target.files?.[0] || null)}
        />
      </>
    )
  }

  // ────────── PREVIEW MODE ──────────
  return (
    <div className="photo-capture photo-capture-filled">
      <img className="photo-preview" src={previewUrl} alt="Prévia da foto do report" />

      {showAiLine && (
        <div className={`photo-ai-banner ${aiLoading ? 'is-loading' : ''} ${aiError ? 'is-error' : ''}`}>
          {aiLoading ? (
            <>
              <Sparkle size={13} weight="bold" className="ai-spin" />
              <span>IA analisando a foto…</span>
            </>
          ) : aiError ? (
            <>
              <X size={13} weight="bold" />
              <span>IA indisponível — você pode escolher a categoria manualmente</span>
            </>
          ) : aiAnalysis?.description ? (
            <>
              <Robot size={13} weight="bold" />
              <span>
                <strong>IA viu:</strong> {aiAnalysis.description}
                {aiCat && <> · sugere <strong>{aiCat.label}</strong></>}
              </span>
            </>
          ) : null}
        </div>
      )}

      <button
        type="button"
        className="photo-retake-btn"
        onClick={openCamera}
        aria-label="Trocar foto"
      >
        <ImageSquare size={14} weight="bold" /> Trocar
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="photo-input"
        onChange={e => onChange(e.target.files?.[0] || null)}
      />
    </div>
  )
}
