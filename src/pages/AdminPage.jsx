import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { AdminLogin } from '../components/admin/AdminLogin.jsx'
import { AdminLayout } from '../components/admin/AdminLayout.jsx'
import { AdminReportsTable } from '../components/admin/AdminReportsTable.jsx'
import { AdminReportDetail } from '../components/admin/AdminReportDetail.jsx'
import { AdminTickets } from '../components/admin/AdminTickets.jsx'
import { AdminMetrics } from '../components/admin/AdminMetrics.jsx'
import OfficialDataStatus from '../components/admin/OfficialDataStatus.jsx'
import ExportPanel from '../components/admin/ExportPanel.jsx'

function currentSection() {
  const part = window.location.pathname.split('/')[2]
  return part || 'reports'
}

export function AdminPage() {
  const { session, isAdmin, signIn, signOut } = useAuth()
  const [section, setSection] = useState(currentSection)
  const [selectedReport, setSelectedReport] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)

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
      <main className="admin-login">
        <section className="modal-panel admin-login-panel">
          <h1>Sem permissão</h1>
          <p>Esta conta não possui role admin.</p>
          <button type="button" className="btn-secondary" onClick={signOut}>Sair</button>
        </section>
      </main>
    )
  }

  return (
    <AdminLayout section={section} onSectionChange={navigate} onSignOut={signOut}>
      {section === 'reports' && (
        <div className="admin-split">
          <AdminReportsTable onSelect={setSelectedReport} selectedId={selectedReport} />
          <AdminReportDetail
            reportId={selectedReport}
            onClose={() => setSelectedReport(null)}
            onOpenTickets={() => navigate('tickets')}
          />
        </div>
      )}
      {section === 'tickets' && <AdminTickets />}
      {section === 'metrics' && <AdminMetrics />}
      {section === 'official' && (
        <section className="admin-section">
          <OfficialDataStatus />
          <ExportPanel />
        </section>
      )}
    </AdminLayout>
  )
}
