import { useEffect, useRef, useState } from 'react'
import { useMovies } from '../context/MoviesContext'
import { useAuth } from '../context/AuthContext'
import SettingsModal from './SettingsModal'
import FilterPanel from './FilterPanel'
import styles from './Header.module.css'

interface Props { onLogoClick: () => void; onStatsClick: () => void }

export default function Header({ onLogoClick, onStatsClick }: Props) {
  const { query, setQuery, activeFilterCount } = useMovies()
  const { user, signOut } = useAuth()
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [filterOpen,   setFilterOpen]   = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <>
      <header className={styles.header}>

        {/* ── top row ─────────────────────────────────────────── */}
        <div className={styles.top}>
          <button className={styles.logo} onClick={onLogoClick} title="Jump to letter">
            <img src="/icons/icon.svg" width={26} height={26} alt="" />
            <span>Films</span>
          </button>

          <div className={styles.search}>
            <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
            <input
              type="search"
              placeholder="Search by title, genre, keyword…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          {/* Filter toggle */}
          <button
            className={`${styles.filterBtn} ${filterOpen || activeFilterCount > 0 ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterOpen(o => !o)}
            title="Filters"
            aria-expanded={filterOpen}
          >
            <span className="material-symbols-outlined">tune</span>
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
          </button>

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
                  onClick={() => { setMenuOpen(false); onStatsClick() }}
                >
                  <span className="material-symbols-outlined">bar_chart</span>
                  Statistics
                </button>
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

        {/* ── filter panel (collapsible) ──────────────────────── */}
        {filterOpen && <FilterPanel />}

      </header>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  )
}
