import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'

const LS_KEY = 'hr_onboarding_v1_done'

const STEPS = [
  {
    title: 'Bem-vindo ao HydraRec',
    body: 'Um mapa cívico do Recife: você vê o risco climático do seu bairro em tempo real e reporta o que tá errado na rua.',
  },
  {
    title: 'Hydra Score',
    body: 'É um número de 0 a 100 que combina chuva, maré, vulnerabilidade do bairro e o alerta oficial da APAC. Quanto maior, maior o risco agora.',
  },
  {
    title: 'O mapa mostra tudo',
    body: 'Cada pin é um report da galera. A borda mostra a gravidade: verde (leve), laranja (moderado), vermelho (grave). Use o filtro de categorias se quiser ver só um tipo (buraco, lixo, etc).',
  },
  {
    title: 'Reporte sem fazer login',
    body: 'Clica em "Reportar" embaixo, escolhe o que tá acontecendo, tira foto. Anônimo, leva 20 segundos. Você é notificado quando a prefeitura agir.',
  },
]

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(LS_KEY)) {
        // Atrasa 1.2s pra não brigar com splash
        const t = setTimeout(() => setOpen(true), 1200)
        return () => clearTimeout(t)
      }
    } catch { /* localStorage bloqueado — não força tour */ }
  }, [])

  function close() {
    setOpen(false)
    try { localStorage.setItem(LS_KEY, '1') } catch { /* noop */ }
  }

  function next() {
    if (step >= STEPS.length - 1) close()
    else setStep(s => s + 1)
  }

  function prev() {
    setStep(s => Math.max(0, s - 1))
  }

  if (!open) return null
  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-title"
    >
      <div className="onboarding-card">
        <button
          type="button"
          className="onboarding-skip"
          onClick={close}
          aria-label="Pular tour"
        >
          <X size={14} weight="bold" />
        </button>

        <div className="onboarding-stepper" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
            />
          ))}
        </div>

        <h2 id="onb-title" className="onboarding-title">{current.title}</h2>
        <p className="onboarding-body">{current.body}</p>

        <div className="onboarding-actions">
          {step > 0 && (
            <button type="button" className="onboarding-btn-ghost" onClick={prev}>
              Voltar
            </button>
          )}
          <button type="button" className="onboarding-btn-skip" onClick={close}>
            Pular
          </button>
          <button type="button" className="onboarding-btn-primary" onClick={next}>
            {isLast ? 'Começar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
