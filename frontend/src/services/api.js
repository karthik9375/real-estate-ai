// Thin REST client for the FastAPI backend. No API keys ever live in the frontend.
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  let url = `${BASE_URL}${path}`
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString()
    if (qs) url += `?${qs}`
  }

  let res
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(`Cannot reach the backend at ${BASE_URL}. Make sure the API server is running.`, 0)
  }

  if (res.status === 204) return null
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : `Request failed (${res.status})`
    throw new ApiError(detail, res.status)
  }
  return data
}

export const api = {
  health: () => request('/api/health'),

  // Leads
  listLeads: (params) => request('/api/leads', { params }),
  getLead: (id) => request(`/api/leads/${id}`),
  createLead: (lead) => request('/api/leads', { method: 'POST', body: lead }),
  updateLead: (id, changes) => request(`/api/leads/${id}`, { method: 'PUT', body: changes }),
  deleteLead: (id) => request(`/api/leads/${id}`, { method: 'DELETE' }),
  analyzeLead: (id) => request(`/api/leads/${id}/analyze`, { method: 'POST' }),

  // Lead chat
  getChat: (id) => request(`/api/leads/${id}/chat`),
  sendChat: (id, message) => request(`/api/leads/${id}/chat`, { method: 'POST', body: { message } }),
  clearChat: (id) => request(`/api/leads/${id}/chat`, { method: 'DELETE' }),

  // Follow-ups
  listFollowups: (params) => request('/api/followups', { params }),
  createFollowup: (f) => request('/api/followups', { method: 'POST', body: f }),
  updateFollowup: (id, changes) => request(`/api/followups/${id}`, { method: 'PUT', body: changes }),
  deleteFollowup: (id) => request(`/api/followups/${id}`, { method: 'DELETE' }),

  // Dashboard
  dashboardStats: () => request('/api/dashboard/stats'),
}
