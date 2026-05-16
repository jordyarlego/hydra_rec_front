export function EmojiCategoryPicker({ value, onChange, categories }) {
  return (
    <div className="emoji-grid" role="radiogroup" aria-label="Tipo de ocorrência" tabIndex={0}>
      {categories.map(cat => (
        <button
          key={cat.id}
          type="button"
          className={`emoji-option${value === cat.id ? ' active' : ''}`}
          aria-pressed={value === cat.id}
          onClick={() => onChange(cat)}
        >
          <span className="emoji-option-art" aria-hidden="true">
            <img src={cat.icon} alt="" draggable="false" />
          </span>
          <span className="emoji-option-label">{cat.label}</span>
        </button>
      ))}
    </div>
  )
}
