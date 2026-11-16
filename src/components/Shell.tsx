import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  Blocks,
  Building2,
  CheckCheck,
  CheckSquare,
  Contact,
  CreditCard,
  Headphones,
  History,
  LayoutDashboard,
  Megaphone,
  Menu,
  Search,
  Server,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users2,
  Wallet,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Avatar, Badge } from './UI'
import { relativeTime } from '../lib/format'
import { isOverdue } from '../lib/format'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
}

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return ref
}

interface SearchHit {
  id: string
  title: string
  sub: string
  group: string
  href: string
}

export function Shell() {
  const { data, notifications, unreadCount, markAllRead, markRead } = useApp()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [bellOpen, setBellOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const pending = data.properties.filter((p) => p.status === 'pending').length
  const lateTasks = data.tasks.filter((t) => t.status !== 'done' && isOverdue(t.due)).length
  const openTickets = data.tickets.filter((t) => t.status === 'open').length

  const groups: { label: string; items: NavItem[] }[] = [
    {
      label: 'Workspace',
      items: [
        { to: '/', label: 'Overview', icon: LayoutDashboard },
        { to: '/reports', label: 'Reports', icon: BarChart3 },
        { to: '/tasks', label: 'Tasks', icon: CheckSquare, badge: lateTasks },
        { to: '/team', label: 'Team', icon: Users2 },
        { to: '/users', label: 'Users & Access', icon: ShieldCheck },
        { to: '/clients', label: 'Clients', icon: Contact },
      ],
    },
    {
      label: 'Operations',
      items: [
        { to: '/support', label: 'Support', icon: Headphones, badge: openTickets },
        { to: '/announcements', label: 'Announcements', icon: Megaphone },
        { to: '/moderation', label: 'Moderation', icon: ShieldAlert, badge: pending },
        { to: '/finance', label: 'Finance', icon: Wallet },
        { to: '/billing', label: 'Billing', icon: CreditCard },
      ],
    },
    {
      label: 'System',
      items: [
        { to: '/activity', label: 'Activity Log', icon: History },
        { to: '/integrations', label: 'Integrations', icon: Blocks },
        { to: '/system', label: 'System', icon: Server },
        { to: '/settings', label: 'Settings', icon: SettingsIcon },
      ],
    },
  ]

  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
      if (event.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const bellRef = useClickOutside(() => setBellOpen(false))
  const profileRef = useClickOutside(() => setProfileOpen(false))

  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const match = (value: string) => value.toLowerCase().includes(q)
    const out: SearchHit[] = []
    data.properties.forEach((p) => {
      if (match(p.title) || match(p.location) || match(p.owner.name) || match(p.reference)) {
        out.push({ id: `p-${p.id}`, title: p.title, sub: `${p.location} · ${p.status}`, group: 'Properties', href: '/moderation' })
      }
    })
    data.clients.forEach((c) => {
      if (match(c.name) || match(c.email) || match(c.city)) {
        out.push({ id: `c-${c.id}`, title: c.name, sub: `${c.type} · ${c.city}`, group: 'Clients', href: '/clients' })
      }
    })
    data.users.forEach((u) => {
      if (match(u.name) || match(u.email) || match(u.role)) {
        out.push({ id: `u-${u.id}`, title: u.name, sub: `${u.role} · ${u.department}`, group: 'Users', href: '/users' })
      }
    })
    data.tickets.forEach((t) => {
      if (match(t.subject) || match(t.requester)) {
        out.push({ id: `s-${t.id}`, title: t.subject, sub: `${t.requester} · ${t.status}`, group: 'Support', href: '/support' })
      }
    })
    data.tasks.forEach((t) => {
      if (match(t.title) || match(t.assignee)) {
        out.push({ id: `k-${t.id}`, title: t.title, sub: `${t.assignee} · ${t.status}`, group: 'Tasks', href: '/tasks' })
      }
    })
    data.announcements.forEach((a) => {
      if (match(a.title)) {
        out.push({ id: `a-${a.id}`, title: a.title, sub: `${a.audience} · ${a.status}`, group: 'Announcements', href: '/announcements' })
      }
    })
    return out.slice(0, 12)
  }, [query, data])

  const go = (href: string) => {
    setPaletteOpen(false)
    setQuery('')
    navigate(href)
  }

  const admin = data.users[0]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${drawerOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">
            <Building2 size={19} strokeWidth={2.2} />
          </span>
          <span className="brand-text">
            <strong>Vantage</strong>
            <small>ESTATE ADMIN</small>
          </span>
          <button className="sidebar-close" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <nav className="nav" aria-label="Main navigation">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group-label">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-item ${isActive ? 'is-active' : ''}`}
                  >
                    <Icon size={18} strokeWidth={1.9} />
                    <span className="nav-label">{item.label}</span>
                    {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="plan-card">
            <div className="plan-top">
              <Sparkles size={15} />
              <span>Workspace health</span>
            </div>
            <div className="plan-meter">
              <span style={{ width: `${Math.min(100, (pending / Math.max(data.properties.length, 1)) * 100 + 28)}%` }} />
            </div>
            <p className="plan-text">{pending} listings awaiting a decision</p>
            <Link to="/moderation" className="plan-link">
              Open queue
            </Link>
          </div>
        </div>
      </aside>

      {drawerOpen ? <div className="scrim" onClick={() => setDrawerOpen(false)} /> : null}

      <div className="main-area">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>

          <button className="global-search" onClick={() => setPaletteOpen(true)}>
            <Search size={17} />
            <span className="global-search-text">Search properties, clients, users…</span>
            <kbd>⌘K</kbd>
          </button>

          <div className="topbar-right">
            <div className="bell-wrap" ref={bellRef}>
              <button
                className={`icon-btn bell-btn ${unreadCount ? 'has-dot' : ''}`}
                onClick={() => setBellOpen((open) => !open)}
                aria-label="Notifications"
                aria-expanded={bellOpen}
              >
                <Bell size={18} />
                {unreadCount ? <span className="bell-count">{unreadCount}</span> : null}
              </button>
              {bellOpen ? (
                <div className="dropdown dropdown-notify">
                  <header className="dropdown-head">
                    <strong>Notifications</strong>
                    <button className="link-btn" onClick={markAllRead}>
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  </header>
                  <ul className="notify-list">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          className={`notify-item tone-${n.tone}`}
                          onClick={() => {
                            markRead(n.id)
                            setBellOpen(false)
                            navigate(n.href)
                          }}
                        >
                          <span className="notify-dot" />
                          <span className="notify-body">
                            <strong>{n.title}</strong>
                            <span>{n.body}</span>
                            <small>{relativeTime(n.at)}</small>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="profile-wrap" ref={profileRef}>
              <button className="profile-btn" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
                <Avatar name={admin?.name ?? 'Admin'} hue={admin?.hue ?? 174} size={36} />
                <span className="profile-meta">
                  <strong>{admin?.name ?? 'Admin'}</strong>
                  <small>{admin?.role ?? 'Super Admin'}</small>
                </span>
              </button>
              {profileOpen ? (
                <div className="dropdown dropdown-profile">
                  <div className="profile-card">
                    <Avatar name={admin?.name ?? 'Admin'} hue={admin?.hue ?? 174} size={44} />
                    <div>
                      <strong>{admin?.name}</strong>
                      <small>{admin?.email}</small>
                    </div>
                  </div>
                  <div className="profile-links">
                    <Link to="/settings" onClick={() => setProfileOpen(false)}>
                      Workspace settings
                    </Link>
                    <Link to="/activity" onClick={() => setProfileOpen(false)}>
                      Activity log
                    </Link>
                    <Link to="/system" onClick={() => setProfileOpen(false)}>
                      System status
                    </Link>
                  </div>
                  <div className="profile-foot">
                    <Badge tone="success">All systems operational</Badge>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      {paletteOpen ? (
        <div className="palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setPaletteOpen(false)}>
          <div className="palette" role="dialog" aria-modal="true" aria-label="Global search">
            <div className="palette-input-row">
              <Search size={18} />
              <input
                autoFocus
                value={query}
                placeholder="Search properties, clients, users, tickets…"
                aria-label="Global search input"
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="icon-btn" onClick={() => setPaletteOpen(false)} aria-label="Close search">
                <X size={16} />
              </button>
            </div>
            <div className="palette-results">
              {query.trim() === '' ? (
                <div className="palette-hint">
                  <p>Jump to</p>
                  <div className="palette-quick">
                    {[
                      { label: 'Moderation queue', href: '/moderation' },
                      { label: 'New listing', href: '/moderation' },
                      { label: 'Clients', href: '/clients' },
                      { label: 'Billing', href: '/billing' },
                      { label: 'Reports', href: '/reports' },
                    ].map((item) => (
                      <button key={item.label} onClick={() => go(item.href)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : hits.length ? (
                hits.map((hit) => (
                  <button key={hit.id} className="palette-hit" onClick={() => go(hit.href)}>
                    <span className="palette-hit-main">
                      <strong>{hit.title}</strong>
                      <small>{hit.sub}</small>
                    </span>
                    <span className="palette-hit-group">{hit.group}</span>
                  </button>
                ))
              ) : (
                <p className="palette-empty">No results for “{query}”.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
