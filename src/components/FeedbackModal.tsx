import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import styles from './SettingsModal.module.css'

const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL as string | undefined

interface Props { onClose: () => void }

export default function FeedbackModal({ onClose }: Props) {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

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
      setTimeout(onClose, 1200)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Feedback</h2>
          <button className={styles.close} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.section}>
            {!FEEDBACK_URL ? (
              <p className={styles.hint}>Feedback is not configured yet.</p>
            ) : sent ? (
              <p className={styles.hint}>Thank you! Your feedback has been sent.</p>
            ) : (
              <>
                <p className={styles.hint} style={{ marginBottom: 10 }}>
                  Have a suggestion or found a bug? Let me know.
                </p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Your message…"
                  rows={5}
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </>
            )}
          </div>
        </div>
        {!sent && FEEDBACK_URL && (
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button className={styles.saveBtn} onClick={handleSend} disabled={sending || !message.trim()}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
