import { useState } from 'react'
import styles from './LoginPage.module.css'
import sStyles from './SettingsModal.module.css'

interface Props { onDone: (clientId: string) => void }

export default function SetupPage({ onDone }: Props) {
  const [clientId, setClientId] = useState('')
  const [sheetsId, setSheetsId] = useState('')
  const [tmdbKey, setTmdbKey] = useState('')

  function handleSubmit() {
    const id = clientId.trim()
    if (!id) return
    localStorage.setItem('google_client_id', id)
    if (sheetsId.trim()) localStorage.setItem('sheets_id', sheetsId.trim())
    if (tmdbKey.trim()) localStorage.setItem('tmdb_key', tmdbKey.trim())
    onDone(id)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ maxWidth: 460, textAlign: 'left' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/icons/icon.svg" width={56} height={56} alt="" style={{ marginBottom: 12 }} />
          <h1 className={styles.title}>Настройка Films</h1>
          <p className={styles.sub}>Первый запуск — укажи ключи API</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={sStyles.field}>
            <label className={sStyles.field}>Google OAuth Client ID *</label>
            <input
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="*.apps.googleusercontent.com"
            />
            <p style={{ fontSize: '.73rem', color: 'var(--text-3)', marginTop: 4 }}>
              Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs
            </p>
          </div>
          <div className={sStyles.field}>
            <label>Google Spreadsheet ID</label>
            <input
              value={sheetsId}
              onChange={e => setSheetsId(e.target.value)}
              placeholder="ID таблицы из URL"
            />
          </div>
          <div className={sStyles.field}>
            <label>TMDB API Key</label>
            <input
              type="password"
              value={tmdbKey}
              onChange={e => setTmdbKey(e.target.value)}
              placeholder="Ключ с themoviedb.org"
            />
          </div>

          <button
            className={styles.btn}
            style={{ background: 'var(--accent)', color: '#fff', border: 'none', marginTop: 8 }}
            onClick={handleSubmit}
            disabled={!clientId.trim()}
          >
            Начать
          </button>
        </div>
      </div>
    </div>
  )
}
