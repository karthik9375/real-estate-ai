import { Link, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { EmptyState } from './components/States'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import AddLead from './pages/AddLead'
import LeadDetail from './pages/LeadDetail'
import FollowUps from './pages/FollowUps'

function NotFound() {
  return (
    <div className="card">
      <EmptyState title="Page not found" text="The page you are looking for does not exist."
        action={<Link className="btn btn-primary" to="/">Go to dashboard</Link>} />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/new" element={<AddLead />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="followups" element={<FollowUps />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
