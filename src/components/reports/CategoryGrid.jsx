import { useState } from 'react'

/* CategoryGrid v3 — substitui o EmojiCategoryPicker do v2.
   GRID 3×3 fixo (sem scroll horizontal — todas as 9 categorias
   visíveis na mesma tela). Quando a IA escolhe uma, dispara
   animação "ai-picked" (pop + glow azul) na tile escolhida.

   Props:
     value       — id da categoria ativa
     onChange    — callback(cat) ao clicar manual (locka)
     categories  — array de 9 categorias
     aiPickedId  — id da categoria escolhida pela IA pela última vez.
                   Triggera animação. Reset pra null quando o user
                   clica manual (pra não re-pular).
     aiPulseKey  — número que muda toda vez que a IA re-sugere
                   (force re-mount do glow ring).
*/

export function CategoryGrid({ value, onChange, categories, aiPickedId, aiPulseKey }) {
  return (
    <div className="category-grid">
      {categories.map(c => {
        const active = value === c.id
        const aiPicked = aiPickedId === c.id && active
        return (
          <button
            key={c.id}
            type="button"
            className={`category-tile-grid ${active ? 'active' : ''} ${aiPicked ? 'ai-picked' : ''}`}
            onClick={() => onChange(c)}
            aria-pressed={active}
            data-pulse-key={aiPicked ? aiPulseKey : undefined}
          >
            {aiPicked && <span className="ai-glow" key={aiPulseKey} aria-hidden="true" />}
            <img src={c.icon} alt="" draggable="false" />
            <span>{c.label}</span>
          </button>
        )
      })}
    </div>
  )
}
