import { useEffect, useState } from 'react'
import OfficialCrossingPanel from './OfficialCrossingPanel.jsx'
import { CATEGORY_BY_ID } from '../../data/report_categories.js'
import { priorityLabel } from './adminLabels.js'
import {
  CheckCircle, Robot, X, Warning, XCircle, MagnifyingGlass,
  CloudRain, Buildings, Stack, MapPin,
} from '@phosphor-icons/react'
import { adminFetch, adminFetchJson } from '../../lib/adminFetch.js'
import { TicketCreateForm } from './TicketCreateForm.jsx'
import { useToast } from '../common/Toast.jsx'

/* ════════════════════════════════════════════════════
   AdminReportDetail v3 — DRAWER LATERAL DIREITO.
   Antes inline na lista. Agora overlay slide-in.
   Mesma lógica HTTP do v2.
   ════════════════════════════════════════════════════ */

function verdict(score) {
  if (score == null) return { label: 'Aguardando análise', tone: 'na', justification: 'A IA ainda está processando este report.' }
  const pct = Math.round(score * 100)
  if (score < 0.20) return { label: `Suspeito · ${pct}%`,          tone: 'suspeito',     justification: 'A IA não reconheceu um problema urbano na foto.' }
  if (score < 0.50) return { label: `Pouca evidência · ${pct}%`,   tone: 'inconclusivo', justification: 'Algumas pistas batem, mas faltam evidências fortes.' }
  if (score < 0.75) return { label: `Provavelmente real · ${pct}%`,tone: 'coerente',     justification: 'Foto, clima e descrição combinam — IA acha que é real.' }
  return                  { label: `Confirmado · ${pct}%`,         tone: 'alta',         justification: 'Foto urbana clara + clima compatível + dados oficiais reforçam.' }
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
  { key: 'duplicado',     label: 'Já tem outro report igual aqui' },
  { key: 'foto_invalida', label: 'Foto não mostra problema urbano' },
  { key: 'fora_escopo',   label: 'Fora do que a plataforma atende' },
  { key: 'trote',         label: 'Trote ou brincadeira' },
]

function formatRain(rain1h, rain24h) {
  const r1 = Number(rain1h), r24 = Number(rain24h)
  if (Number.isFinite(r1)  && r1  > 0) return `${r1.toFixed(1).replace('.', ',')} mm na última hora`
  if (Number.isFinite(r24) && r24 > 0) return `${r24.toFixed(1).replace('.', ',')} mm em 24h`
  return 'Não estava chovendo quando o report foi enviado.'
}

export function AdminReportDetail({ reportId, onClose, onChanged, onOpenTickets }) {
  const [report, setReport] = useState(null)
  const [duplicates, setDuplicates] = useState([])
  const [addressData, setAddressData] = useState(null)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('idle') // idle | validate | flag | reject
  const [flagNote, setFlagNote] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const toast = useToast()

  useEffect(() => {
    if (!reportId) {
      setReport(null); setDuplicates([]); setAddressData(null); setMode('idle')
      setError(null); setFlagNote(''); setRejectReason('')
      return
    }
    setError(null); setMode('idle'); setFlagNote(''); setRejectReason(''); setAddressData(null)

    adminFetchJson(`/api/admin/reports/${reportId}`)
      .then(setReport)
      .catch(err => setError(err.message))
    adminFetchJson(`/api/admin/reports/${reportId}/duplicates`)
      .then(d => setDuplicates(d.data || []))
      .catch(() => setDuplicates([]))
    adminFetchJson(`/api/admin/reports/${reportId}/address`)
      .then(setAddressData)
      .catch(() => setAddressData(null))
  }, [reportId])

  // Esc to close
  useEffect(() => {
    if (!reportId) return
    const h = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [reportId, onClose])

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
      toast.push({ kind: 'success', text: 'Enviado pra reanálise da equipe.' })
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  async function handleReject() {
    setError(null)
    if (!rejectReason) { setError('Escolha o motivo da rejeição.'); return }
    try {
      await patchReport({ status: 'rejected', bucket: 'filtrado', rejection_reason: rejectReason })
      setMode('idle')
      toast.push({ kind: 'success', text: 'Report rejeitado.' })
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  async function handleAggregate(ticketId) {
    setError(null)
    try {
      const res = await adminFetch(`/api/admin/reports/${reportId}/aggregate-to/${ticketId}`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.push({ kind: 'success', text: `Vinculado a #${ticketId.slice(0, 8)}.` })
      onChanged?.()
    } catch (e) { setError(e.message) }
  }

  function onTicketCreated(ticket) {
    setMode('idle')
    setReport(prev => prev ? { ...prev, ticket_id: ticket.id, status: 'validated' } : prev)
    toast.push({ kind: 'success', text: `Chamado #${ticket.id?.slice(0, 8)} criado!` })
    onChanged?.()
  }

  if (!report && error) {
    return (
      <div className="admin-detail-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <aside className="admin-detail-panel">
          <header className="admin-detail-head">
            <h2>Erro</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
              <X size={16} weight="bold" />
            </button>
          </header>
          <p className="form-error" role="alert">{error}</p>
        </aside>
      </div>
    )
  }
  if (!report) {
    return (
      <div className="admin-detail-overlay">
        <aside className="admin-detail-panel">
          <p style={{ padding: 24, color: 'var(--text-3)' }}>Carregando…</p>
        </aside>
      </div>
    )
  }

  const cat = CATEGORY_BY_ID[report.type] || CATEGORY_BY_ID.outro
  const priority = report.priority_result
  const v = verdict(report.ai_validation_score)
  const suggestedOrg = ORG_BY_TYPE[report.type] || 'OUTRO'
  const orgLabel = ORG_SHORT[suggestedOrg]
  const weather = report.weather
  const hasDup = duplicates.length > 0

  return (
    <div className="admin-detail-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <aside className="admin-detail-panel" role="dialog" aria-modal="true" aria-label="Detalhe do report">
        <header className="admin-detail-head">
          <div>
            <h2>Detalhe do report</h2>
            <p>3 caminhos: gerar chamado, pedir reanálise ou rejeitar.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={16} weight="bold" />
          </button>
        </header>

        <div className="admin-detail-scroll scroll-y">
          {report.photo_url && (
            <div className="admin-detail-photo" style={{ backgroundImage: `url(${report.photo_url})` }} role="img" aria-label="Foto do report" />
          )}

          {/* Heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src={cat.icon} alt="" style={{ width: 44, height: 44 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{report.bairro || 'Bairro não identificado'}</div>
              <strong style={{ fontSize: 18, fontWeight: 600 }}>{cat.label}</strong>
              <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                {report.created_at ? new Date(report.created_at).toLocaleString('pt-BR') : 'Sem data'}
              </div>
            </div>
            {priority && <span className={`priority-pill ${priority.priority}`}>{priorityLabel(priority.priority)}</span>}
          </div>

          {/* AI verdict box */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            padding: 16,
            background: 'var(--surface-2)',
            border: '1px solid var(--glass-stroke)',
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--brand-blue)' }}>
              <Robot size={16} weight="bold" />
              <strong style={{ fontSize: 13, letterSpacing: '.04em' }}>APOIO DA IA</strong>
            </div>
            <div className={`verdict-banner tone-${v.tone}`}>
              <strong>{v.label}</strong>
              <small>{v.justification}</small>
            </div>
            <div className="kv-grid">
              <span>Urgência sugerida</span>
              <strong>{priority ? `${priorityLabel(priority.priority)} · ${priority.score}/100` : 'Calculando…'}</strong>
              <span>Quem deve resolver</span>
              <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Buildings size={12} weight="bold" /> {orgLabel}
              </strong>
              <span>Apoio da comunidade</span>
              <strong>👍 {report.likes_up ?? 0} · 👎 {report.likes_down ?? 0}</strong>
            </div>
          </div>

          {report.description && (
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>"{report.description}"</p>
          )}

          {/* Endereço */}
          {addressData?.address?.full_address && (
            <div style={{ padding: 12, background: 'var(--surface-2)', border: '1px solid var(--glass-stroke)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
              <strong style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                <MapPin size={10} weight="bold" /> Endereço aproximado
              </strong>
              <div style={{ color: 'var(--text-2)' }}>
                {addressData.address.street
                  ? `${addressData.address.street}${addressData.address.number ? ', ' + addressData.address.number : ''}`
                  : addressData.address.full_address}
                {addressData.address.neighborhood && ` — ${addressData.address.neighborhood}`}
              </div>
              {addressData.landmarks?.length > 0 && (
                <div style={{ marginTop: 6, color: 'var(--text-3)' }}>
                  Próximo a: {addressData.landmarks.slice(0, 3).map(l => l.name).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Clima */}
          {weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--brand-blue-soft)', border: '1px solid rgba(109,184,255,.18)', borderRadius: 'var(--radius-md)', fontSize: 12 }}>
              <CloudRain size={16} weight="bold" style={{ color: 'var(--brand-blue)' }} />
              <span style={{ color: 'var(--text-2)' }}>
                <strong style={{ color: 'var(--text-1)' }}>{formatRain(weather.rain_1h_mm, weather.rain_24h_mm)}</strong>
                {weather.station_name && <> · estação {weather.station_name} (APAC)</>}
              </span>
            </div>
          )}

          {hasDup && (
            <div className="apac-banner" style={{ background: 'rgba(243,195,58,.08)', borderColor: 'rgba(243,195,58,.30)' }} role="alert">
              <Stack size={18} weight="bold" style={{ color: 'var(--risk-atencao)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ display: 'block', fontSize: 13 }}>Outro report parecido por perto</strong>
                <small style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  A {duplicates[0].distance_m}m daqui, mesmo tipo. Provavelmente é o mesmo problema.
                </small>
              </div>
              {duplicates[0].ticket_id && (
                <button type="button" className="btn btn-sm" onClick={() => handleAggregate(duplicates[0].ticket_id)}>
                  Juntar
                </button>
              )}
            </div>
          )}

          <OfficialCrossingPanel reportId={reportId} />

          {/* Decision area */}
          {error && <p className="form-error" role="alert">{error}</p>}

          {report.ticket_id ? (
            <div style={{ padding: 14, background: 'rgba(58,214,130,.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(58,214,130,.25)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <CheckCircle size={18} weight="fill" style={{ color: 'var(--risk-seguro)' }} />
              <span style={{ flex: 1 }}>Este report já tem chamado vinculado.</span>
              <button type="button" className="btn btn-sm btn-primary" onClick={onOpenTickets}>Ver em Chamados</button>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                O report fica numa lista <strong>"Para reanálise"</strong> visível pros outros analistas. Use quando você tem dúvida.
              </p>
              <div className="form-field">
                <label htmlFor="flag-note">Sua dúvida</label>
                <textarea
                  id="flag-note"
                  value={flagNote}
                  onChange={e => setFlagNote(e.target.value)}
                  rows={3}
                  placeholder="Ex: foto mostra a via mas não sei se ainda está alagada agora."
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setMode('idle')}>Cancelar</button>
                <button type="button" className="btn btn-warn" onClick={handleFlag} style={{ flex: 1 }}>Enviar pra reanálise</button>
              </div>
            </div>
          ) : mode === 'reject' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <fieldset className="form-field" style={{ border: 'none' }}>
                <legend style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>Motivo da rejeição</legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {REJECT_REASONS.map(r => (
                    <label key={r.key} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', padding: 10, borderRadius: 8, background: 'var(--glass-1)', border: '1px solid var(--glass-stroke)' }}>
                      <input
                        type="radio"
                        name="reject-reason"
                        value={r.key}
                        checked={rejectReason === r.key}
                        onChange={() => setRejectReason(r.key)}
                      />
                      <span style={{ fontSize: 13 }}>{r.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setMode('idle')}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={handleReject} style={{ flex: 1 }}>Confirmar rejeição</button>
              </div>
            </div>
          ) : (
            <div className="decision-stack">
              <button type="button" className="decision-btn decision-btn-validate" onClick={() => setMode('validate')}>
                <div className="decision-btn-icon"><CheckCircle size={20} weight="bold" /></div>
                <div className="decision-btn-content">
                  <strong>Aprovar e gerar chamado</strong>
                  <small>Confirma que é um problema real e cria um chamado pra equipe responsável</small>
                </div>
              </button>
              <button type="button" className="decision-btn decision-btn-flag" onClick={() => setMode('flag')}>
                <div className="decision-btn-icon"><MagnifyingGlass size={20} weight="bold" /></div>
                <div className="decision-btn-content">
                  <strong>Pedir reanálise da equipe</strong>
                  <small>Marca pra outro analista da equipe interna conferir antes de decidir</small>
                </div>
              </button>
              <button type="button" className="decision-btn decision-btn-reject" onClick={() => setMode('reject')}>
                <div className="decision-btn-icon"><XCircle size={20} weight="bold" /></div>
                <div className="decision-btn-content">
                  <strong>Rejeitar</strong>
                  <small>Descarta o report (você precisa escolher o motivo)</small>
                </div>
              </button>
            </div>
          )}

          {report.audit?.length > 0 && (
            <details style={{ fontSize: 12, color: 'var(--text-3)' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: 6 }}>Histórico</summary>
              {report.audit.map(item => (
                <p key={item.id} style={{ marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-2)' }}>{item.action}</span> · {new Date(item.created_at).toLocaleString('pt-BR')}
                </p>
              ))}
            </details>
          )}
        </div>
      </aside>
    </div>
  )
}
