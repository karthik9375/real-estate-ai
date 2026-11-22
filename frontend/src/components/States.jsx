import { CircleAlert, Inbox, RefreshCw } from 'lucide-react'

export function Spinner({ large }) {
  return <span className={`spinner ${large ? 'lg' : ''}`} role="status" aria-label="Loading" />
}

export function LoadingState({ label = 'Loading...', compact }) {
  return (
    <div className={`state ${compact ? 'compact' : ''}`}>
      <Spinner large />
      <div className="state-text">{label}</div>
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, text, action, compact }) {
  return (
    <div className={`state ${compact ? 'compact' : ''}`}>
      <div className="state-icon"><Icon size={20} /></div>
      {title && <div className="state-title">{title}</div>}
      {text && <div className="state-text">{text}</div>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry, title = 'Something went wrong', compact }) {
  return (
    <div className={`state error ${compact ? 'compact' : ''}`}>
      <div className="state-icon"><CircleAlert size={20} /></div>
      <div className="state-title">{title}</div>
      <div className="state-text">{error?.message || String(error)}</div>
      {onRetry && (
        <button className="btn btn-sm" onClick={() => onRetry()} style={{ marginTop: 6 }}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  )
}

export function Alert({ type = 'info', icon: Icon = CircleAlert, children, actions }) {
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : undefined}>
      <Icon size={17} />
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {actions && <div className="alert-actions">{actions}</div>}
    </div>
  )
}
