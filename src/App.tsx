import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './components/UI'
import { BrandMark } from './components/Layout'
import Layout from './components/Layout'
import AuthPage from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Savings from './pages/Savings'
import Analytics from './pages/Analytics'
import SettingsPage from './pages/Settings'

function Splash() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        gap: 14,
      }}
    >
      <div style={{ display: 'grid', justifyItems: 'center', gap: 14 }}>
        <BrandMark />
        <div className="brand-name" style={{ letterSpacing: '0.34em', fontSize: 15 }}>
          VAULT
        </div>
        <div className="tx-meta">Securing your workspace…</div>
      </div>
    </div>
  )
}

function Shell() {
  const { ready, user } = useAuth()

  if (!ready) return <Splash />
  if (!user) return <AuthPage />

  return (
    <DataProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </DataProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  )
}
