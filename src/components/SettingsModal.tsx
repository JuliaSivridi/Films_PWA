import { useRef, useState } from 'react'
import { getSheetsId } from '../services/sheets'
import { getTmdbKey } from '../services/tmdb'
import styles from './SettingsModal.module.css'

interface Props { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const [sheetsId, setSheetsId] = useState(getSheetsId())
  const [tmdbKey, setTmdbKey] = useState(getTmdbKey())
  const [saved, setSaved] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  function handleSave() {
    localStorage.setItem('sheets_id', sheetsId.trim())
    localStorage.setItem('tmdb_key', tmdbKey.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Настройки</h2>
          <button className={styles.close} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.field}>
            <label>Google Spreadsheet ID</label>
            <input
              value={sheetsId}
              onChange={e => setSheetsId(e.target.value)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            />
            <p className={styles.hint}>
              Из URL таблицы: docs.google.com/spreadsheets/d/<b>ЭТОТ_ID</b>/edit
            </p>
          </div>
          <div className={styles.field}>
            <label>TMDB API Key</label>
            <input
              type="password"
              value={tmdbKey}
              onChange={e => setTmdbKey(e.target.value)}
              placeholder="Ваш API ключ с themoviedb.org"
            />
            <p className={styles.hint}>
              Получить: <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">themoviedb.org/settings/api</a>
            </p>
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Отмена</button>
          <button className={styles.saveBtn} onClick={handleSave}>
            {saved ? '✓ Сохранено' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
