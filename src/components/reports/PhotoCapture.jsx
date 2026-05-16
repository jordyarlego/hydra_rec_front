import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ImageSquare, X } from '@phosphor-icons/react'

export function PhotoCapture({ file, onChange }) {
  const inputRef = useRef(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : null, [file])

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
