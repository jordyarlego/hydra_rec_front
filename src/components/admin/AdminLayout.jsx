import { HydraLogo } from '../effects/HydraLogo.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import { Siren, Ticket, ChartBar, Database, Sun, Moon, SignOut } from '@phosphor-icons/react'

/* ════════════════════════════════════════════════════
   AdminLayout v3 — sidebar Linear/Notion fixa 240px.
   Seções TRIAGEM e ANÁLISE. Counts inline. User card + theme + logout no rodapé.
   ════════════════════════════════════════════════════ */

const NAV = [
  { kind: 'section', label: 'TRIAGEM' },
  { id: 'reports',   label: 'Reports',        icon: Siren,    countKey: 'pendingReports' },
  { id: 'tickets',   label: 'Chamados',       icon: Ticket,   countKey: 'openTickets' },
  { kind: 'section', label: 'ANÁLISE' },
  { id: 'metrics',   label: 'Métricas',       icon: ChartBar },
  { id: 'official',  label: 'Bases oficiais', icon: Database },
]

export function AdminLayout({
  section,
  onSectionChange,
  onSignOut,
  user,
  counts = {},
  children,
}) {
  const { theme, toggle } = useTheme()
  const light = theme === 'light'

  const initials = (user?.name || 'Admin').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase()

  return (
    <main className={`admin-shell app-root ${light ? 'light' : 'dark'}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <HydraLogo size={28} showText />
        </div>

        <nav className="admin-nav" aria-label="Admin">
          {NAV.map((item, i) => {
            if (item.kind === 'section') return <div key={i} className="admin-nav-section">{item.label}</div>
            const Icon = item.icon
            const active = section === item.id
            const count = item.countKey ? counts[item.countKey] : undefined
            return (
              <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${active ? 'active' : ''}`}
                onClick={() => onSectionChange(item.id)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} weight={active ? 'bold' : 'regular'} />
                <span>{item.label}</span>
                {count != null && <span className="count">{count}</span>}
              </button>
            )
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user">
            <div className="admin-user-avatar">{initials}</div>
            <div className="admin-user-info">
              <strong>{user?.name || 'Administrador'}</strong>
              <small>{user?.role || 'admin'}</small>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button
              type="button"
              className="admin-nav-item"
              onClick={toggle}
              style={{ flex: 1 }}
              aria-label={light ? 'Tema escuro' : 'Tema claro'}
            >
              {light ? <Moon size={14} weight="bold" /> : <Sun size={14} weight="bold" />}
              <span>{light ? 'Escuro' : 'Claro'}</span>
            </button>
            <button
              type="button"
              className="admin-nav-item"
              onClick={onSignOut}
              style={{ flex: 1 }}
            >
              <SignOut size={14} weight="bold" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <section className="admin-content">{children}</section>
    </main>
  )
}
