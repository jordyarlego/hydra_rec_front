import { HydraLogo } from '../effects/HydraLogo.jsx'
import { ChartBar, Database, SignOut, Siren, Ticket, Sun, Moon } from '@phosphor-icons/react'
import { useTheme } from '../../hooks/useTheme.js'

const NAV = [
  ['reports', 'Triagem', Siren],
  ['tickets', 'Chamados', Ticket],
  ['metrics', 'Painel', ChartBar],
  ['official', 'Bases oficiais', Database],
]

export function AdminLayout({ section, onSectionChange, onSignOut, children }) {
  const { theme, toggle } = useTheme()
  return (
    <main className={`admin-page app-root ${theme === 'light' ? 'light' : 'dark'}`}>
      <aside className="admin-sidebar">
        <HydraLogo size={30} showText />
        <nav className="admin-nav" aria-label="Admin">
          {NAV.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className={`admin-nav-item${section === id ? ' active' : ''}`}
              onClick={() => onSectionChange(id)}
            >
              <Icon size={18} weight="bold" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Mudar pra tema claro' : 'Mudar pra tema escuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? <Sun size={16} weight="bold" /> : <Moon size={16} weight="bold" />}
            <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
          </button>
          <button type="button" className="admin-signout" onClick={onSignOut}>
            <SignOut size={16} weight="bold" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>
      <section className="admin-content">{children}</section>
    </main>
  )
}
