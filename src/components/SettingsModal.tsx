import { useRef, useState } from 'react'
import { getTmdbKey } from '../services/tmdb'
import { getSheetId, getSheetName, setSheetFile } from '../services/drive'
import { openSpreadsheetPicker } from '../services/picker'
import { PICKER_API_KEY, PICKER_APP_ID } from '../App'
import { useMovies } from '../context/MoviesContext'
import styles from './SettingsModal.module.css'

interface Props { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const { load } = useMovies()
  const [tmdbKey, setTmdbKey] = useState(getTmdbKey())
  const [saved, setSaved] = useState(false)
  const [pickerError, setPickerError] = useState('')

  const currentId = getSheetId()
  const currentName = getSheetName()
  const overlayRef = useRef<HTMLDivElement>(null)

  // Native Google Picker: picking a file also grants the app access to it
  // (we only have the drive.file scope — the rest of Drive is invisible).
  async function handleOpenPicker() {
    setPickerError('')
    try {
      const file = await openSpreadsheetPicker(PICKER_API_KEY, PICKER_APP_ID)
      if (!file || file.id === currentId) return
      setSheetFile(file.id, file.name)
      try { await load() } catch (e) { console.error(e) }
      onClose()
    } catch (e) {
      setPickerError(String(e))
    }
  }

  function handleSave() {
    localStorage.setItem('tmdb_key', tmdbKey.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 700)
  }

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Settings</h2>
          <button className={styles.close} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.body}>

          {/* Spreadsheet picker */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Google Spreadsheet</p>
            <div className={styles.fileRow}>
              <span className={`material-symbols-outlined ${styles.fileIcon}`}>table_chart</span>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{currentName || 'No file connected'}</span>
                <span className={styles.fileDesc}>Films data source</span>
              </div>
              <button
                className={styles.changeBtn}
                onClick={handleOpenPicker}
              >
                Change
              </button>
            </div>

            {pickerError && <div className={styles.pickerError}>{pickerError}</div>}
          </div>

          {/* TMDB Key */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>TMDB API Key</p>
            <input
              type="password"
              value={tmdbKey}
              onChange={e => setTmdbKey(e.target.value)}
              placeholder="Your key from themoviedb.org"
              autoComplete="off"
            />
            <p className={styles.hint}>
              Get key: <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">themoviedb.org/settings/api</a>
            </p>
          </div>

        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
