import { useState } from 'react'
import { Save } from 'lucide-react'
import { api } from '../services/api'
import { useApi } from '../hooks/useApi'
import { LeadForm } from './LeadForm'
import { Modal } from './Modal'
import { Alert, ErrorState, LoadingState } from './States'
import { useToast } from './Toast'

/** Edit a lead's information. Loads the full lead when only an id is supplied. */
export function EditLeadModal({ leadId, lead: initialLead, onClose, onSaved }) {
  const { data: lead, loading, error, reload } = useApi(
    () => (initialLead ? Promise.resolve(initialLead) : api.getLead(leadId)),
    [leadId, initialLead],
  )
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const notify = useToast()

  const submit = async (payload) => {
    setBusy(true)
    setSaveError(null)
    try {
      const updated = await api.updateLead(lead.id, payload)
      notify(updated.analysis_outdated ? 'Lead updated - re-analyze to refresh the AI insights' : 'Lead updated')
      onSaved?.(updated)
      onClose()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Edit lead" size="lg" onClose={onClose} busy={busy}>
      {loading ? (
        <LoadingState compact />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} compact />
      ) : (
        <>
          {saveError && <div style={{ marginBottom: 16 }}><Alert type="error">{saveError}</Alert></div>}
          <LeadForm initial={lead} onSubmit={submit} onCancel={onClose} submitLabel="Save changes" submitIcon={Save} busy={busy} />
        </>
      )}
    </Modal>
  )
}
