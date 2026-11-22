import { useState } from 'react'
import { BUYING_TIMELINES, PROPERTY_REQUIREMENTS } from '../utils/constants'

const EMPTY = {
  customer_name: '',
  location: '',
  property_requirement: '',
  property_requirement_other: '',
  budget: '',
  buying_timeline: '',
  customer_message: '',
}

const MESSAGE_MAX = 10000

export function validateLead(v) {
  const e = {}
  const name = v.customer_name.trim()
  if (!name) e.customer_name = 'Customer name is required'
  else if (name.length < 2) e.customer_name = 'Enter at least 2 characters'
  const loc = v.location.trim()
  if (!loc) e.location = 'Location is required'
  else if (loc.length < 2) e.location = 'Enter at least 2 characters'
  if (!v.property_requirement) e.property_requirement = 'Select a property requirement'
  if (v.property_requirement === 'Other' && !v.property_requirement_other.trim())
    e.property_requirement_other = 'Describe the property requirement'
  if (!v.budget.trim()) e.budget = 'Budget is required (use "Not disclosed" if unknown)'
  if (!v.buying_timeline) e.buying_timeline = 'Select a buying timeline'
  const msg = v.customer_message.trim()
  if (!msg) e.customer_message = 'Paste the customer inquiry, email or chat'
  else if (msg.length < 10) e.customer_message = 'Message is too short to analyze (min 10 characters)'
  else if (msg.length > MESSAGE_MAX) e.customer_message = `Message is too long (max ${MESSAGE_MAX} characters)`
  return e
}

export function toPayload(v) {
  return {
    customer_name: v.customer_name.trim(),
    location: v.location.trim(),
    property_requirement: v.property_requirement,
    property_requirement_other: v.property_requirement === 'Other' ? v.property_requirement_other.trim() : null,
    budget: v.budget.trim(),
    buying_timeline: v.buying_timeline,
    customer_message: v.customer_message.trim(),
  }
}

/**
 * Reusable lead form for creating and editing leads.
 * Calls onSubmit(payload) with a cleaned payload once client-side validation passes.
 */
export function LeadForm({ initial, onSubmit, onCancel, submitLabel, submitIcon: SubmitIcon, busy }) {
  const [values, setValues] = useState(() => ({
    ...EMPTY,
    ...(initial ? Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v ?? ''])) : {}),
  }))
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)

  const set = (field) => (e) => {
    const next = { ...values, [field]: e.target ? e.target.value : e }
    setValues(next)
    if (touched) setErrors(validateLead(next))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouched(true)
    const errs = validateLead(values)
    setErrors(errs)
    if (Object.keys(errs).length) {
      const first = document.querySelector(`[name="${Object.keys(errs)[0]}"]`)
      first?.focus()
      return
    }
    onSubmit(toPayload(values))
  }

  const fieldProps = (name) => ({
    name,
    id: name,
    value: values[name],
    onChange: set(name),
    disabled: busy,
    'aria-invalid': !!errors[name],
  })

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="customer_name">Customer name<span className="req">*</span></label>
          <input className={`input ${errors.customer_name ? 'invalid' : ''}`} placeholder="Full name" maxLength={120} {...fieldProps('customer_name')} />
          {errors.customer_name && <span className="field-error">{errors.customer_name}</span>}
        </div>

        <div className="field">
          <label htmlFor="location">Location<span className="req">*</span></label>
          <input className={`input ${errors.location ? 'invalid' : ''}`} placeholder="City, locality or area" maxLength={200} {...fieldProps('location')} />
          {errors.location && <span className="field-error">{errors.location}</span>}
        </div>

        <div className="field">
          <label htmlFor="property_requirement">Property requirement<span className="req">*</span></label>
          <select className={`select input ${errors.property_requirement ? 'invalid' : ''}`} {...fieldProps('property_requirement')}>
            <option value="">Select property type</option>
            {PROPERTY_REQUIREMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.property_requirement && <span className="field-error">{errors.property_requirement}</span>}
        </div>

        <div className="field">
          <label htmlFor="budget">Budget<span className="req">*</span></label>
          <input className={`input ${errors.budget ? 'invalid' : ''}`} placeholder="e.g. 80 Lakh - 1 Cr" maxLength={120} {...fieldProps('budget')} />
          {errors.budget && <span className="field-error">{errors.budget}</span>}
        </div>

        {values.property_requirement === 'Other' && (
          <div className="field full">
            <label htmlFor="property_requirement_other">Describe the requirement<span className="req">*</span></label>
            <input className={`input ${errors.property_requirement_other ? 'invalid' : ''}`} placeholder="e.g. 4 BHK penthouse, farmhouse" maxLength={200} {...fieldProps('property_requirement_other')} />
            {errors.property_requirement_other && <span className="field-error">{errors.property_requirement_other}</span>}
          </div>
        )}

        <div className="field full">
          <label>Buying timeline<span className="req">*</span></label>
          <div className="pill-group" role="radiogroup" aria-label="Buying timeline">
            {BUYING_TIMELINES.map((t) => (
              <button
                type="button"
                key={t}
                name="buying_timeline"
                role="radio"
                aria-checked={values.buying_timeline === t}
                className={`pill-option ${values.buying_timeline === t ? 'selected' : ''}`}
                onClick={() => set('buying_timeline')(t)}
                disabled={busy}
              >
                {t}
              </button>
            ))}
          </div>
          {errors.buying_timeline && <span className="field-error">{errors.buying_timeline}</span>}
        </div>

        <div className="field full">
          <label htmlFor="customer_message">Customer message<span className="req">*</span></label>
          <textarea
            className={`textarea ${errors.customer_message ? 'invalid' : ''}`}
            rows={8}
            placeholder="Paste the customer's inquiry, email, or chat conversation here..."
            {...fieldProps('customer_message')}
          />
          <div className="field-hint">
            {errors.customer_message
              ? <span className="field-error">{errors.customer_message}</span>
              : <span>The AI analyzes this text together with the fields above.</span>}
            <span>{values.customer_message.length.toLocaleString()} / {MESSAGE_MAX.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="form-actions">
        {onCancel && <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancel</button>}
        <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
          {busy ? <span className="spinner" /> : SubmitIcon && <SubmitIcon size={17} />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
