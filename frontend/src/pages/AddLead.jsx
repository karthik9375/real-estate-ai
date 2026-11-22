import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleCheck, RefreshCw, Sparkles } from 'lucide-react'
import { api } from '../services/api'
import { PageHeader } from '../components/PageHeader'
import { LeadForm } from '../components/LeadForm'
import { Alert, Spinner } from '../components/States'
import { useToast } from '../components/Toast'

const STEPS = ['Saving lead', 'Analyzing with Gemini AI', 'Preparing results']

function AnalyzingPanel({ step, name }) {
  return (
    <div className="card">
      <div className="analyzing">
        <Spinner large />
        <div>
          <div className="state-title">Analyzing {name}'s inquiry</div>
          <div className="state-text">The AI is scoring intent, budget clarity, timeline and concerns. This usually takes 15-40 seconds.</div>
        </div>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i < step ? 'done' : i === step ? 'active' : ''}`}>
              {i < step ? <CircleCheck size={16} /> : i === step ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <span style={{ width: 16 }} />}
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AddLead() {
  const navigate = useNavigate()
  const notify = useToast()
  const [phase, setPhase] = useState('form') // form | saving | analyzing | failed
  const [lead, setLead] = useState(null)
  const [error, setError] = useState(null)
  const [formKey, setFormKey] = useState(0)

  const analyze = async (saved) => {
    setPhase('analyzing')
    setError(null)
    try {
      await api.analyzeLead(saved.id)
      notify(`${saved.customer_name} analyzed and added to leads`)
      navigate(`/leads/${saved.id}`)
    } catch (err) {
      setError(err.message)
      setPhase('failed')
    }
  }

  const submit = async (payload) => {
    setPhase('saving')
    setError(null)
    try {
      const saved = await api.createLead(payload)
      setLead(saved)
      await analyze(saved)
    } catch (err) {
      // Lead could not be saved: return to the form with the input intact
      setError(err.message)
      setPhase('form')
    }
  }

  const reset = () => {
    setLead(null)
    setError(null)
    setPhase('form')
    setFormKey((k) => k + 1)
  }

  return (
    <>
      <PageHeader
        title="Add new lead"
        subtitle="Enter the customer's details and paste their inquiry. The AI will qualify the lead and suggest a response."
      />

      {(phase === 'saving' || phase === 'analyzing') && (
        <AnalyzingPanel step={phase === 'saving' ? 0 : 1} name={lead?.customer_name || 'the customer'} />
      )}

      {phase === 'failed' && lead && (
        <div className="stack">
          <Alert
            type="error"
            actions={
              <>
                <button className="btn btn-sm btn-primary" onClick={() => analyze(lead)}><RefreshCw size={14} /> Retry analysis</button>
                <Link className="btn btn-sm" to={`/leads/${lead.id}`}>Open lead</Link>
              </>
            }
          >
            <strong>The lead was saved, but AI analysis failed.</strong>
            <div>{error}</div>
          </Alert>
          <div className="card card-body">
            <p className="section-text">
              <strong>{lead.customer_name}</strong> has been added to your lead list without an analysis. You can retry now,
              or open the lead and run the analysis later.
            </p>
            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
              <button className="btn" onClick={reset}>Add another lead</button>
            </div>
          </div>
        </div>
      )}

      {/* Kept mounted (just hidden) so the input survives if saving fails */}
      {phase !== 'failed' && (
        <div className="card" style={{ display: phase === 'form' ? undefined : 'none' }}>
          <div className="card-body" style={{ padding: 24 }}>
            {error && <div style={{ marginBottom: 18 }}><Alert type="error">{error}</Alert></div>}
            <LeadForm key={formKey} onSubmit={submit} submitLabel="Analyze Lead with AI" submitIcon={Sparkles} />
          </div>
        </div>
      )}
    </>
  )
}
