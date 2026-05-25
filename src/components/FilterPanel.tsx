import { useMovies } from '../context/MoviesContext'
import { STATUS_LABELS } from '../types/movie'
import type { MovieStatus } from '../types/movie'
import styles from './FilterPanel.module.css'

const STATUS_OPTIONS: { key: MovieStatus | 'all'; label: string }[] = [
  { key: 'all',     label: 'All' },
  { key: 'want',    label: STATUS_LABELS.want },
  { key: 'watched', label: STATUS_LABELS.watched },
]

export default function FilterPanel() {
  const { filters, setFilters, clearFilters, activeFilterCount } = useMovies()

  return (
    <div className={styles.panel}>

      {/* Status ──────────────────────────────────────────────── */}
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Status</span>
        <div className={styles.chips}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.key}
              className={`${styles.chip} ${filters.status === s.key ? styles.chipActive : ''}`}
              data-status={s.key}
              onClick={() => setFilters({ status: s.key })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Year ────────────────────────────────────────────────── */}
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Year</span>
        <div className={styles.rangeInputs}>
          <input
            type="number"
            placeholder="from"
            min="1895" max="2099"
            value={filters.yearFrom ?? ''}
            onChange={e => setFilters({ yearFrom: parseInt(e.target.value) || null })}
          />
          <span className={styles.dash}>—</span>
          <input
            type="number"
            placeholder="to"
            min="1895" max="2099"
            value={filters.yearTo ?? ''}
            onChange={e => setFilters({ yearTo: parseInt(e.target.value) || null })}
          />
        </div>
      </div>

      {/* Rating ──────────────────────────────────────────────── */}
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Rating</span>
        <div className={styles.rangeInputs}>
          <input
            type="number"
            placeholder="from"
            min="0" max="10" step="0.1"
            value={filters.ratingFrom ?? ''}
            onChange={e => setFilters({ ratingFrom: parseFloat(e.target.value) || null })}
          />
          <span className={styles.dash}>—</span>
          <input
            type="number"
            placeholder="to"
            min="0" max="10" step="0.1"
            value={filters.ratingTo ?? ''}
            onChange={e => setFilters({ ratingTo: parseFloat(e.target.value) || null })}
          />
        </div>
      </div>

      {/* Genre / Keyword ─────────────────────────────────────── */}
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Genre / Keyword</span>
        <input
          className={styles.kwInput}
          type="search"
          placeholder="fairy tale, drama…"
          value={filters.genreKeyword}
          onChange={e => setFilters({ genreKeyword: e.target.value })}
        />
      </div>

      {/* Clear ───────────────────────────────────────────────── */}
      {activeFilterCount > 0 && (
        <button className={styles.clearBtn} onClick={clearFilters}>
          Clear all filters
        </button>
      )}

    </div>
  )
}
