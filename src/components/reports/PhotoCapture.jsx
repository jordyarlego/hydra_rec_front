import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImageSquare, X, Sparkle, Robot } from '@phosphor-icons/react'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'

export function PhotoCapture({ file, onChange, onAiSuggest }) {
  const inputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)
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

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  useEffect(() => stopCamera, [])

  async function openCamera() {
    setCameraError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      inputRef.current?.click()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 0)
    } catch {
      setCameraError('Câmera indisponível. Usando seletor de foto.')
      inputRef.current?.click()
    }
  }

  async function captureFrame() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      if (!blob) return
      const photo = new File([blob], `hydrarec-report-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onChange(photo)
      stopCamera()
    }, 'image/jpeg', 0.88)
  }

  function openPicker() {
    inputRef.current?.click()
  }

  // Mostra IA quando: tem descrição (mesmo se ai_used=false do fallback)
  const showAiLine = previewUrl && (aiLoading || aiAnalysis?.description || aiError)
  const aiCat = aiAnalysis?.suggested_type && CATEGORY_BY_ID[aiAnalysis.suggested_type]

  // ────────── EMPTY STATE: container inteiro vira CTA ──────────
  if (!file && !cameraOpen) {
    return (
      <>
        <button
          type="button"
          className="photo-capture photo-capture-empty"
          onClick={openCamera}
        >
          <span className="photo-empty-icon">
            <Camera size={36} weight="bold" aria-hidden="true" />
          </span>
          <strong>Adicionar foto</strong>
          <small>Toque pra abrir a câmera</small>
          <span
            className="photo-empty-alt"
            onClick={(e) => { e.stopPropagation(); openPicker() }}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); openPicker() } }}
          >
            <ImageSquare size={12} weight="bold" /> ou escolher da galeria
          </span>
        </button>
        {cameraError && <span className="photo-capture-error">{cameraError}</span>}
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

  // ────────── CAMERA OPEN ──────────
  if (cameraOpen) {
    return (
      <div className="photo-capture camera-mode">
        <video ref={videoRef} className="camera-preview" playsInline muted />
        <div className="camera-actions">
          <button type="button" className="btn btn-primary" onClick={captureFrame}>
            <Camera size={16} weight="bold" /> Capturar
          </button>
          <button type="button" className="btn btn-ghost" onClick={stopCamera} aria-label="Cancelar câmera">
            <X size={16} weight="bold" />
          </button>
        </div>
      </div>
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

      {cameraError && <span className="photo-capture-error">{cameraError}</span>}
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
