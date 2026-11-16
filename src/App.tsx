import { Navigate, Route, Routes } from 'react-router-dom'
import Shell from './components/Shell'
import Overview from './pages/Overview'
import MailCenter from './pages/MailCenter'
import School from './pages/School'
import CalendarPage from './pages/CalendarPage'
import Tasks from './pages/Tasks'
import Focus from './pages/Focus'
import Documents from './pages/Documents'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Overview />} />
        <Route path="/mail" element={<MailCenter />} />
        <Route path="/school" element={<School />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
