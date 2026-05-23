import { useRef, useState } from 'react'
import { getTmdbKey } from '../services/tmdb'
import { clearSheetId, getSheetId } from '../services/drive'
import { useMovies } from '../context/MoviesContext'
import styles from './SettingsModal.module.css'

interface Props { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const { load } = useMovies()
  const [tmdbKey, setTmdbKey] = useState(getTmdbKey())
  const [saved, setSaved] = useState(false)
  const [resetting, setResetting] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const sheetId = getSheetId()

  function handleSave() {
    localStorage.setItem('tmdb_key', tmdbKey.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  async function handleReset() {
    setResetting(true)
    clearSheetId()
    try {
      const { findOrCreateFilmsFile } = await import('../services/drive')
      await findOrCreateFilmsFile()
      await load()
    } catch (e) {
      console.error(e)
    }
    setResetting(false)
    onClose()
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
            <label>TMDB API Key</label>
            <input
              type="password"
              value={tmdbKey}
              onChange={e => setTmdbKey(e.target.value)}
              placeholder="Ключ с themoviedb.org"
              autoComplete="off"
            />
            <p className={styles.hint}>
              Получить: <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">themoviedb.org/settings/api</a>
            </p>
          </div>

          <div className={styles.field}>
            <label>Google Таблица</label>
            <p className={styles.sheetId}>
              {sheetId
                ? <>ID: <code>{sheetId.slice(0, 20)}…</code></>
                : 'Не подключена'}
            </p>
            <button className={styles.resetBtn} onClick={handleReset} disabled={resetting}>
              {resetting ? 'Переподключение…' : '↻ Переподключить таблицу'}
            </button>
            <p className={styles.hint}>Ищет или создаёт файл <b>db_films</b> на вашем Google Drive</p>
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
