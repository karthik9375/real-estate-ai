import { priorityColor } from './Badges'

export function ScoreRing({ score, priority, size = 64, stroke = 6 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100
  return (
    <div className="score-ring" style={{ width: size, height: size }} aria-label={`Lead score ${score ?? 'not available'}`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={priorityColor(priority)} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <span className="value" style={{ fontSize: size * 0.3 }}>{score ?? '-'}</span>
    </div>
  )
}

export function ScorePill({ score, priority }) {
  if (score == null) return <span className="muted">-</span>
  return (
    <span className="score-pill">
      <span style={{ minWidth: 22 }}>{score}</span>
      <span className="score-bar"><span style={{ width: `${score}%`, background: priorityColor(priority) }} /></span>
    </span>
  )
}
