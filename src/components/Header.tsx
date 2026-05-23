import { useEffect, useRef, useState } from 'react'
import { useMovies } from '../context/MoviesContext'
import { useAuth } from '../context/AuthContext'
import SettingsModal from './SettingsModal'
import type { MovieStatus } from '../types/movie'
import styles from './Header.module.css'

const TABS: { key: MovieStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'watching', label: 'Смотрю' },
  { key: 'want', label: 'Хочу' },
  { key: 'watched', label: 'Посмотрел' },
]

export default function Header() {
  const { query, setQuery, statusFilter, setFilter, movies } = useMovies()
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const counts = {
    all: movies.length,
    watching: movies.filter(m => m.status === 'watching').length,
    want: movies.filter(m => m.status === 'want').length,
    watched: movies.filter(m => m.status === 'watched').length,
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.top}>
          <div className={styles.logo}>
            <img src="/icons/icon.svg" width={28} height={28} alt="" />
            <span>Films</span>
          </div>

          <div className={styles.search}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              placeholder="Поиск по названию или жанру…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* User avatar + dropdown */}
          <div className={styles.userWrap} ref={menuRef}>
            <button
              className={styles.avatarBtn}
              onClick={() => setMenuOpen(o => !o)}
              title={user?.name ?? 'Профиль'}
            >
              {user?.picture
                ? <img src={user.picture} alt={user.name} className={styles.avatarImg} referrerPolicy="no-referrer" />
                : <span className={styles.avatarFallback}>{user?.name?.[0]?.toUpperCase() ?? '?'}</span>
              }
            </button>

            {menuOpen && (
              <div className={styles.menu}>
                <div className={styles.menuHeader}>
                  <span className={styles.menuName}>{user?.name}</span>
                  <span className={styles.menuEmail}>{user?.email}</span>
                </div>
                <div className={styles.menuDivider} />
                <button className={styles.menuItem} onClick={() => { setMenuOpen(false); setShowSettings(true) }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                  Настройки
                </button>
                <div className={styles.menuDivider} />
                <button
                  className={`${styles.menuItem} ${styles.menuSignOut}`}
                  onClick={() => { setMenuOpen(false); signOut() }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${statusFilter === t.key ? styles.active : ''}`}
              onClick={() => setFilter(t.key)}
              data-status={t.key}
            >
              {t.label}
              <span className={styles.count}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
