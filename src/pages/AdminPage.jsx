import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { AdminLogin } from '../components/admin/AdminLogin.jsx'
import { AdminLayout } from '../components/admin/AdminLayout.jsx'
import { AdminMobile } from '../components/admin/AdminMobile.jsx'
import { AdminReportsTable } from '../components/admin/AdminReportsTable.jsx'
import { AdminReportDetail } from '../components/admin/AdminReportDetail.jsx'
import { AdminTickets } from '../components/admin/AdminTickets.jsx'
import { AdminOpsDashboard } from '../components/admin/AdminOpsDashboard.jsx'
import { AdminMetrics } from '../components/admin/AdminMetrics.jsx'
import OfficialDataStatus from '../components/admin/OfficialDataStatus.jsx'
import OfficialDataCoverage from '../components/admin/OfficialDataCoverage.jsx'
import ExportPanel from '../components/admin/ExportPanel.jsx'

function useIsMobile(breakpoint = 720) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= breakpoint)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

function currentSection() {
  const part = window.location.pathname.split('/')[2]
  return part || 'ops'
}

export function AdminPage() {
  const { session, user, isAdmin, signIn, signOut } = useAuth()
  const [section, setSection] = useState(currentSection)
  const [selectedReport, setSelectedReport] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const isMobile = useIsMobile(720)

  useEffect(() => {
    const onPop = () => setSection(currentSection())
    const onExpired = () => setSessionExpired(true)
    window.addEventListener('popstate', onPop)
    window.addEventListener('hydrarec-auth-expired', onExpired)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hydrarec-auth-expired', onExpired)
    }
  }, [])

  function navigate(next) {
    setSection(next)
    window.history.pushState({}, '', `/admin/${next}`)
  }

  if (!session || sessionExpired) {
    return (
      <>
        {sessionExpired && (
          <div className="admin-toast admin-toast-warning" role="alert">
            Sessão expirada — faça login novamente.
          </div>
        )}
        <AdminLogin onSignIn={async (...args) => {
          const r = await signIn(...args)
          setSessionExpired(false)
          return r
        }} />
      </>
    )
  }
  if (!isAdmin) {
    return (
      <main className="admin-login-stage">
        <section className="admin-login-card">
          <h1>Sem permissão</h1>
          <p>Esta conta não possui role admin.</p>
          <button type="button" className="btn btn-ghost" onClick={signOut}>Sair</button>
        </section>
      </main>
    )
  }

  // Mobile: usa AdminMobile (drawer hamburger, layout vertical)
  if (isMobile) {
    return (
      <AdminMobile
        user={{ name: user?.email || 'Administrador', role: 'admin' }}
        onSignOut={signOut}
      />
    )
  }

  return (
    <AdminLayout
      section={section}
      onSectionChange={navigate}
      onSignOut={signOut}
      user={{ name: user?.email || 'Administrador', role: 'admin' }}
    >
      {section === 'ops' && <AdminOpsDashboard />}
      {section === 'reports' && (
        <>
          <AdminReportsTable onSelect={setSelectedReport} selectedId={selectedReport} />
          <AdminReportDetail
            reportId={selectedReport}
            onClose={() => setSelectedReport(null)}
            onOpenTickets={() => navigate('tickets')}
            onChanged={() => setSelectedReport(null)}
          />
        </>
      )}
      {section === 'tickets' && <AdminTickets />}
      {section === 'metrics' && <AdminMetrics />}
      {section === 'official' && (
        <section className="admin-section">
          <OfficialDataCoverage />
          <OfficialDataStatus />
          <ExportPanel />
        </section>
      )}
    </AdminLayout>
  )
}
