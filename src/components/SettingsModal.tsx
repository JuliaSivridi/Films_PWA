import { useRef, useState } from 'react'
import { getTmdbKey } from '../services/tmdb'
import { getSheetId, getSheetName, setSheetFile, listUserSheets } from '../services/drive'
import { useMovies } from '../context/MoviesContext'
import styles from './SettingsModal.module.css'

interface SheetFile { id: string; name: string }

interface Props { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const { load } = useMovies()
  const [tmdbKey, setTmdbKey] = useState(getTmdbKey())
  const [saved, setSaved] = useState(false)

  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerFiles, setPickerFiles] = useState<SheetFile[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerError, setPickerError] = useState('')

  const currentId = getSheetId()
  const currentName = getSheetName()
  const overlayRef = useRef<HTMLDivElement>(null)

  async function handleOpenPicker() {
    if (pickerOpen) { setPickerOpen(false); return }
    setPickerOpen(true)
    setPickerLoading(true)
    setPickerError('')
    try {
      const files = await listUserSheets()
      setPickerFiles(files)
    } catch (e) {
      setPickerError(String(e))
    } finally {
      setPickerLoading(false)
    }
  }

  async function handlePickFile(file: SheetFile) {
    setPickerOpen(false)
    if (file.id === currentId) return
    setSheetFile(file.id, file.name)
    try { await load() } catch (e) { console.error(e) }
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
                aria-expanded={pickerOpen}
              >
                {pickerOpen ? 'Cancel' : 'Change'}
              </button>
            </div>

            {pickerOpen && (
              <div className={styles.picker}>
                {pickerLoading && (
                  <div className={styles.pickerEmpty}>
                    <div className={styles.miniSpinner} /> Loading files…
                  </div>
                )}
                {pickerError && (
                  <div className={styles.pickerError}>{pickerError}</div>
                )}
                {!pickerLoading && !pickerError && pickerFiles.length === 0 && (
                  <div className={styles.pickerEmpty}>No Google Sheets found</div>
                )}
                {!pickerLoading && pickerFiles.map(file => (
                  <button
                    key={file.id}
                    className={`${styles.pickerItem} ${file.id === currentId ? styles.pickerItemActive : ''}`}
                    onClick={() => handlePickFile(file)}
                  >
                    <span className={styles.pickerName}>{file.name}</span>
                    {file.id === currentId && (
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                    )}
                  </button>
                ))}
              </div>
            )}
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
