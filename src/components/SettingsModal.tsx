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

  // File picker
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
    try {
      await load()
    } catch (e) {
      console.error(e)
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
          <h2>Настройки</h2>
          <button className={styles.close} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>

          {/* Google Sheets file picker */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Google Таблица</p>
            <div className={styles.fileRow}>
              <div className={styles.fileIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{currentName || 'Файл не выбран'}</span>
                <span className={styles.fileDesc}>Источник данных фильмотеки</span>
              </div>
              <button
                className={styles.changeBtn}
                onClick={handleOpenPicker}
                aria-expanded={pickerOpen}
              >
                {pickerOpen ? 'Отмена' : 'Изменить'}
              </button>
            </div>

            {pickerOpen && (
              <div className={styles.picker}>
                {pickerLoading && (
                  <div className={styles.pickerEmpty}>
                    <div className={styles.miniSpinner} /> Загружаем файлы…
                  </div>
                )}
                {pickerError && (
                  <div className={styles.pickerError}>{pickerError}</div>
                )}
                {!pickerLoading && !pickerError && pickerFiles.length === 0 && (
                  <div className={styles.pickerEmpty}>Таблицы не найдены</div>
                )}
                {!pickerLoading && pickerFiles.map(file => (
                  <button
                    key={file.id}
                    className={`${styles.pickerItem} ${file.id === currentId ? styles.pickerItemActive : ''}`}
                    onClick={() => handlePickFile(file)}
                  >
                    <span className={styles.pickerName}>{file.name}</span>
                    {file.id === currentId && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TMDB key */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>TMDB API Key</p>
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
