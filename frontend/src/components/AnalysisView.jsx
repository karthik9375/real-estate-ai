import { useState } from 'react'
import {
  CalendarClock, Check, CircleCheck, CircleHelp, CircleMinus, CirclePlus, ClipboardList, Copy,
  FileText, Lightbulb, ShieldAlert, Target, TriangleAlert,
} from 'lucide-react'
import { PriorityBadge } from './Badges'
import { ScoreRing } from './Score'
import { Alert } from './States'
import { formatDateTime } from '../utils/format'

const IMPACT_ICON = { Positive: CirclePlus, Neutral: CircleMinus, Negative: CircleMinus }
const URGENCY_BADGE = { High: 'badge-danger', Medium: 'badge-warning', Low: 'badge-neutral' }

function Section({ icon: Icon, title, children, className = '', extra }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-header">
        <h3 className="card-title"><Icon size={16} /> {title}</h3>
        {extra}
      </div>
      <div className="card-body">{children}</div>
    </section>
  )
}

function BulletList({ items, empty }) {
  if (!items?.length) return <p className="muted small">{empty}</p>
  return <ul className="bullet-list">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button className="btn btn-sm" onClick={copy}>
      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export function AnalysisView({ analysis, onScheduleFollowUp }) {
  const a = analysis
  const req = a.key_requirements

  return (
    <div className="analysis-grid">
      {/* Recommended next action - first thing a salesperson needs */}
      <section className="next-action span-2">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="quick-label" style={{ color: '#0f766e' }}>Recommended next action</div>
            <div className="next-action-title"><Target size={18} style={{ marginTop: 2, flexShrink: 0 }} /> {a.next_action.action}</div>
            <p className="section-text" style={{ marginTop: 6 }}>{a.next_action.rationale}</p>
            <div className="row" style={{ marginTop: 10 }}>
              <span className={`badge ${URGENCY_BADGE[a.next_action.urgency]}`}>{a.next_action.urgency} urgency</span>
              <span className="badge badge-neutral"><CalendarClock size={12} /> {a.next_action.suggested_timeframe}</span>
            </div>
          </div>
          {onScheduleFollowUp && (
            <button className="btn" onClick={() => onScheduleFollowUp(a.next_action.action)}>
              <CalendarClock size={15} /> Schedule as follow-up
            </button>
          )}
        </div>
      </section>

      <Section icon={FileText} title="Lead summary">
        <p className="section-text">{a.summary}</p>
        <div className="sub-heading">Customer intent</div>
        <div className="row"><span className="badge badge-primary badge-lg">{a.intent}</span></div>
        <p className="section-text small" style={{ marginTop: 8 }}>{a.intent_explanation}</p>
      </Section>

      <Section icon={Target} title="Lead score & priority">
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          <ScoreRing score={a.score} priority={a.priority} size={72} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <PriorityBadge priority={a.priority} size="lg" />
            <p className="section-text small" style={{ marginTop: 8 }}>{a.score_explanation}</p>
          </div>
        </div>
        <div className="sub-heading">Priority rationale</div>
        <p className="section-text small">{a.priority_rationale}</p>
        {a.priority_override && (
          <div className="mt-16">
            <Alert type="warning" icon={TriangleAlert}>
              Score {a.score} normally maps to <strong>{a.expected_priority}</strong>. The AI classified this lead as{' '}
              <strong>{a.priority}</strong> because of the exceptional circumstance described above.
            </Alert>
          </div>
        )}
      </Section>

      <Section icon={ClipboardList} title="Score breakdown" className="span-2">
        <div className="two-col" style={{ gap: '0 28px' }}>
          {a.score_factors.map((f, i) => {
            const Icon = IMPACT_ICON[f.impact] || CircleMinus
            return (
              <div className="factor" key={i}>
                <span className={`factor-icon ${f.impact.toLowerCase()}`}><Icon size={13} /></span>
                <div>
                  <div className="factor-name">{f.factor} <span className="muted small" style={{ fontWeight: 500 }}>- {f.impact}</span></div>
                  <div className="factor-text">{f.assessment}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <Section icon={Lightbulb} title="Key requirements">
        <dl className="kv">
          <dt>Property type</dt><dd>{req.property_type}</dd>
          <dt>Preferred location</dt><dd>{req.preferred_location}</dd>
          <dt>Budget</dt><dd>{req.budget}</dd>
        </dl>
        <div className="sub-heading">Specifications</div>
        {req.specifications.length
          ? <div className="chips">{req.specifications.map((s, i) => <span className="chip" key={i}>{s}</span>)}</div>
          : <p className="muted small">No specific property specifications mentioned.</p>}
        <div className="sub-heading">Other preferences</div>
        {req.other_preferences.length
          ? <div className="chips">{req.other_preferences.map((s, i) => <span className="chip" key={i}>{s}</span>)}</div>
          : <p className="muted small">No other preferences mentioned.</p>}
      </Section>

      <Section icon={ShieldAlert} title="Objections & concerns"
        extra={<span className={`badge ${a.concerns.length ? 'badge-warning' : 'badge-success'}`}>{a.concerns.length || 'None'}</span>}>
        <p className="section-text small" style={{ marginBottom: a.concerns.length ? 12 : 0 }}>{a.concerns_summary}</p>
        {a.concerns.length === 0 && (
          <div className="mt-16"><Alert type="success" icon={CircleCheck}>No identifiable concerns or objections in the supplied information.</Alert></div>
        )}
        {a.concerns.map((c, i) => (
          <div className="concern" key={i}>
            <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{c.category}</span>
            <div style={{ flex: 1 }}>
              <div className="section-text small">{c.detail}</div>
            </div>
            <span className={`badge ${c.confirmed ? 'badge-danger' : 'badge-none'}`} title={c.confirmed ? 'Stated by the customer' : 'Inferred by the AI'}>
              {c.confirmed ? 'Stated' : 'Possible'}
            </span>
          </div>
        ))}
      </Section>

      <Section icon={FileText} title="Suggested customer response" className="span-2" extra={<CopyButton text={a.suggested_response} />}>
        <div className="reply-box">{a.suggested_response}</div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Review before sending. Verify any property, pricing or availability details with your team. Tip: ask the AI assistant to adjust the tone.
        </p>
      </Section>

      <Section icon={CircleHelp} title="Information quality" className="span-2">
        <div className="info-cols">
          <div>
            <div className="info-col-title" style={{ color: 'var(--success)' }}><CircleCheck size={15} /> Confirmed</div>
            <BulletList items={a.confirmed_information} empty="Nothing confirmed." />
          </div>
          <div>
            <div className="info-col-title" style={{ color: 'var(--warning)' }}><Lightbulb size={15} /> Assumptions</div>
            <BulletList items={a.assumptions} empty="No assumptions made." />
          </div>
          <div>
            <div className="info-col-title" style={{ color: 'var(--danger)' }}><CircleHelp size={15} /> Missing - ask the customer</div>
            <BulletList items={a.missing_information} empty="No critical information missing." />
          </div>
        </div>
      </Section>

      <p className="small muted span-2">Analysis generated by {a.model} on {formatDateTime(a.analyzed_at)}.</p>
    </div>
  )
}
