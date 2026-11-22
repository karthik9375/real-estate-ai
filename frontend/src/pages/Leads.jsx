import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpDown, Eye, Pencil, RefreshCw, Search, Trash2, TriangleAlert, UserPlus, Users } from 'lucide-react'
import { api } from '../services/api'
import { useApi, useDebouncedValue } from '../hooks/useApi'
import { PageHeader } from '../components/PageHeader'
import { PriorityBadge, StatusSelect } from '../components/Badges'
import { ScorePill } from '../components/Score'
import { EmptyState, ErrorState, LoadingState } from '../components/States'
import { ConfirmDialog } from '../components/Modal'
import { EditLeadModal } from '../components/EditLeadModal'
import { useToast } from '../components/Toast'
import { LEAD_STATUSES, SORT_OPTIONS } from '../utils/constants'
import { formatDate, initials } from '../utils/format'

const PRIORITY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'Hot', label: 'Hot', color: 'var(--hot)' },
  { value: 'Warm', label: 'Warm', color: 'var(--warm)' },
  { value: 'Cold', label: 'Cold', color: 'var(--cold)' },
  { value: 'unanalyzed', label: 'Not analyzed', color: 'var(--none)' },
]

export default function Leads() {
  const navigate = useNavigate()
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const debouncedSearch = useDebouncedValue(search.trim())
  const priority = params.get('priority') || ''
  const status = params.get('status') || ''
  const sort = params.get('sort') || 'priority'

  const [editingId, setEditingId] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [rowBusy, setRowBusy] = useState({}) // { [id]: 'analyzing' | 'status' }

  const { data: leads, setData, loading, error, reload } = useApi(
    () => api.listLeads({ search: debouncedSearch, priority, status, sort }),
    [debouncedSearch, priority, status, sort],
  )

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const markBusy = (id, v) => setRowBusy((b) => ({ ...b, [id]: v }))

  const changeStatus = async (lead, newStatus) => {
    markBusy(lead.id, 'status')
    try {
      await api.updateLead(lead.id, { status: newStatus })
      setData((list) => list.map((l) => (l.id === lead.id ? { ...l, status: newStatus } : l)))
      notify(`${lead.customer_name}: status set to ${newStatus}`)
      if (status) reload({ silent: true })
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      markBusy(lead.id, null)
    }
  }

  const reanalyze = async (lead) => {
    markBusy(lead.id, 'analyzing')
    try {
      const updated = await api.analyzeLead(lead.id)
      notify(`${lead.customer_name} re-analyzed: ${updated.analysis.priority} (${updated.analysis.score})`)
      reload({ silent: true })
    } catch (err) {
      notify(`AI analysis failed: ${err.message}`, 'error')
      reload({ silent: true })
    } finally {
      markBusy(lead.id, null)
    }
  }

  const confirmDelete = async () => {
    setDeleteBusy(true)
    try {
      await api.deleteLead(deleting.id)
      notify(`${deleting.customer_name} deleted`)
      setDeleting(null)
      reload({ silent: true })
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  const filtersActive = !!(debouncedSearch || priority || status)
  const toggleScoreSort = () => setParam('sort', sort === 'score_desc' ? 'score_asc' : 'score_desc')
  const toggleDateSort = () => setParam('sort', sort === 'newest' ? 'oldest' : 'newest')

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Search, filter and act on every customer inquiry."
        actions={<Link to="/leads/new" className="btn btn-primary"><UserPlus size={16} /> Add new lead</Link>}
      />

      <div className="card">
        <div className="toolbar">
          <div className="search-input">
            <Search size={16} />
            <input className="input" placeholder="Search by name or location" value={search}
              onChange={(e) => { setSearch(e.target.value); setParam('search', e.target.value.trim()) }} aria-label="Search leads" />
          </div>
          <div className="segmented" role="group" aria-label="Filter by priority">
            {PRIORITY_FILTERS.map((f) => (
              <button key={f.value} className={priority === f.value ? 'active' : ''} onClick={() => setParam('priority', f.value)}>
                {f.color && <span className="badge-dot" style={{ background: f.color }} />} {f.label}
              </button>
            ))}
          </div>
          <select className="input select" value={status} onChange={(e) => setParam('status', e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input select" value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort leads">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {loading && !leads ? (
          <LoadingState label="Loading leads..." />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} title="Could not load leads" />
        ) : leads.length === 0 ? (
          filtersActive ? (
            <EmptyState icon={Search} title="No matching leads" text="Try a different search term or clear the filters."
              action={<button className="btn btn-sm" onClick={() => { setSearch(''); setParams({ sort }, { replace: true }) }}>Clear filters</button>} />
          ) : (
            <EmptyState icon={Users} title="No leads yet" text="Leads you add will appear here with their AI score and priority."
              action={<Link to="/leads/new" className="btn btn-primary btn-sm"><UserPlus size={14} /> Add a lead</Link>} />
          )
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Location</th>
                    <th>Requirement</th>
                    <th>Budget</th>
                    <th>Timeline</th>
                    <th><button className="th-sort" onClick={toggleScoreSort}>Score <ArrowUpDown size={12} /></button></th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th><button className="th-sort" onClick={toggleDateSort}>Created <ArrowUpDown size={12} /></button></th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l) => (
                    <tr key={l.id} onClick={() => navigate(`/leads/${l.id}`)}>
                      <td>
                        <div className="cell-name">
                          <span className="avatar">{initials(l.customer_name)}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="strong">{l.customer_name}</div>
                            {l.analysis_outdated && (
                              <div className="small" style={{ color: 'var(--warning)', display: 'flex', gap: 4, alignItems: 'center' }}>
                                <TriangleAlert size={12} /> Analysis outdated
                              </div>
                            )}
                            {l.analysis_status === 'failed' && (
                              <div className="small" style={{ color: 'var(--danger)' }}>Analysis failed</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="wrap">{l.location}</td>
                      <td className="wrap">{l.property_requirement}</td>
                      <td>{l.budget}</td>
                      <td>{l.buying_timeline}</td>
                      <td>
                        {rowBusy[l.id] === 'analyzing' ? <span className="spinner" style={{ color: 'var(--primary)' }} /> : <ScorePill score={l.score} priority={l.priority} />}
                      </td>
                      <td><PriorityBadge priority={l.priority} /></td>
                      <td><StatusSelect value={l.status} onChange={(s) => changeStatus(l, s)} disabled={!!rowBusy[l.id]} /></td>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{formatDate(l.created_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="cell-actions">
                          <button className="icon-btn" title="View details & AI analysis" onClick={() => navigate(`/leads/${l.id}`)}><Eye size={16} /></button>
                          <button className="icon-btn" title="Edit lead" onClick={() => setEditingId(l.id)} disabled={!!rowBusy[l.id]}><Pencil size={16} /></button>
                          <button className="icon-btn" title={l.score == null ? 'Analyze with AI' : 'Re-analyze with AI'} onClick={() => reanalyze(l)} disabled={!!rowBusy[l.id]}>
                            <RefreshCw size={16} />
                          </button>
                          <button className="icon-btn danger" title="Delete lead" onClick={() => setDeleting(l)} disabled={!!rowBusy[l.id]}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              Showing {leads.length} lead{leads.length === 1 ? '' : 's'} - sorted by {SORT_OPTIONS.find((o) => o.value === sort)?.label.toLowerCase()}
            </div>
          </>
        )}
      </div>

      {editingId && <EditLeadModal leadId={editingId} onClose={() => setEditingId(null)} onSaved={() => reload({ silent: true })} />}
      {deleting && (
        <ConfirmDialog
          title="Delete lead"
          message={`Delete ${deleting.customer_name}? This also removes their follow-ups and AI conversation. This cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          busy={deleteBusy}
        />
      )}
    </>
  )
}
