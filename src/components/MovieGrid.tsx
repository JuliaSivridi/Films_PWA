import { useState } from 'react'
import { useMovies } from '../context/MoviesContext'
import MovieCard from './MovieCard'
import MovieList from './MovieList'
import AddMovieModal from './AddMovieModal'
import type { Movie } from '../types/movie'
import styles from './MovieGrid.module.css'

type ViewMode = 'list' | 'grid'

function savedView(): ViewMode {
  return (localStorage.getItem('films_view') as ViewMode) || 'list'
}

export default function MovieGrid() {
  const { filtered, loading, error } = useMovies()
  const [editing,  setEditing]  = useState<Movie | null>(null)
  const [showAdd,  setShowAdd]  = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(savedView)

  function changeView(mode: ViewMode) {
    setViewMode(mode)
    localStorage.setItem('films_view', mode)
  }

  if (loading) return (
    <div className={styles.center}>
      <div className={styles.spinner} />
    </div>
  )

  if (error) return (
    <div className={styles.center}>
      <p className={styles.error}>{error}</p>
    </div>
  )

  return (
    <div className={styles.wrap}>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.resultCount}>
          {filtered.length} film{filtered.length !== 1 ? 's' : ''}
        </span>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
            onClick={() => changeView('list')}
            title="List view"
          >
            <span className="material-symbols-outlined">format_list_bulleted</span>
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`}
            onClick={() => changeView('grid')}
            title="Grid view"
          >
            <span className="material-symbols-outlined">grid_view</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className={styles.empty}>
          <span className={`material-symbols-outlined ${styles.emptyIcon}`}>movie</span>
          <p>No movies found</p>
          <button className={styles.addFirst} onClick={() => setShowAdd(true)}>
            Add your first movie
          </button>
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && filtered.length > 0 && (
        <MovieList movies={filtered} onEdit={setEditing} />
      )}

      {/* Grid view */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className={styles.grid}>
          {filtered.map(m => (
            <MovieCard key={m.id} movie={m} onEdit={setEditing} />
          ))}
        </div>
      )}

      {/* FAB */}
      <button className={styles.fab} onClick={() => setShowAdd(true)} title="Add movie">
        <span className="material-symbols-outlined">add</span>
      </button>

      {showAdd  && <AddMovieModal                    onClose={() => setShowAdd(false)} />}
      {editing  && <AddMovieModal movie={editing}    onClose={() => setEditing(null)} />}
    </div>
  )
}
