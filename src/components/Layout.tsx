import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ArrowLeftRight,
  LayoutDashboard,
  LineChart,
  LogOut,
  PieChart,
  Settings,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { initialsOf } from '../lib/format'
import { useToast } from './UI'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight, end: false },
  { to: '/budgets', label: 'Budgets', icon: PieChart, end: false },
  { to: '/savings', label: 'Savings', icon: Target, end: false },
  { to: '/analytics', label: 'Analytics', icon: LineChart, end: false },
  { to: '/settings', label: 'Settings', icon: Settings, end: false },
]

const MOBILE_NAV = NAV.filter((item) => item.to !== '/settings')

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 6.5 12 19l7-12.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M9.2 6.5h5.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export default function Layout() {
  const { user, signOut, mode } = useAuth()
  const { profile } = useData()
  const navigate = useNavigate()
  const notify = useToast()

  const displayName = profile?.full_name?.trim() || user?.name?.trim() || 'Vault member'

  const handleSignOut = async () => {
    await signOut()
    notify('Signed out securely.', 'info')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <BrandMark />
          <div>
            <div className="brand-name">VAULT</div>
            <div className="brand-tag">Your money. Your control.</div>
          </div>
        </div>

        <nav className="nav-group" aria-label="Primary">
          <div className="nav-label">Workspace</div>
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="mode-chip">
            <span className={`mode-dot ${mode === 'cloud' ? 'cloud' : ''}`} />
            <span>
              {mode === 'cloud' ? (
                <>
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Supabase secured</strong>
                  <br />
                  Synced to your account
                </>
              ) : (
                <>
                  <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Device-local mode</strong>
                  <br />
                  Saved in this browser
                </>
              )}
            </span>
          </div>

          <button type="button" className="user-chip" onClick={() => navigate('/settings')}>
            <span className="avatar">{initialsOf(profile?.full_name, user?.email)}</span>
            <span className="user-meta">
              <span className="user-name">{displayName}</span>
              <span className="user-mail">{user?.email}</span>
            </span>
            <Settings size={14} style={{ color: 'var(--muted-2)', flex: 'none' }} />
          </button>

          <button type="button" className="btn btn-quiet btn-block" onClick={handleSignOut}>
            <LogOut />
            Sign out
          </button>
        </div>
      </aside>

      <div className="mobile-bar">
        <div className="brand" style={{ padding: 0 }}>
          <BrandMark />
          <div>
            <div className="brand-name" style={{ fontSize: 15 }}>
              VAULT
            </div>
            <div className="brand-tag">Your money. Your control.</div>
          </div>
        </div>
        <div className="head-actions">
          <span className="mode-chip" style={{ padding: '6px 9px' }}>
            <ShieldCheck size={13} style={{ color: mode === 'cloud' ? 'var(--accent)' : 'var(--warn)' }} />
            {mode === 'cloud' ? 'Synced' : 'Local'}
          </span>
          <button type="button" className="icon-btn" onClick={() => navigate('/settings')} aria-label="Settings">
            <Settings />
          </button>
        </div>
      </div>

      <main className="main">
        <div className="main-inner">
          <Outlet />
        </div>
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {MOBILE_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
