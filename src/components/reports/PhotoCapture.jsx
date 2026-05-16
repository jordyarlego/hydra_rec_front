import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImageSquare, X, Sparkle } from '@phosphor-icons/react'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'

export function PhotoCapture({ file, onChange, onAiSuggest }) {
  const inputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file])

  // Dispara análise IA com debounce 1.5s + cache por (size, mtime, name)
  // pra não queimar tokens enquanto o usuário ainda está montando o report
  useEffect(() => {
    if (!file) {
      setAiAnalysis(null)
      return
    }

    // Cache key estável pelo arquivo (mesma foto = mesmo cache)
    const cacheKey = `${file.name}|${file.size}|${file.lastModified || ''}`
    const cached = sessionStorage.getItem(`hr_ai_photo:${cacheKey}`)
    if (cached) {
      try {
        const data = JSON.parse(cached)
        setAiAnalysis(data)
        if (data.suggested_type && CATEGORY_BY_ID[data.suggested_type]) {
          onAiSuggest?.(data.suggested_type)
        }
        return
      } catch { /* ignora cache ruim */ }
    }

    let cancelled = false
    setAiLoading(true)
    setAiAnalysis(null)

    // Debounce: só chama a IA depois de 1.5s sem trocar foto
    const debounceTimer = setTimeout(() => {
      if (cancelled) return
      const form = new FormData()
      form.append('photo', file)
      fetch('/api/ai/describe-photo', { method: 'POST', body: form })
        .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
        .then(data => {
          if (cancelled) return
          try { sessionStorage.setItem(`hr_ai_photo:${cacheKey}`, JSON.stringify(data)) } catch {}
          setAiAnalysis(data)
          if (data.suggested_type && CATEGORY_BY_ID[data.suggested_type]) {
            onAiSuggest?.(data.suggested_type)
          }
        })
        .catch(() => { if (!cancelled) setAiAnalysis(null) })
        .finally(() => { if (!cancelled) setAiLoading(false) })
    }, 1500)

    return () => {
      cancelled = true
      clearTimeout(debounceTimer)
    }
  }, [file, onAiSuggest])

  function stopCamera() {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
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
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 0)
    } catch {
      setCameraError('Não foi possível abrir a câmera. Use o seletor de foto.')
      inputRef.current?.click()
    }
  }

  async function captureFrame() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(blob => {
      if (!blob) return
      const photo = new File([blob], `hydrarec-report-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onChange(photo)
      stopCamera()
    }, 'image/jpeg', 0.88)
  }

  return (
    <div className="photo-capture">
      {cameraOpen ? (
        <div className="camera-panel">
          <video ref={videoRef} className="camera-preview" playsInline muted />
          <div className="camera-actions">
            <button type="button" className="btn-primary" onClick={captureFrame}>
              <Camera size={17} weight="bold" aria-hidden="true" />
              Capturar
            </button>
            <button type="button" className="btn-secondary" onClick={stopCamera} aria-label="Cancelar câmera">
              <X size={17} weight="bold" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : previewUrl ? (
        <div className="photo-preview-wrap">
          <img className="photo-preview" src={previewUrl} alt="Prévia da foto do report" />
        </div>
      ) : null}
      {previewUrl && aiLoading && (
        <div className="photo-ai-line photo-ai-line--loading">
          <Sparkle size={12} weight="bold" aria-hidden="true" />
          <span>Analisando a foto…</span>
        </div>
      )}
      {previewUrl && !aiLoading && aiAnalysis?.ai_used && aiAnalysis.description && (
        <div className="photo-ai-line">
          <Sparkle size={12} weight="bold" aria-hidden="true" />
          <span>
            {aiAnalysis.description}
            {aiAnalysis.suggested_type && CATEGORY_BY_ID[aiAnalysis.suggested_type] && (
              <span className="photo-ai-suggest">
                {' '}· sugerimos <strong>{CATEGORY_BY_ID[aiAnalysis.suggested_type].label}</strong>
              </span>
            )}
          </span>
        </div>
      )}
      <button
        type="button"
        className="btn-secondary photo-capture-btn"
        onClick={openCamera}
      >
        {file ? <ImageSquare size={18} weight="bold" aria-hidden="true" /> : <Camera size={18} weight="bold" aria-hidden="true" />}
        {file ? 'Trocar foto' : 'Tirar foto'}
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
