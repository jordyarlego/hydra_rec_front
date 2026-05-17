import { useState } from 'react'
import { useOfficialNearby } from '../../hooks/useOfficialNearby.js'
import { Buildings, CaretDown, CaretRight } from '@phosphor-icons/react'

/* ════════════════════════════════════════════════════
   OfficialNearbyCard — F8 HUD usuário.
   Mostra chamados oficiais da prefeitura abertos por perto
   (raio 500 m, últimos 30 dias). Loop cívico: cidadão
   vê que a cidade já tá em ação — não tá no escuro.
   ════════════════════════════════════════════════════ */

const CATEGORY_LABEL = {
  drenagem:     'Drenagem',
  pavimentacao: 'Tapa-buraco',
  iluminacao:   'Iluminação',
  lixo:         'Coleta de lixo',
  arborizacao:  'Poda / árvore',
  deslizamento: 'Risco de barreira',
  outro:        'Solicitação',
}

const STATUS_LABEL = {
  aberto:        { txt: 'em aberto',     tone: 'open' },
  em_andamento:  { txt: 'em atendimento', tone: 'doing' },
  concluido:     { txt: 'concluído',     tone: 'done' },
  cancelado:     { txt: 'cancelado',     tone: 'cancel' },
}

function inferStatus(raw) {
  if (!raw) return STATUS_LABEL.aberto
  const s = String(raw).toLowerCase()
  if (/conclu|finaliz|atendid|fechad|resolv/.test(s))    return STATUS_LABEL.concluido
  if (/andament|execu|servic|agendad|encaminhad/.test(s)) return STATUS_LABEL.em_andamento
  if (/cancel|indeferid/.test(s))                         return STATUS_LABEL.cancelado
  return STATUS_LABEL.aberto
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff) || diff < 0) return ''
  const d = Math.floor(diff / 86_400_000)
  if (d < 1) return 'hoje'
  if (d === 1) return 'ontem'
  if (d < 30) return `há ${d}d`
  const mo = Math.floor(d / 30)
  return `há ${mo}mês${mo > 1 ? 'es' : ''}`
}

function formatStreet(street, neighborhood) {
  const s = (street || '').trim()
  const b = (neighborhood || '').trim()
  if (s && b) return `${s}, ${b}`
  return s || b || 'Endereço não informado'
}

export function OfficialNearbyCard({ lat, lon }) {
  const [open, setOpen] = useState(true)
  const { data, loading, error } = useOfficialNearby(lat, lon, { radius: 500, days: 30 })

  if (loading && !data) return null
  if (error) return null
  if (!data || !data.data?.length) return null

  const items = data.data
  const total = data.total ?? items.length

  return (
    <div className="official-nearby-card" role="region" aria-label="Chamados oficiais por perto">
      <button
        type="button"
        className="official-nearby-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="official-nearby-title">
          <Buildings size={14} weight="bold" />
          <span>Prefeitura por perto</span>
        </span>
        <span className="official-nearby-count">
          {total} chamado{total > 1 ? 's' : ''} · 500 m
          {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
        </span>
      </button>

      {open && (
        <ul className="official-nearby-list">
          {items.slice(0, 5).map(item => {
            const cat = CATEGORY_LABEL[item.category] || CATEGORY_LABEL.outro
            const st = inferStatus(item.status)
            return (
              <li key={item.id} className="official-nearby-item">
                <div className="official-nearby-item-main">
                  <span className="official-nearby-cat">{cat}</span>
                  <span className="official-nearby-addr">
                    {formatStreet(item.street_name, item.neighborhood)}
                  </span>
                </div>
                <div className="official-nearby-meta">
                  <span className={`official-nearby-status status-${st.tone}`}>{st.txt}</span>
                  <span className="official-nearby-time">{timeAgo(item.opened_at)}</span>
                  <span className="official-nearby-dist">{item.distance_m}m</span>
                </div>
              </li>
            )
          })}
          {items.length > 5 && (
            <li className="official-nearby-more">
              + {items.length - 5} chamado{items.length - 5 > 1 ? 's' : ''} no raio
            </li>
          )}
        </ul>
      )}

      <p className="official-nearby-foot">
        Dados públicos da Prefeitura do Recife · últimos 30 dias
      </p>
    </div>
  )
}
