import { LEAD_STATUSES } from '../utils/constants'

const PRIORITY_CLASS = { Hot: 'badge-hot', Warm: 'badge-warm', Cold: 'badge-cold' }

export function PriorityBadge({ priority, size }) {
  const cls = PRIORITY_CLASS[priority] || 'badge-none'
  return (
    <span className={`badge ${cls} ${size === 'lg' ? 'badge-lg' : ''}`}>
      <span className="badge-dot" />
      {priority || 'Not analyzed'}
    </span>
  )
}

const STATUS_CLASS = {
  New: 'badge-neutral',
  Contacted: 'badge-info',
  'Follow-up Required': 'badge-warning',
  'Site Visit Scheduled': 'badge-primary',
  Negotiation: 'badge-primary',
  Converted: 'badge-success',
  Lost: 'badge-none',
}

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_CLASS[status] || 'badge-neutral'}`}>{status}</span>
}

export const statusClass = (status) => `s-${status.toLowerCase().replace(/[^a-z]+/g, '-')}`

/** Inline status dropdown; stops click propagation so it can live inside clickable rows. */
export function StatusSelect({ value, onChange, disabled }) {
  return (
    <select
      className={`status-select ${statusClass(value)}`}
      value={value}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Lead status"
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}

export function priorityColor(priority) {
  return { Hot: 'var(--hot)', Warm: 'var(--warm)', Cold: 'var(--cold)' }[priority] || 'var(--none)'
}
