import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, CalendarCheck, Flame, Snowflake, Thermometer, Trophy, UserPlus, Users } from 'lucide-react'
import { api } from '../services/api'
import { useApi } from '../hooks/useApi'
import { PageHeader, StatCard } from '../components/PageHeader'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { ScorePill } from '../components/Score'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { FollowUpList } from '../components/FollowUps'
import { formatDate, initials } from '../utils/format'

const DIST_COLORS = { Hot: 'var(--hot)', Warm: 'var(--warm)', Cold: 'var(--cold)', 'Not analyzed': 'var(--none)' }

function PriorityDistribution({ dist, total }) {
  const entries = Object.entries(dist)
  return (
    <div className="card">
      <div className="card-header"><h3 className="card-title">Lead priority distribution</h3></div>
      <div className="card-body">
        <div className="dist-bar" role="img" aria-label={entries.map(([k, v]) => `${k}: ${v}`).join(', ')}>
          {total > 0 && entries.map(([k, v]) => v > 0 && (
            <span key={k} style={{ width: `${(v / total) * 100}%`, background: DIST_COLORS[k] }} title={`${k}: ${v}`} />
          ))}
        </div>
        <div className="dist-legend">
          {entries.map(([k, v]) => (
            <div className="dist-legend-item" key={k}>
              <span className="dist-swatch" style={{ background: DIST_COLORS[k] }} />
              <span>{k}</span>
              <span className="dist-count">{v}</span>
              <span className="dist-pct">{total ? Math.round((v / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LeadMiniList({ title, leads, empty, linkTo, showScore }) {
  const navigate = useNavigate()
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        {linkTo && <Link className="card-link" to={linkTo}>View all</Link>}
      </div>
      <div className="card-body flush">
        {leads.length === 0 ? (
          <EmptyState compact text={empty} />
        ) : (
          <ul className="list">
            {leads.map((l) => (
              <li key={l.id} className="list-item clickable" onClick={() => navigate(`/leads/${l.id}`)}>
                <span className="avatar">{initials(l.customer_name)}</span>
                <div className="list-main">
                  <div className="list-title">{l.customer_name}</div>
                  <div className="list-sub">
                    {showScore && l.next_action ? l.next_action : `${l.property_requirement} - ${l.location} - ${formatDate(l.created_at)}`}
                  </div>
                </div>
                {showScore ? <ScorePill score={l.score} priority={l.priority} /> : <StatusBadge status={l.status} />}
                <PriorityBadge priority={l.priority} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(() => api.dashboardStats(), [])

  const header = (
    <PageHeader
      title="Dashboard"
      subtitle="Overview of your pipeline, priorities and follow-ups."
      actions={<Link to="/leads/new" className="btn btn-primary"><UserPlus size={16} /> Add new lead</Link>}
    />
  )

  if (loading && !data) return <>{header}<LoadingState label="Loading dashboard..." /></>
  if (error) return <>{header}<div className="card"><ErrorState error={error} onRetry={reload} title="Could not load dashboard" /></div></>

  const m = data.metrics

  if (m.total_leads === 0) {
    return (
      <>
        {header}
        <div className="card">
          <EmptyState
            icon={Users}
            title="No leads yet"
            text="Add your first customer inquiry. The AI will score it, classify its priority and recommend the next step. All metrics here are calculated from the leads you enter."
            action={<Link to="/leads/new" className="btn btn-primary"><UserPlus size={16} /> Add your first lead</Link>}
          />
        </div>
      </>
    )
  }

  return (
    <>
      {header}
      <div className="stats-grid">
        <StatCard label="Total leads" value={m.total_leads} icon={Users} tone="primary"
          hint={m.average_score != null ? `Avg. score ${m.average_score}` : `${m.not_analyzed} not analyzed`} />
        <StatCard label="Hot leads" value={m.hot_leads} icon={Flame} tone="hot" hint="Score 70+" />
        <StatCard label="Warm leads" value={m.warm_leads} icon={Thermometer} tone="warm" hint="Score 40-69" />
        <StatCard label="Cold leads" value={m.cold_leads} icon={Snowflake} tone="cold" hint="Score below 40" />
        <StatCard label="Requiring follow-up" value={m.requiring_followup} icon={CalendarClock} tone="violet"
          hint={m.overdue_followups ? `${m.overdue_followups} overdue` : `${m.today_followups} due today`} />
        <StatCard label="Converted" value={m.converted_leads} icon={Trophy} tone="success"
          hint={`${m.total_leads ? Math.round((m.converted_leads / m.total_leads) * 100) : 0}% conversion`} />
      </div>

      <div className="stack">
        <div className="two-col">
          <PriorityDistribution dist={data.priority_distribution} total={m.total_leads} />
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><CalendarCheck size={16} /> Upcoming follow-ups</h3>
              <Link className="card-link" to="/followups">View all</Link>
            </div>
            <div className="card-body flush">
              {data.upcoming_followups.length === 0 ? (
                <EmptyState compact text="No pending follow-ups. Schedule one from a lead's detail page." />
              ) : (
                <FollowUpList items={data.upcoming_followups} onChanged={() => reload({ silent: true })} />
              )}
            </div>
          </div>
        </div>

        <div className="two-col">
          <LeadMiniList
            title="Highest-priority leads"
            leads={data.top_priority_leads}
            empty="Analyzed open leads will appear here, ranked by priority and score."
            linkTo="/leads?sort=priority"
            showScore
          />
          <LeadMiniList title="Recent leads" leads={data.recent_leads} empty="No leads yet." linkTo="/leads?sort=newest" />
        </div>
      </div>
    </>
  )
}
