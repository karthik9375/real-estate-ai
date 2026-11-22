import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarCheck, House, LayoutDashboard, Menu, UserPlus, Users } from 'lucide-react'
import { api } from '../services/api'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/leads/new', label: 'Add New Lead', icon: UserPlus },
  { to: '/followups', label: 'Follow-ups', icon: CalendarCheck, badge: 'followups' },
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const [health, setHealth] = useState(null)
  const [dueCount, setDueCount] = useState(0)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  // Backend/AI status and due follow-up count, refreshed on navigation
  useEffect(() => {
    let cancelled = false
    api.health()
      .then((h) => !cancelled && setHealth(h))
      .catch(() => !cancelled && setHealth({ status: 'down' }))
    Promise.all([api.listFollowups({ bucket: 'overdue' }), api.listFollowups({ bucket: 'today' })])
      .then(([o, t]) => !cancelled && setDueCount(o.length + t.length))
      .catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname, location.key])

  const statusText = !health
    ? 'Checking backend...'
    : health.status !== 'ok'
      ? 'Backend unreachable'
      : health.ai_configured
        ? `AI ready - ${health.model}`
        : 'AI key not configured'
  const statusOk = health?.status === 'ok' && health.ai_configured

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-logo"><House size={18} /></div>
          <div>
            <div className="brand-name">EstateIQ</div>
            <div className="brand-sub">AI Lead Management</div>
          </div>
        </div>
        <nav className="nav">
          <div className="nav-label">Workspace</div>
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => {
                // "Leads" stays active on lead detail pages, but not on "Add New Lead"
                if (to === '/leads') return isActive && location.pathname !== '/leads/new' ? 'active' : ''
                return isActive ? 'active' : ''
              }}
            >
              <Icon size={17} /> {label}
              {badge === 'followups' && dueCount > 0 && <span className="nav-count" title="Overdue or due today">{dueCount}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className={`status-dot ${health ? (statusOk ? 'ok' : 'bad') : ''}`} />
          {statusText}
        </div>
      </aside>
      <div className={`sidebar-backdrop ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="brand-name">EstateIQ</div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
