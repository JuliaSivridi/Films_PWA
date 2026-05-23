import { useEffect, useRef, useState } from 'react'
import { useMovies } from '../context/MoviesContext'
import { useAuth } from '../context/AuthContext'
import SettingsModal from './SettingsModal'
import type { MovieStatus } from '../types/movie'
import styles from './Header.module.css'

const TABS: { key: MovieStatus | 'all'; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'want',    label: 'Want' },
  { key: 'watched', label: 'Watched' },
]

export default function Header() {
  const { query, setQuery, statusFilter, setFilter, movies } = useMovies()
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    all:     movies.length,
    want:    movies.filter(m => m.status === 'want').length,
    watched: movies.filter(m => m.status === 'watched').length,
  }

  return (
    <>
      <header className={styles.header}>
        <div className={styles.top}>
          <div className={styles.logo}>
            <img src="/icons/icon.svg" width={26} height={26} alt="" />
            <span>Films</span>
          </div>

          <div className={styles.search}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="search"
              placeholder="Search by title or genre…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* Avatar + dropdown */}
          <div className={styles.userWrap} ref={menuRef}>
            <button
              className={styles.avatarBtn}
              onClick={() => setMenuOpen(o => !o)}
              title={user?.name ?? 'Account'}
            >
              {user?.picture
                ? <img src={user.picture} alt={user?.name ?? ''} className={styles.avatarImg} referrerPolicy="no-referrer" />
                : <span className={styles.avatarFallback}>{user?.name?.[0]?.toUpperCase() ?? '?'}</span>
              }
            </button>

            {menuOpen && (
              <div className={styles.menu} role="menu">
                <div className={styles.menuHeader}>
                  <span className={styles.menuName}>{user?.name}</span>
                  <span className={styles.menuEmail}>{user?.email}</span>
                </div>
                <div className={styles.menuDivider} />
                <button
                  className={styles.menuItem}
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); setShowSettings(true) }}
                >
                  <span className="material-symbols-outlined">settings</span>
                  Settings
                </button>
                <div className={styles.menuDivider} />
                <button
                  className={`${styles.menuItem} ${styles.menuSignOut}`}
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); signOut() }}
                >
                  <span className="material-symbols-outlined">logout</span>
                  Sign out
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
