import { useEffect, useState } from 'react'
import OfficialCrossingPanel from './OfficialCrossingPanel.jsx'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'
import { priorityLabel } from './adminLabels.js'
import {
  CheckCircle, Robot, X, Warning, XCircle, MagnifyingGlass,
  CloudRain, Buildings, Stack,
} from '@phosphor-icons/react'
import { adminFetch, adminFetchJson } from '../../lib/adminFetch.js'
import { TicketCreateForm } from './TicketCreateForm.jsx'
import { SuccessOverlay } from '../common/SuccessOverlay.jsx'

// ───── Helpers UI ────────────────────────────────────────────────────
function verdict(score) {
  if (score == null) {
    return { label: 'Aguardando análise', tone: 'na', justification: 'A IA ainda está processando este report.' }
  }
  const pct = Math.round(score * 100)
  if (score < 0.20) {
    return {
      label: `Suspeito · ${pct}%`,
      tone: 'suspeito',
      justification: 'A IA não reconheceu um problema urbano na foto, ou a foto está difícil de identificar.',
    }
  }
  if (score < 0.50) {
    return {
      label: `Pouca evidência · ${pct}%`,
      tone: 'inconclusivo',
      justification: 'Algumas pistas batem, mas faltam evidências fortes pra confirmar.',
    }
  }
  if (score < 0.75) {
    return {
      label: `Provavelmente real · ${pct}%`,
      tone: 'coerente',
      justification: 'Foto, clima e descrição combinam — IA acha que é um problema real.',
    }
  }
  return {
    label: `Confirmado · ${pct}%`,
    tone: 'alta',
    justification: 'Foto urbana clara + clima compatível + dados oficiais reforçam o report.',
  }
}

const ORG_SHORT = {
  EMLURB_DRENAGEM:     'EMLURB · Drenagem',
  EMLURB_ARBORIZACAO:  'EMLURB · Arborização',
  EMLURB_PAVIMENTACAO: 'EMLURB · Pavimentação',
  EMLURB_LIMPEZA:      'EMLURB · Limpeza Urbana',
  CELPE:               'Celpe / Neoenergia',
  DEFESA_CIVIL:        'Defesa Civil',
  OUTRO:               'A definir',
}

const ORG_BY_TYPE = {
  alagamento:        'EMLURB_DRENAGEM',
  queda_arvore:      'EMLURB_ARBORIZACAO',
  poste_caido:       'CELPE',
  iluminacao:        'CELPE',
  buraco:            'EMLURB_PAVIMENTACAO',
  lixo:              'EMLURB_LIMPEZA',
  deslizamento:      'DEFESA_CIVIL',
  via_intransitavel: 'EMLURB_PAVIMENTACAO',
  outro:             'OUTRO',
}

const REJECT_REASONS = [
  { key: 'duplicado',    label: 'Já tem outro report igual aqui' },
  { key: 'foto_invalida', label: 'Foto não mostra problema urbano' },
  { key: 'fora_escopo',  label: 'Fora do que a plataforma atende' },
  { key: 'trote',        label: 'Trote ou brincadeira' },
]

function formatRain(rain1h, rain24h) {
  const r1 = Number(rain1h)
  const r24 = Number(rain24h)
  if (Number.isFinite(r1) && r1 > 0) return `${r1.toFixed(1).replace('.', ',')} mm de chuva na última hora`
  if (Number.isFinite(r24) && r24 > 0) return `${r24.toFixed(1).replace('.', ',')} mm de chuva nas últimas 24h`
  return 'Não estava chovendo quando o report foi enviado.'
}

// ───── Componente ────────────────────────────────────────────────────
export function AdminReportDetail({ reportId, onClose, onChanged, onOpenTickets }) {
  const [report, setReport] = useState(null)
  const [duplicates, setDuplicates] = useState([])
  const [addressData, setAddressData] = useState(null)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  // Estado de fluxos
  const [mode, setMode] = useState('idle') // idle | validate | flag | reject
  const [flagNote, setFlagNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [success, setSuccess] = useState(null) // {title, subtitle} | null

  useEffect(() => {
    if (!reportId) {
      setReport(null); setDuplicates([]); setAddressData(null); setMode('idle')
      setError(null); setMessage(null)
      setFlagNote(''); setRejectReason('')
      return
    }
    setError(null); setMessage(null)
    setMode('idle')
    setFlagNote(''); setRejectReason('')
    setAddressData(null)

    adminFetchJson(`/api/admin/reports/${reportId}`)
      .then(data => setReport(data))
      .catch(err => setError(err.message))

    // Duplicates + endereço em paralelo — falhas silenciosas
    adminFetchJson(`/api/admin/reports/${reportId}/duplicates`)
      .then(d => setDuplicates(d.data || []))
      .catch(() => setDuplicates([]))
    adminFetchJson(`/api/admin/reports/${reportId}/address`)
      .then(setAddressData)
      .catch(() => setAddressData(null))
  }, [reportId])

  if (!reportId) return null

  async function patchReport(payload) {
    const res = await adminFetch(`/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}))
      throw new Error(detail.detail || `HTTP ${res.status}`)
    }
  }

  async function handleFlag() {
    setError(null)
    if (!flagNote.trim() || flagNote.trim().length < 8) {
      setError('Descreva sua dúvida (no mínimo 8 caracteres).')
      return
    }
    try {
      await patchReport({ status: 'flagged', ai_validation_notes: flagNote, bucket: 'revisar' })
      setMode('idle')
      setSuccess({ title: 'Enviado pra reanálise', subtitle: 'A equipe vai ver sua dúvida e decidir.' })
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  async function handleReject() {
    setError(null)
    if (!rejectReason) {
      setError('Escolha o motivo da rejeição.')
      return
    }
    try {
      await patchReport({
        status: 'rejected',
        bucket: 'filtrado',
        rejection_reason: rejectReason,
      })
      setMode('idle')
      setSuccess({ title: 'Report rejeitado', subtitle: 'Foi tirado da fila e marcado como inválido.' })
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  async function handleAggregate(ticketId) {
    setError(null)
    try {
      const res = await adminFetch(`/api/admin/reports/${reportId}/aggregate-to/${ticketId}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSuccess({ title: 'Juntado ao chamado existente', subtitle: `Vinculado a #${ticketId.slice(0, 8)}.` })
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  function onTicketCreated(ticket) {
    setMode('idle')
    setReport(prev => prev ? { ...prev, ticket_id: ticket.id, status: 'validated' } : prev)
    setSuccess({
      title: 'Chamado criado!',
      subtitle: `#${ticket.id?.slice(0, 8) || ''} foi gerado. Ele aparece agora na aba Chamados.`,
    })
    onChanged?.()
  }

  if (!report && error) {
    return (
      <aside className="admin-detail">
        <header className="admin-detail-head">
          <div><h2>Triagem do report</h2></div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={17} weight="bold" aria-hidden="true" />
          </button>
        </header>
        <p className="form-error" role="alert">{error}</p>
      </aside>
    )
  }
  if (!report) {
    return (
      <aside className="admin-detail">
        <p>Carregando…</p>
      </aside>
    )
  }

  const cat = CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro
  const priority = report.priority_result
  const v = verdict(report.ai_validation_score)
  const suggestedOrg = ORG_BY_TYPE[report.type] || 'OUTRO'
  const orgLabel = ORG_SHORT[suggestedOrg] || 'A definir'
  const weather = report.weather
  const hasDuplicates = duplicates.length > 0

  return (
    <aside className="admin-detail">
      <header className="admin-detail-head">
        <div>
          <h2>Detalhe do report</h2>
          <p>Você tem 3 caminhos: gerar um chamado, pedir reanálise da equipe, ou rejeitar.</p>
        </div>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
          <X size={17} weight="bold" aria-hidden="true" />
        </button>
      </header>

      {report.photo_url && <img className="admin-report-photo" src={report.photo_url} alt="Foto do report" />}

      <div className="admin-detail-hero">
        <img src={cat.icon} alt="" aria-hidden="true" />
        <div>
          <span>{report.bairro || 'Bairro não identificado'}</span>
          <strong>{cat.label}</strong>
          <small>{report.created_at ? new Date(report.created_at).toLocaleString('pt-BR') : 'Sem data'}</small>
        </div>
      </div>

      {/* Card "Apoio da IA" reformulado */}
      <div className="admin-ai-box">
        <div className="admin-ai-title">
          <Robot size={18} weight="bold" aria-hidden="true" />
          Apoio da IA
        </div>
        <div className={`verdict-banner verdict-${v.tone}`}>
          <strong>{v.label}</strong>
          <small>{v.justification}</small>
        </div>
        <div className="admin-ai-grid">
          <span>Urgência sugerida</span>
          <strong>{priority ? `${priorityLabel(priority.priority)} · ${priority.score}/100` : 'Calculando…'}</strong>
          <span>Quem deve resolver</span>
          <strong className="org-suggestion">
            <Buildings size={14} weight="bold" aria-hidden="true" /> {orgLabel}
          </strong>
          <span>Apoio da comunidade</span>
          <strong>👍 {report.likes_up ?? 0}  👎 {report.likes_down ?? 0}</strong>
        </div>
      </div>

      {report.description && <p className="admin-description">{report.description}</p>}

      {/* Endereço resolvido (Nominatim) + pontos de referência */}
      {addressData?.address?.full_address && (
        <div className="admin-address-card">
          <strong>📍 Endereço aproximado</strong>
          <span>
            {addressData.address.street
              ? `${addressData.address.street}${addressData.address.number ? ', ' + addressData.address.number : ''}`
              : addressData.address.full_address}
            {addressData.address.neighborhood && ` — ${addressData.address.neighborhood}`}
          </span>
          {addressData.landmarks?.length > 0 && (
            <div className="admin-landmarks">
              <small>Pontos de referência por perto:</small>
              <ul>
                {addressData.landmarks.slice(0, 3).map((l, i) => (
                  <li key={i}><strong>{l.name}</strong> <em>({l.kind})</em></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {weather && (
        <p className="admin-weather">
          <CloudRain size={14} weight="bold" aria-hidden="true" />
          {' '}{formatRain(weather.rain_1h_mm, weather.rain_24h_mm)}
          {weather.station_name && (
            <> · estação {weather.station_name} (APAC)</>
          )}
        </p>
      )}

      {/* Banner de duplicata acima dos botões */}
      {hasDuplicates && (
        <div className="dup-banner" role="alert">
          <Stack size={18} weight="bold" aria-hidden="true" />
          <div>
            <strong>Outro report parecido por perto</strong>
            <small>
              A {duplicates[0].distance_m}m daqui, do mesmo tipo, enviado{' '}
              {duplicates[0].created_at
                ? new Date(duplicates[0].created_at).toLocaleString('pt-BR')
                : 'há pouco tempo'}. Provavelmente é o mesmo problema.
            </small>
          </div>
          {duplicates[0].ticket_id ? (
            <button
              type="button"
              className="btn-secondary btn-mini"
              onClick={() => handleAggregate(duplicates[0].ticket_id)}
            >
              Juntar ao chamado existente
            </button>
          ) : (
            <small className="dup-no-ticket">(ainda sem chamado aberto)</small>
          )}
        </div>
      )}

      <OfficialCrossingPanel reportId={reportId} />

      {/* Bloco de decisão — feedback ao lado dos botões */}
      <section className="decision-block">
        {error && <p className="form-error" role="alert">{error}</p>}
        {message && <p className="admin-success" role="status">{message}</p>}

        {report.ticket_id ? (
          <div className="admin-ticket-linked">
            <CheckCircle size={16} weight="bold" aria-hidden="true" />
            Este report já tem chamado vinculado.
            <button type="button" className="btn-primary btn-mini" onClick={onOpenTickets}>
              Ver em Chamados
            </button>
          </div>
        ) : mode === 'validate' ? (
          <TicketCreateForm
            reportId={reportId}
            suggestedOrg={suggestedOrg}
            suggestedPriority={priority?.priority || 'media'}
            reportType={report.type}
            onCreated={onTicketCreated}
            onCancel={() => setMode('idle')}
          />
        ) : mode === 'flag' ? (
          <div className="decision-form">
            <p className="decision-form-help">
              O report fica numa lista <strong>"Para reanálise"</strong> visível pros outros analistas da plataforma. Use quando você tem dúvida e quer um segundo olhar antes de gerar chamado.
            </p>
            <label className="form-field">
              <span className="form-label">Sua dúvida (será vista por quem fizer a reanálise)</span>
              <textarea
                value={flagNote}
                onChange={e => setFlagNote(e.target.value)}
                rows={3}
                placeholder="Ex.: foto mostra a via mas não sei se ainda está alagada agora."
                autoFocus
              />
            </label>
            <div className="decision-actions">
              <button type="button" className="btn-secondary btn-mini" onClick={() => setMode('idle')}>Cancelar</button>
              <button type="button" className="btn-primary btn-warn" onClick={handleFlag}>Enviar pra reanálise</button>
            </div>
          </div>
        ) : mode === 'reject' ? (
          <div className="decision-form">
            <fieldset className="form-field reject-fieldset">
              <legend className="form-label">Motivo da rejeição</legend>
              {REJECT_REASONS.map(r => (
                <label key={r.key} className="reject-radio">
                  <input
                    type="radio"
                    name="reject-reason"
                    value={r.key}
                    checked={rejectReason === r.key}
                    onChange={() => setRejectReason(r.key)}
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <div className="decision-actions">
              <button type="button" className="btn-secondary btn-mini" onClick={() => setMode('idle')}>Cancelar</button>
              <button type="button" className="btn-primary btn-danger" onClick={handleReject}>Confirmar rejeição</button>
            </div>
          </div>
        ) : (
          <div className="decision-buttons">
            <button
              type="button"
              className="btn-decision btn-decision-validate"
              onClick={() => setMode('validate')}
              title="Confirma que é um problema real e cria um chamado pra equipe responsável"
            >
              <CheckCircle size={18} weight="bold" aria-hidden="true" />
              Aprovar e gerar chamado
            </button>
            <button
              type="button"
              className="btn-decision btn-decision-flag"
              onClick={() => setMode('flag')}
              title="Marca pra outro analista da equipe interna conferir antes de decidir"
            >
              <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
              Pedir reanálise da equipe
            </button>
            <button
              type="button"
              className="btn-decision btn-decision-reject"
              onClick={() => setMode('reject')}
              title="Descarta o report (você precisa escolher o motivo)"
            >
              <XCircle size={18} weight="bold" aria-hidden="true" />
              Rejeitar
            </button>
          </div>
        )}
      </section>

      {report.audit?.length > 0 && (
        <div className="admin-audit">
          <h3>Histórico</h3>
          {report.audit.map(item => (
            <p key={item.id}><span>{item.action}</span> {new Date(item.created_at).toLocaleString('pt-BR')}</p>
          ))}
        </div>
      )}

      {success && (
        <SuccessOverlay
          title={success.title}
          subtitle={success.subtitle}
          duration={1600}
          onDone={() => setSuccess(null)}
        />
      )}
    </aside>
  )
}
