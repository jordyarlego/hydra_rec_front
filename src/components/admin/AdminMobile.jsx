import { useState } from 'react'
import { HydraLogo } from '../effects/HydraLogo.jsx'
import { useTheme } from '../../hooks/useTheme.js'
import { Siren, Ticket, ChartBar, Database, Sun, Moon, SignOut, List, ArrowsClockwise, MapTrifold } from '@phosphor-icons/react'
import { AdminReportsTable } from './AdminReportsTable.jsx'
import { AdminReportDetail } from './AdminReportDetail.jsx'
import { AdminTickets } from './AdminTickets.jsx'
import { AdminOpsDashboard } from './AdminOpsDashboard.jsx'
import { AdminMetrics } from './AdminMetrics.jsx'

/* ════════════════════════════════════════════════════
   AdminMobile — versão mobile-first do admin.

   Estrutura:
   • Top bar: hamburger + título + refresh
   • Drawer nav (slide-in da esquerda): mesmas seções
     da sidebar desktop (TRIAGEM + ANÁLISE)
   • Body: components admin já existentes, mas com layout
     adaptado via media queries em app-v3.css:
        - bucket-grid → 1 coluna
        - kanban-board → 1 coluna por vez (com chip selector)
        - metrics-grid → 2 colunas
        - admin-detail-panel → width 100%
   • Detalhe vira overlay full-screen (usa AdminReportDetail)

   IMPORTANTE: este componente é um WRAPPER em volta dos
   componentes admin desktop. Não duplica lógica — só ajusta
   navegação pra contexto mobile.
   ════════════════════════════════════════════════════ */

const NAV = [
  { kind: 'section', label: 'OPERAÇÃO' },
  { id: 'ops',       label: 'Mapa central',   icon: MapTrifold },
  { kind: 'section', label: 'TRIAGEM' },
  { id: 'reports',   label: 'Reports',        icon: Siren },
  { id: 'tickets',   label: 'Chamados',       icon: Ticket },
  { kind: 'section', label: 'ANÁLISE' },
  { id: 'metrics',   label: 'Métricas',       icon: ChartBar },
  { id: 'official',  label: 'Bases oficiais', icon: Database },
]

const SECTION_LABEL = {
  ops: 'Operação',
  reports: 'Triagem',
  tickets: 'Chamados',
  metrics: 'Métricas',
  official: 'Bases oficiais',
}

export function AdminMobile({ user, onSignOut, counts = {} }) {
  const [section, setSection] = useState('ops')
  const [detailId, setDetailId] = useState(null)
  const [navOpen, setNavOpen] = useState(false)
  const { theme, toggle } = useTheme()
  const light = theme === 'light'

  const refresh = () => window.location.reload() // simple — real impl would re-invoke load()

  return (
    <main className={`admin-shell-mobile ${light ? 'light' : 'dark'} app-root`}>
      <header className="admin-mobile-bar">
        <button type="button" className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Abrir menu">
          <List size={16} weight="bold" />
        </button>
        <h1>{SECTION_LABEL[section]}</h1>
        <button type="button" className="icon-btn" onClick={refresh} aria-label="Atualizar">
          <ArrowsClockwise size={14} weight="bold" />
        </button>
      </header>

      <div className="admin-mobile-content scroll-y">
        {section === 'ops' && <AdminOpsDashboard />}
        {section === 'reports' && (
          <AdminReportsTable onSelect={setDetailId} selectedId={detailId} />
        )}
        {section === 'tickets'  && <AdminTickets />}
        {section === 'metrics'  && <AdminMetrics />}
        {section === 'official' && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
            <Database size={40} weight="bold" />
            <p style={{ marginTop: 12 }}>Painel de bases oficiais (EMLURB, Defesa Civil).</p>
            <small>Importação CSV/GeoJSON · status última atualização · cobertura por bairro</small>
          </div>
        )}
      </div>

      {/* Drawer nav */}
      {navOpen && (
        <div className="admin-mobile-drawer" onClick={e => e.target === e.currentTarget && setNavOpen(false)}>
          <aside>
            <div style={{ marginBottom: 24 }}><HydraLogo size={28} showText light={light} /></div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }} aria-label="Admin">
              {NAV.map((item, i) => {
                if (item.kind === 'section') return <div key={i} className="admin-nav-section">{item.label}</div>
                const Icon = item.icon
                const active = section === item.id
                const count = counts[item.id]
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-nav-item ${active ? 'active' : ''}`}
                    onClick={() => { setSection(item.id); setNavOpen(false); setDetailId(null) }}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={16} weight={active ? 'bold' : 'regular'} />
                    <span>{item.label}</span>
                    {count != null && <span className="count">{count}</span>}
                  </button>
                )
              })}
            </nav>
            <div style={{ paddingTop: 16, borderTop: '1px solid var(--glass-stroke)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div className="admin-user">
                <div className="admin-user-avatar">{(user?.name || 'Admin').slice(0, 2).toUpperCase()}</div>
                <div className="admin-user-info">
                  <strong>{user?.name || 'Administrador'}</strong>
                  <small>{user?.role || 'admin'}</small>
                </div>
              </div>
              <button type="button" className="admin-nav-item" onClick={toggle}>
                {light ? <Moon size={14} weight="bold" /> : <Sun size={14} weight="bold" />}
                <span>{light ? 'Tema escuro' : 'Tema claro'}</span>
              </button>
              <button type="button" className="admin-nav-item" onClick={onSignOut}>
                <SignOut size={14} weight="bold" />
                <span>Sair</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Detail panel — overlay full-screen no mobile */}
      {detailId && <AdminReportDetail reportId={detailId} onClose={() => setDetailId(null)} />}
    </main>
  )
}
