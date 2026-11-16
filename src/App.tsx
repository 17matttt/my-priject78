import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { Dashboard } from './pages/Dashboard'
import { Reports } from './pages/Reports'
import { Tasks } from './pages/Tasks'
import { Team } from './pages/Team'
import { Users } from './pages/Users'
import { Clients } from './pages/Clients'
import { Support } from './pages/Support'
import { Announcements } from './pages/Announcements'
import { Moderation } from './pages/Moderation'
import { Finance } from './pages/Finance'
import { Billing } from './pages/Billing'
import { ActivityLog } from './pages/ActivityLog'
import { Integrations } from './pages/Integrations'
import { System } from './pages/System'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="reports" element={<Reports />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="team" element={<Team />} />
        <Route path="users" element={<Users />} />
        <Route path="clients" element={<Clients />} />
        <Route path="support" element={<Support />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="finance" element={<Finance />} />
        <Route path="billing" element={<Billing />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="system" element={<System />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
