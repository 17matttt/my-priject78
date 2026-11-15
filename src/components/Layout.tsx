import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { notificationsFor } from '../lib/analytics'
import { initialsOf } from '../lib/format'
import { Icon } from './Icon'
import { ConfirmDialog } from './UI'
import GlobalSearch from './GlobalSearch'
import NotificationsPanel from './NotificationsPanel'
import QuickAdd from './QuickAdd'

export const NAV = [
  { to: '/', label: "Vue d'ensemble", icon: 'dashboard', end: true },
  { to: '/transactions', label: 'Transactions', icon: 'receipt' },
  { to: '/budgets', label: 'Budgets', icon: 'chart' },
  { to: '/epargne', label: 'Épargne', icon: 'piggy' },
  { to: '/abonnements', label: 'Abonnements', icon: 'repeat' },
  { to: '/calendrier', label: 'Calendrier', icon: 'calendar-days' },
  { to: '/analyses', label: 'Analyses', icon: 'trend' },
  { to: '/outils', label: 'Outils', icon: 'tools' },
  { to: '/reglages', label: 'Réglages', icon: 'settings' },
]

const PRIMARY = ['/', '/transactions', '/epargne']
const SECONDARY = NAV.filter((n) => !PRIMARY.includes(n.to))

export default function Layout() {
  const { data, clearAll } = useData()
  const location = useLocation()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const alerts = notificationsFor(data).length

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const initials = initialsOf(data.profile.name || 'VAULT')

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">V</span>
          <div>
            <div className="brand-name">VAULT</div>
            <div className="brand-tag">YOUR MONEY. YOUR CONTROL.</div>
          </div>
        </div>

        <button type="button" className="sidebar-add" onClick={() => setQuickOpen(true)}>
          <Icon name="plus" size={16} />
          <span>Nouveau</span>
        </button>

        <nav className="nav" aria-label="Navigation principale">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">
                <Icon name={item.icon} size={17} />
              </span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="storage-chip">
            <Icon name="lock" size={13} />
            <span>Données locales · ce navigateur</span>
          </div>
          <NavLink to="/reglages" className="profile-chip">
            <span className="avatar">{initials}</span>
            <span className="profile-main">
              <span className="profile-name">{data.profile.name || 'Mon espace'}</span>
              <span className="profile-sub">{data.demo ? 'Mode démo' : 'Profil personnel'}</span>
            </span>
            <Icon name="chevron-right" size={14} />
          </NavLink>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="Rechercher"
            >
              <Icon name="search" size={16} />
              <span>Rechercher…</span>
              <kbd>⌘K</kbd>
            </button>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Rechercher"
            >
              <Icon name="search" size={18} />
            </button>
            <button
              type="button"
              className="icon-btn bell-btn"
              onClick={() => setNotifOpen(true)}
              aria-label={`Notifications${alerts ? `, ${alerts} alertes` : ''}`}
            >
              <Icon name="bell" size={18} />
              {alerts > 0 ? <span className="bell-badge">{alerts > 9 ? '9+' : alerts}</span> : null}
            </button>
            <button type="button" className="btn btn-primary btn-sm quick-btn" onClick={() => setQuickOpen(true)}>
              <Icon name="plus" size={15} />
              <span>Ajouter</span>
            </button>
          </div>
        </header>

        {data.demo ? (
          <div className="demo-banner">
            <span className="demo-pill">
              <Icon name="sparkles" size={13} />
              Mode démonstration
            </span>
            <span className="demo-text">
              Ces données sont des exemples pour explorer VAULT. Elles ne sont pas vos finances réelles.
            </span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setResetOpen(true)}>
              Repartir de zéro
            </button>
          </div>
        ) : null}

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Navigation mobile">
        <NavLink to="/" end className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}>
          <Icon name="dashboard" size={19} />
          <span>Accueil</span>
        </NavLink>
        <NavLink to="/transactions" className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}>
          <Icon name="receipt" size={19} />
          <span>Opérations</span>
        </NavLink>
        <button type="button" className="bn-add" onClick={() => setQuickOpen(true)} aria-label="Ajouter">
          <Icon name="plus" size={22} />
        </button>
        <NavLink to="/epargne" className={({ isActive }) => `bn-item ${isActive ? 'active' : ''}`}>
          <Icon name="piggy" size={19} />
          <span>Épargne</span>
        </NavLink>
        <button type="button" className={`bn-item ${moreOpen ? 'active' : ''}`} onClick={() => setMoreOpen((v) => !v)}>
          <Icon name="dots" size={19} />
          <span>Plus</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setMoreOpen(false)}>
          <div className="more-sheet" role="dialog" aria-modal="true" aria-label="Plus de sections">
            <div className="more-head">
              <span>Plus de sections</span>
              <button type="button" className="icon-btn" onClick={() => setMoreOpen(false)} aria-label="Fermer">
                <Icon name="x" size={17} />
              </button>
            </div>
            <div className="more-grid">
              {SECONDARY.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `more-item ${isActive ? 'active' : ''}`}
                >
                  <span className="more-icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
      <QuickAdd open={quickOpen} onClose={() => setQuickOpen(false)} />

      <ConfirmDialog
        open={resetOpen}
        title="Effacer les données de démonstration ?"
        message="Toutes les données d'exemple seront supprimées et vous repartirez d'un espace vide. Cette action est irréversible."
        confirmLabel="Tout effacer"
        tone="danger"
        onConfirm={() => {
          clearAll()
          setResetOpen(false)
        }}
        onCancel={() => setResetOpen(false)}
      />
    </div>
  )
}
