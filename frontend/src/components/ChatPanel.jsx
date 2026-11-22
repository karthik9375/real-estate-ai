import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Bot, Eraser, RefreshCw, Send, Sparkles } from 'lucide-react'
import { api } from '../services/api'
import { CHAT_SUGGESTIONS } from '../utils/constants'
import { formatTime, initials } from '../utils/format'
import { Alert, ErrorState, LoadingState } from './States'

/**
 * Lead-specific AI assistant. History is stored per lead on the backend, so each
 * lead has its own conversation that survives page navigation during the session.
 */
export function ChatPanel({ lead }) {
  const [messages, setMessages] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState(null)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(null) // message currently awaiting a reply
  const [error, setError] = useState(null) // { message, text } for retry
  const listRef = useRef(null)
  const inputRef = useRef(null)

  const loadHistory = async () => {
    setLoadingHistory(true)
    setHistoryError(null)
    try {
      setMessages(await api.getChat(lead.id))
    } catch (err) {
      setHistoryError(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, pending, error])

  const send = async (text) => {
    const message = (text ?? input).trim()
    if (!message || pending) return
    setInput('')
    setError(null)
    setPending({ role: 'user', content: message, created_at: new Date().toISOString() })
    try {
      const res = await api.sendChat(lead.id, message)
      setMessages(res.history)
    } catch (err) {
      setError({ message: err.message, text: message })
    } finally {
      setPending(null)
      inputRef.current?.focus()
    }
  }

  const clear = async () => {
    if (!window.confirm('Clear the conversation for this lead?')) return
    try {
      await api.clearChat(lead.id)
      setMessages([])
      setError(null)
    } catch (err) {
      setError({ message: err.message })
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const userInitials = 'You'
  const shown = pending ? [...messages, pending] : messages
  const failedText = error?.text

  return (
    <div className="card chat">
      <div className="card-header">
        <div>
          <h3 className="card-title"><Sparkles size={16} /> AI sales assistant</h3>
          <p className="small muted" style={{ marginTop: 2 }}>
            Answers are grounded in {lead.customer_name}'s lead details{lead.analysis ? ', AI analysis' : ''} and follow-ups.
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-sm btn-ghost" onClick={clear} disabled={!!pending}><Eraser size={14} /> Clear</button>
        )}
      </div>

      <div className="chat-messages" ref={listRef}>
        {loadingHistory ? (
          <LoadingState label="Loading conversation..." compact />
        ) : historyError ? (
          <ErrorState error={historyError} onRetry={loadHistory} compact title="Could not load conversation" />
        ) : shown.length === 0 && !error ? (
          <div className="state" style={{ margin: 'auto' }}>
            <div className="state-icon"><Bot size={20} /></div>
            <div className="state-title">Ask anything about {lead.customer_name}</div>
            <div className="state-text">
              {lead.analysis
                ? 'Prepare for a call, handle objections, or refine the suggested reply.'
                : 'This lead has not been analyzed yet. The assistant can still use the lead details, but run the analysis for better answers.'}
            </div>
            <div className="chat-suggestions" style={{ marginTop: 10 }}>
              {CHAT_SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          shown.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className="msg-avatar">{m.role === 'user' ? initials(userInitials) : <Bot size={15} />}</div>
              <div style={{ minWidth: 0 }}>
                <div className="msg-bubble">
                  {m.role === 'assistant' ? <div className="md"><ReactMarkdown>{m.content}</ReactMarkdown></div> : m.content}
                </div>
                <div className="msg-time">{formatTime(m.created_at)}</div>
              </div>
            </div>
          ))
        )}

        {pending && (
          <div className="msg assistant">
            <div className="msg-avatar"><Bot size={15} /></div>
            <div className="msg-bubble"><span className="typing"><span /><span /><span /></span></div>
          </div>
        )}

        {error && (
          <Alert
            type="error"
            actions={failedText && (
              <button className="btn btn-sm" onClick={() => send(failedText)}><RefreshCw size={13} /> Retry</button>
            )}
          >
            <strong>AI request failed.</strong> {error.message}
            {failedText && <div className="small" style={{ marginTop: 4 }}>Your message: "{failedText.length > 80 ? failedText.slice(0, 80) + '...' : failedText}"</div>}
          </Alert>
        )}
      </div>

      {messages.length > 0 && !pending && (
        <div className="row" style={{ padding: '10px 16px 0', gap: 6 }}>
          {CHAT_SUGGESTIONS.slice(0, 4).map((s) => (
            <button key={s} className="suggestion" style={{ fontSize: 12 }} onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="chat-input">
        <textarea
          ref={inputRef}
          className="textarea"
          rows={1}
          placeholder={`Ask about ${lead.customer_name}... (Enter to send, Shift+Enter for new line)`}
          value={input}
          maxLength={4000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!!pending || loadingHistory}
        />
        <button className="btn btn-primary" style={{ height: 42 }} onClick={() => send()} disabled={!input.trim() || !!pending}>
          {pending ? <span className="spinner" /> : <Send size={16} />} Send
        </button>
      </div>
    </div>
  )
}
