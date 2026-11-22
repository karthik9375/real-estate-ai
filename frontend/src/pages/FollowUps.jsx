import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarClock, CircleCheck, Clock, Plus, TriangleAlert, UserPlus } from 'lucide-react'
import { api } from '../services/api'
import { useApi } from '../hooks/useApi'
import { PageHeader } from '../components/PageHeader'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { FollowUpList, FollowUpModal } from '../components/FollowUps'

const TILES = [
  { id: 'overdue', label: 'Overdue', icon: TriangleAlert, color: 'var(--hot)' },
  { id: 'today', label: 'Due today', icon: Clock, color: 'var(--warm)' },
  { id: 'upcoming', label: 'Upcoming', icon: CalendarClock, color: 'var(--cold)' },
  { id: 'completed', label: 'Completed', icon: CircleCheck, color: 'var(--success)' },
]

const EMPTY_TEXT = {
  all: 'No follow-ups yet. Schedule one so promising leads are not forgotten.',
  overdue: 'Nothing overdue - you are on top of things.',
  today: 'No follow-ups due today.',
  upcoming: 'No upcoming follow-ups scheduled.',
  completed: 'No completed follow-ups yet.',
}

export default function FollowUps() {
  const [bucket, setBucket] = useState('all')
  const [creating, setCreating] = useState(false)
  const { data, loading, error, reload } = useApi(() => api.listFollowups(), [])
  const leads = useApi(() => api.listLeads({ sort: 'priority' }), [])

  const counts = useMemo(() => {
    const c = { overdue: 0, today: 0, upcoming: 0, completed: 0 }
    ;(data || []).forEach((f) => { c[f.bucket] += 1 })
    return c
  }, [data])

  const items = (data || []).filter((f) => (bucket === 'all' ? f.bucket !== 'completed' : f.bucket === bucket))
  const noLeads = leads.data && leads.data.length === 0

  return (
    <>
      <PageHeader
        title="Follow-ups"
        subtitle="Make sure promising leads never get forgotten after the first inquiry."
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={!leads.data || noLeads}>
            <Plus size={16} /> New follow-up
          </button>
        }
      />

      <div className="fu-summary">
        {TILES.map(({ id, label, icon: Icon, color }) => (
          <button key={id} className={`fu-tile ${bucket === id ? 'active' : ''}`} onClick={() => setBucket(bucket === id ? 'all' : id)}>
            <span className="l"><Icon size={14} style={{ color }} /> {label}</span>
            <span className="n">{data ? counts[id] : '-'}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <CalendarCheck size={16} />
            {bucket === 'all' ? 'All pending follow-ups' : TILES.find((t) => t.id === bucket).label}
          </h3>
          {bucket !== 'all' && <button className="btn btn-sm btn-ghost" onClick={() => setBucket('all')}>Show all pending</button>}
        </div>
        <div className="card-body flush">
          {loading && !data ? (
            <LoadingState label="Loading follow-ups..." />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} title="Could not load follow-ups" />
          ) : noLeads ? (
            <EmptyState icon={UserPlus} title="No leads yet" text="Add a lead first, then schedule follow-ups for it."
              action={<Link className="btn btn-primary btn-sm" to="/leads/new">Add new lead</Link>} />
          ) : items.length === 0 ? (
            <EmptyState icon={CalendarClock} text={EMPTY_TEXT[bucket]}
              action={bucket === 'all' && <button className="btn btn-sm" onClick={() => setCreating(true)}><Plus size={14} /> New follow-up</button>} />
          ) : (
            <FollowUpList items={items} onChanged={() => reload({ silent: true })} />
          )}
        </div>
      </div>

      {creating && leads.data && (
        <FollowUpModal leads={leads.data} onClose={() => setCreating(false)} onSaved={() => reload({ silent: true })} />
      )}
    </>
  )
}
