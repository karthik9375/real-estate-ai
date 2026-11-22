import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Building2, CalendarCheck, CalendarClock, Clock, FileText, MapPin, MessageSquare, Pencil, Plus,
  RefreshCw, Sparkles, Trash2, TriangleAlert, Wallet,
} from 'lucide-react'
import { api } from '../services/api'
import { useApi } from '../hooks/useApi'
import { PriorityBadge, StatusSelect } from '../components/Badges'
import { ScoreRing } from '../components/Score'
import { Alert, EmptyState, ErrorState, LoadingState, Spinner } from '../components/States'
import { AnalysisView } from '../components/AnalysisView'
import { ChatPanel } from '../components/ChatPanel'
import { FollowUpList, FollowUpModal } from '../components/FollowUps'
import { EditLeadModal } from '../components/EditLeadModal'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { formatDate, formatDateTime, initials } from '../utils/format'

const TABS = [
  { id: 'analysis', label: 'AI Analysis', icon: Sparkles },
  { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
  { id: 'followups', label: 'Follow-ups', icon: CalendarCheck },
  { id: 'details', label: 'Lead Information', icon: FileText },
]

function requirementLabel(lead) {
  return lead.property_requirement_other ? `${lead.property_requirement} - ${lead.property_requirement_other}` : lead.property_requirement
}

export default function LeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const notify = useToast()
  const [tab, setTab] = useState('analysis')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [followupDraft, setFollowupDraft] = useState(null) // null | { note }
  const [statusBusy, setStatusBusy] = useState(false)

  const { data: lead, setData: setLead, loading, error, reload } = useApi(() => api.getLead(id), [id])
  const followups = useApi(() => api.listFollowups({ lead_id: id }), [id])

  const runAnalysis = async () => {
    setAnalyzing(true)
    setAnalyzeError(null)
    try {
      const updated = await api.analyzeLead(id)
      setLead(updated)
      setTab('analysis')
      notify(`Analysis complete: ${updated.analysis.priority} lead (score ${updated.analysis.score})`)
    } catch (err) {
      setAnalyzeError(err.message)
      reload({ silent: true })
    } finally {
      setAnalyzing(false)
    }
  }

  const changeStatus = async (status) => {
    setStatusBusy(true)
    try {
      setLead(await api.updateLead(id, { status }))
      notify(`Status set to ${status}`)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setStatusBusy(false)
    }
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      await api.deleteLead(id)
      notify(`${lead.customer_name} deleted`)
      navigate('/leads')
    } catch (err) {
      notify(err.message, 'error')
      setDeleteBusy(false)
    }
  }

  if (loading && !lead) return <LoadingState label="Loading lead..." />
  if (error) {
    return (
      <>
        <Link to="/leads" className="back-link"><ArrowLeft size={16} /> Back to leads</Link>
        <div className="card">
          <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload}
            title={error.status === 404 ? 'Lead not found' : 'Could not load lead'} />
        </div>
      </>
    )
  }

  const a = lead.analysis
  const fuItems = followups.data || []
  const pendingCount = fuItems.filter((f) => f.status === 'Pending').length
  const nextFu = fuItems.find((f) => f.status === 'Pending')

  return (
    <>
      <Link to="/leads" className="back-link"><ArrowLeft size={16} /> Back to leads</Link>

      {/* ===== Hero: who, priority, score, intent, next action at a glance ===== */}
      <div className="card">
        <div className="lead-hero">
          <div className="lead-hero-id">
            <span className="avatar lg">{initials(lead.customer_name)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 10 }}>
                <h1 className="lead-hero-name">{lead.customer_name}</h1>
                <PriorityBadge priority={a?.priority} size="lg" />
              </div>
              <div className="lead-hero-meta">
                <span><MapPin size={14} /> {lead.location}</span>
                <span><Building2 size={14} /> {requirementLabel(lead)}</span>
                <span><Wallet size={14} /> {lead.budget}</span>
                <span><Clock size={14} /> {lead.buying_timeline}</span>
              </div>
            </div>
          </div>
          <div className="lead-hero-right">
            <StatusSelect value={lead.status} onChange={changeStatus} disabled={statusBusy} />
            <button className="btn" onClick={() => setEditing(true)} disabled={analyzing}><Pencil size={15} /> Edit</button>
            <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? <span className="spinner" /> : a ? <RefreshCw size={15} /> : <Sparkles size={15} />}
              {analyzing ? 'Analyzing...' : a ? 'Re-analyze' : 'Analyze with AI'}
            </button>
            <button className="icon-btn danger" onClick={() => setDeleting(true)} title="Delete lead" aria-label="Delete lead"><Trash2 size={16} /></button>
          </div>
        </div>

        {a && (
          <div className="quick-strip">
            <div className="quick-score">
              <ScoreRing score={a.score} priority={a.priority} size={56} />
              <div>
                <div className="quick-label">Lead score</div>
                <div className="quick-value">{a.score} / 100</div>
              </div>
            </div>
            <div>
              <div className="quick-label">Customer intent</div>
              <div className="quick-value">{a.intent}</div>
            </div>
            <div>
              <div className="quick-label">Next action</div>
              <div className="quick-value" style={{ fontSize: 13.5 }}>{a.next_action.action}</div>
            </div>
            <div>
              <div className="quick-label">Next follow-up</div>
              <div className="quick-value">
                {nextFu ? formatDate(nextFu.due_date) : <span className="muted" style={{ fontWeight: 500 }}>None scheduled</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {analyzeError && (
        <div className="mt-16">
          <Alert type="error" actions={<button className="btn btn-sm" onClick={runAnalysis} disabled={analyzing}><RefreshCw size={13} /> Retry</button>}>
            <strong>AI analysis failed.</strong> {analyzeError}
          </Alert>
        </div>
      )}
      {lead.analysis_outdated && !analyzing && (
        <div className="mt-16">
          <Alert type="warning" icon={TriangleAlert}
            actions={<button className="btn btn-sm" onClick={runAnalysis}><RefreshCw size={13} /> Re-analyze</button>}>
            Lead details were edited after the last analysis. Re-analyze to refresh the score and recommendations.
          </Alert>
        </div>
      )}

      <div className="tabs" role="tablist">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} role="tab" aria-selected={tab === tid} className={`tab ${tab === tid ? 'active' : ''}`} onClick={() => setTab(tid)}>
            <Icon size={15} /> {label}
            {tid === 'followups' && pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
          </button>
        ))}
      </div>

      {tab === 'analysis' && (
        analyzing && !a ? (
          <div className="card"><div className="analyzing"><Spinner large /><div className="state-title">Analyzing with Gemini AI...</div><div className="state-text">This usually takes 15-40 seconds.</div></div></div>
        ) : a ? (
          <div style={{ opacity: analyzing ? 0.55 : 1, transition: 'opacity .2s' }}>
            <AnalysisView analysis={a} onScheduleFollowUp={(note) => setFollowupDraft({ note })} />
          </div>
        ) : (
          <div className="card">
            <EmptyState
              icon={Sparkles}
              title={lead.analysis_status === 'failed' ? 'Analysis has not completed' : 'Not analyzed yet'}
              text={lead.analysis_error || 'Run the AI analysis to get a lead score, priority, key requirements, concerns, next action and a suggested reply.'}
              action={<button className="btn btn-primary" onClick={runAnalysis}><Sparkles size={15} /> Analyze with AI</button>}
            />
          </div>
        )
      )}

      {tab === 'chat' && <ChatPanel key={lead.id} lead={lead} />}

      {tab === 'followups' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title"><CalendarCheck size={16} /> Follow-ups for {lead.customer_name}</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setFollowupDraft({ note: '' })}><Plus size={14} /> New follow-up</button>
          </div>
          <div className="card-body flush">
            {followups.loading && !followups.data ? (
              <LoadingState compact />
            ) : followups.error ? (
              <ErrorState error={followups.error} onRetry={followups.reload} compact />
            ) : fuItems.length === 0 ? (
              <EmptyState compact icon={CalendarClock} title="No follow-ups yet"
                text="Schedule a follow-up so this lead doesn't get forgotten."
                action={<button className="btn btn-sm" onClick={() => setFollowupDraft({ note: a?.next_action.action || '' })}><Plus size={14} /> Schedule follow-up</button>} />
            ) : (
              <FollowUpList items={fuItems} showLead={false} onChanged={() => followups.reload({ silent: true })} />
            )}
          </div>
        </div>
      )}

      {tab === 'details' && (
        <div className="two-col wide-left">
          <div className="card">
            <div className="card-header"><h3 className="card-title"><MessageSquare size={16} /> Customer message</h3></div>
            <div className="card-body"><div className="message-box">{lead.customer_message}</div></div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title"><FileText size={16} /> Lead information</h3>
              <button className="btn btn-sm" onClick={() => setEditing(true)}><Pencil size={13} /> Edit</button>
            </div>
            <div className="card-body">
              <dl className="kv">
                <dt>Customer name</dt><dd>{lead.customer_name}</dd>
                <dt>Location</dt><dd>{lead.location}</dd>
                <dt>Requirement</dt><dd>{requirementLabel(lead)}</dd>
                <dt>Budget</dt><dd>{lead.budget}</dd>
                <dt>Buying timeline</dt><dd>{lead.buying_timeline}</dd>
                <dt>Status</dt><dd>{lead.status}</dd>
                <dt>Created</dt><dd>{formatDateTime(lead.created_at)}</dd>
                <dt>Last updated</dt><dd>{formatDateTime(lead.updated_at)}</dd>
                <dt>Lead ID</dt><dd className="small muted">{lead.id}</dd>
              </dl>
            </div>
          </div>
        </div>
      )}

      {editing && <EditLeadModal lead={lead} onClose={() => setEditing(false)} onSaved={setLead} />}
      {followupDraft && (
        <FollowUpModal
          leadId={lead.id}
          initialNote={followupDraft.note}
          onClose={() => setFollowupDraft(null)}
          onSaved={() => { followups.reload({ silent: true }); setTab('followups') }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete lead"
          message={`Delete ${lead.customer_name}? This also removes their follow-ups and AI conversation. This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(false)}
          busy={deleteBusy}
        />
      )}
    </>
  )
}
