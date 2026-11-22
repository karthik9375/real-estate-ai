import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Circle, Pencil, Trash2 } from 'lucide-react'
import { api } from '../services/api'
import { addDaysISO, formatDateTime, parseLocalDate, relativeDueLabel, todayISO } from '../utils/format'
import { PriorityBadge } from './Badges'
import { Modal } from './Modal'
import { useToast } from './Toast'

/** Create / edit follow-up. When `leads` is given, the user picks a lead; otherwise `leadId` is fixed. */
export function FollowUpForm({ leadId, leads, initial, initialNote, onSaved, onCancel }) {
  const [form, setForm] = useState({
    lead_id: initial?.lead_id || leadId || '',
    due_date: initial?.due_date || addDaysISO(1),
    note: initial?.note || (initialNote || '').slice(0, 500),
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [apiError, setApiError] = useState(null)
  const notify = useToast()

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.lead_id) errs.lead_id = 'Select a lead'
    if (!form.due_date) errs.due_date = 'Pick a follow-up date'
    if (form.note.trim().length < 2) errs.note = 'Add a short note (what needs to happen)'
    if (form.note.length > 500) errs.note = 'Keep the note under 500 characters'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setBusy(true)
    setApiError(null)
    try {
      const saved = initial
        ? await api.updateFollowup(initial.id, { due_date: form.due_date, note: form.note.trim() })
        : await api.createFollowup({ ...form, note: form.note.trim() })
      notify(initial ? 'Follow-up updated' : 'Follow-up scheduled')
      onSaved(saved)
    } catch (err) {
      setApiError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="stack">
        {leads && !initial && (
          <div className="field">
            <label htmlFor="fu-lead">Lead<span className="req">*</span></label>
            <select id="fu-lead" className={`input select ${errors.lead_id ? 'invalid' : ''}`} value={form.lead_id}
              onChange={(e) => setForm({ ...form, lead_id: e.target.value })} disabled={busy}>
              <option value="">Select a lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.customer_name} - {l.location}{l.priority ? ` (${l.priority})` : ''}
                </option>
              ))}
            </select>
            {errors.lead_id && <span className="field-error">{errors.lead_id}</span>}
          </div>
        )}
        <div className="field">
          <label htmlFor="fu-date">Follow-up date<span className="req">*</span></label>
          <input id="fu-date" type="date" className={`input ${errors.due_date ? 'invalid' : ''}`} value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })} disabled={busy} />
          <div className="row">
            {[['Today', 0], ['Tomorrow', 1], ['In 3 days', 3], ['Next week', 7]].map(([label, d]) => (
              <button type="button" key={label} className="btn btn-sm" onClick={() => setForm({ ...form, due_date: addDaysISO(d) })} disabled={busy}>
                {label}
              </button>
            ))}
          </div>
          {errors.due_date && <span className="field-error">{errors.due_date}</span>}
        </div>
        <div className="field">
          <label htmlFor="fu-note">Note<span className="req">*</span></label>
          <textarea id="fu-note" className={`textarea ${errors.note ? 'invalid' : ''}`} style={{ minHeight: 90 }} maxLength={500}
            placeholder="e.g. Call to confirm site visit slot and loan pre-approval status"
            value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} disabled={busy} />
          <div className="field-hint">
            {errors.note ? <span className="field-error">{errors.note}</span> : <span />}
            <span>{form.note.length} / 500</span>
          </div>
        </div>
        {apiError && <div className="alert alert-error">{apiError}</div>}
      </div>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy && <span className="spinner" />} {initial ? 'Save changes' : 'Schedule follow-up'}
        </button>
      </div>
    </form>
  )
}

export function FollowUpModal({ onClose, ...props }) {
  return (
    <Modal title={props.initial ? 'Edit follow-up' : 'New follow-up'} onClose={onClose}>
      <FollowUpForm {...props} onCancel={onClose} onSaved={(f) => { props.onSaved?.(f); onClose() }} />
    </Modal>
  )
}

const BUCKET_LABEL = { overdue: 'Overdue', today: 'Due today', upcoming: 'Upcoming', completed: 'Completed' }
const BUCKET_BADGE = { overdue: 'badge-danger', today: 'badge-warning', upcoming: 'badge-info', completed: 'badge-success' }

/** List of follow-ups with complete/reopen, edit and delete actions. */
export function FollowUpList({ items, onChanged, showLead = true }) {
  const [busyId, setBusyId] = useState(null)
  const [editing, setEditing] = useState(null)
  const notify = useToast()

  const toggle = async (f) => {
    setBusyId(f.id)
    try {
      const status = f.status === 'Completed' ? 'Pending' : 'Completed'
      await api.updateFollowup(f.id, { status })
      notify(status === 'Completed' ? 'Follow-up marked completed' : 'Follow-up reopened')
      onChanged()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (f) => {
    if (!window.confirm('Delete this follow-up?')) return
    setBusyId(f.id)
    try {
      await api.deleteFollowup(f.id)
      notify('Follow-up deleted')
      onChanged()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <ul className="list">
        {items.map((f) => {
          const d = parseLocalDate(f.due_date)
          return (
            <li key={f.id} className={`fu-item ${f.bucket}`}>
              <div className="fu-date" title={f.due_date}>
                <div className="m">{d.toLocaleDateString(undefined, { month: 'short' })}</div>
                <div className="d">{d.getDate()}</div>
              </div>
              <div className="fu-main">
                <div className="row" style={{ gap: 8 }}>
                  {showLead && (
                    <Link to={`/leads/${f.lead_id}`} className="strong" style={{ color: 'var(--text)' }}>{f.customer_name}</Link>
                  )}
                  {showLead && <PriorityBadge priority={f.lead_priority} />}
                  <span className={`badge ${BUCKET_BADGE[f.bucket]}`}>{BUCKET_LABEL[f.bucket]}</span>
                  {f.due_date !== todayISO() || f.status === 'Completed' ? (
                    <span className="small muted">
                      {f.status === 'Completed' ? `Completed ${formatDateTime(f.completed_at)}` : relativeDueLabel(f.due_date)}
                    </span>
                  ) : null}
                </div>
                <div className="fu-note">{f.note}</div>
              </div>
              <div className="fu-actions">
                <button className={`check-btn ${f.status === 'Completed' ? 'done' : ''}`} onClick={() => toggle(f)} disabled={busyId === f.id}
                  title={f.status === 'Completed' ? 'Mark as pending' : 'Mark as completed'}>
                  {f.status === 'Completed' ? <Check size={14} /> : <Circle size={14} />}
                  {f.status === 'Completed' ? 'Completed' : 'Mark done'}
                </button>
                <button className="icon-btn" onClick={() => setEditing(f)} disabled={busyId === f.id} aria-label="Edit follow-up"><Pencil size={15} /></button>
                <button className="icon-btn danger" onClick={() => remove(f)} disabled={busyId === f.id} aria-label="Delete follow-up"><Trash2 size={15} /></button>
              </div>
            </li>
          )
        })}
      </ul>
      {editing && <FollowUpModal initial={editing} onClose={() => setEditing(null)} onSaved={onChanged} />}
    </>
  )
}
