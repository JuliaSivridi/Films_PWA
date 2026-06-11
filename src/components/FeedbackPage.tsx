import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import pageStyles from './StatsPage.module.css'
import modalStyles from './SettingsModal.module.css'

const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL as string | undefined

export default function FeedbackPage() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    if (!message.trim() || sending || !FEEDBACK_URL) return
    setSending(true)
    try {
      const body = new URLSearchParams()
      body.append('app', 'Films')
      body.append('email', user?.email ?? '')
      body.append('message', message.trim())
      await fetch(FEEDBACK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      setSent(true)
      setMessage('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={pageStyles.page}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 32px' }}>
        {!FEEDBACK_URL ? (
          <p style={{ color: 'var(--text-muted, #9ca3af)' }}>Feedback is not configured yet.</p>
        ) : sent ? (
          <p style={{ color: 'var(--text-muted, #9ca3af)' }}>Thank you! Your feedback has been sent.</p>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted, #9ca3af)', marginBottom: 12, fontSize: '0.95rem' }}>
              Have a suggestion or found a bug? Let me know.
            </p>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Your message…"
              rows={6}
              style={{ width: '100%', resize: 'vertical', marginBottom: 12 }}
            />
            <div>
              <button
                className={modalStyles.saveBtn}
                onClick={handleSend}
                disabled={sending || !message.trim()}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
