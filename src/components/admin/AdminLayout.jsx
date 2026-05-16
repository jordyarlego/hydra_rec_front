import { HydraLogo } from '../effects/HydraLogo.jsx'
import { ChartBar, Database, SignOut, Siren, Ticket } from '@phosphor-icons/react'

const NAV = [
  ['reports', 'Triagem', Siren],
  ['tickets', 'Chamados', Ticket],
  ['metrics', 'Painel', ChartBar],
  ['official', 'Bases oficiais', Database],
]

export function AdminLayout({ section, onSectionChange, onSignOut, children }) {
  return (
    <main className="admin-page">
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
        <button type="button" className="admin-signout" onClick={onSignOut}>
          <SignOut size={18} weight="bold" aria-hidden="true" />
          Sair
        </button>
      </aside>
      <section className="admin-content">{children}</section>
    </main>
  )
}
