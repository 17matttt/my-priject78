import { Route, Routes } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import { ToastProvider } from './components/UI'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Savings from './pages/Savings'
import Subscriptions from './pages/Subscriptions'
import CalendarPage from './pages/Calendar'
import Analytics from './pages/Analytics'
import Tools from './pages/Tools'
import Settings from './pages/Settings'

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budgets" element={<Buds />} />
          </Routes>
        </Routes>
      </DataProvider>
    </ToastProvider>
  )
}
