import { Moon, Sun } from '@phosphor-icons/react'
import { BairroSearch } from '../common/BairroSearch.jsx'

export function Sidebar({ bairro, setBairro, theme, toggleTheme }) {
  const isDark = theme === 'dark'

  return (
    <aside className="sidebar" aria-label="Navegação de bairros">
      <div className="sidebar-logo">
        <span className="logo-mark" aria-hidden="true">H</span>
        <span className="logo-text">HydraRec</span>
        <span className="logo-version">v2</span>
      </div>

      <div className="sidebar-search-wrap">
        <span className="sidebar-label">Bairro monitorado</span>
        <BairroSearch value={bairro} onChange={setBairro} />
        <span className="sidebar-current">{bairro}, Recife — PE</span>
      </div>

      <nav className="sidebar-nav">
        <a href="#main-content" className="nav-item active">
          <span className="nav-icon">◈</span> Mapa
        </a>
        <a href="#route" className="nav-item">
          <span className="nav-icon">◎</span> Trajeto
        </a>
        <a href="#ai" className="nav-item">
          <span className="nav-icon">◆</span> IA
        </a>
      </nav>

      <div className="sidebar-footer">
        <button onClick={toggleTheme} className="theme-toggle" aria-label={`Mudar para tema ${isDark ? 'claro' : 'escuro'}`}>
          {isDark ? <Sun size={14} weight="bold" /> : <Moon size={14} weight="bold" />}
          <span>{isDark ? 'Tema claro' : 'Tema escuro'}</span>
        </button>
      </div>
    </aside>
  )
}
