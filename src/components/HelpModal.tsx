import { useRef } from 'react'
import styles from './SettingsModal.module.css'

interface Props { onClose: () => void }

const SECTIONS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Basics',
    items: [
      ['Add a movie', 'Tap +, search TMDB — title, original title, year, runtime, genres, rating and source links fill in automatically.'],
      ['Edit', 'Tap any movie to edit its status and links.'],
      ['Status dot', 'The colored dot on the poster shows status — green = watched, orange = want.'],
      ['List', 'Each row shows everything at a glance: both titles, year, runtime, rating, countries, genres and links to KP / IMDb / TMDB / Wiki.'],
    ],
  },
  {
    title: 'Find & organize',
    items: [
      ['Search', 'Search by title, genre or keyword.'],
      ['Filters', 'The tune icon opens filters: status, year range, rating range, country. The badge shows active filters.'],
      ['Statistics', 'Open Statistics from the avatar menu for breakdowns of your collection.'],
    ],
  },
  {
    title: 'Data',
    items: [
      ['Where is my data?', 'In a Google Sheets file (db_films) in your own Google Drive — open and inspect it any time.'],
      ['Switch file', 'In Settings you can point the app at a different spreadsheet.'],
    ],
  },
]

export default function HelpModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  return (
    <div className={styles.overlay} ref={overlayRef} onClick={e => e.target === overlayRef.current && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Help</h2>
          <button className={styles.close} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.body}>
          {SECTIONS.map(s => (
            <div className={styles.section} key={s.title}>
              <p className={styles.sectionLabel}>{s.title}</p>
              {s.items.map(([term, text]) => (
                <div key={term} style={{ marginBottom: 10 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{term}</p>
                  <p className={styles.hint} style={{ marginTop: 2 }}>{text}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className={styles.footer}>
          <button className={styles.saveBtn} onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
