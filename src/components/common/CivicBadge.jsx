import { Medal } from '@phosphor-icons/react'

/* ════════════════════════════════════════════════════
   CivicBadge — gamificação leve.
   Mostra "tier" (Cidadão atento, Sentinela, Guardião) +
   contador de reports validados + próximo nível.

   API (mocked no v3 — TODO backend):
     count: number   // reports validados pelo admin
     tier:  string   // calculado a partir de count

   Sugestão de tiers:
     0–4   → "Cidadão observador"
     5–14  → "Cidadão atento"
     15–39 → "Sentinela"
     40+   → "Guardião"
   ════════════════════════════════════════════════════ */

const TIERS = [
  { min: 0,   label: 'Cidadão observador', next: 5  },
  { min: 5,   label: 'Cidadão atento',     next: 15 },
  { min: 15,  label: 'Sentinela',          next: 40 },
  { min: 40,  label: 'Guardião',           next: null },
]

function getTier(count) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (count >= TIERS[i].min) return TIERS[i]
  }
  return TIERS[0]
}

export function CivicBadge({ count = 0 }) {
  const tier = getTier(count)
  const remaining = tier.next != null ? tier.next - count : 0
  return (
    <div className="civic-badge">
      <div className="civic-badge-icon" aria-hidden="true">
        <Medal size={20} weight="bold" />
      </div>
      <div className="civic-badge-info">
        <strong>{tier.label}</strong>
        <span>
          {count} {count === 1 ? 'report validado' : 'reports validados'}
          {remaining > 0 && ` · próximo nível em ${remaining}`}
        </span>
      </div>
    </div>
  )
}
