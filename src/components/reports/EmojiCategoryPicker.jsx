export function EmojiCategoryPicker({ value, onChange, categories }) {
  function handleClick(cat, e) {
    // Em touch devices o :hover fica grudado depois do toque, dando
    // aparência de "dois ícones ativos". Remover foco resolve.
    try { e.currentTarget.blur() } catch {}
    onChange(cat)
  }
  return (
    <div className="emoji-grid" role="radiogroup" aria-label="Tipo de ocorrência" tabIndex={0}>
      {categories.map(cat => {
        const active = value === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            className={`emoji-option${active ? ' active' : ''}`}
            aria-pressed={active}
            role="radio"
            aria-checked={active}
            onClick={(e) => handleClick(cat, e)}
          >
            <span className="emoji-option-art" aria-hidden="true">
              <img src={cat.icon} alt="" draggable="false" />
            </span>
            <span className="emoji-option-label">{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}
