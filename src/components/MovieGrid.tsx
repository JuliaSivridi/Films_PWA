import { useState } from 'react'
import { useMovies } from '../context/MoviesContext'
import MovieList from './MovieList'
import AddMovieModal from './AddMovieModal'
import type { Movie } from '../types/movie'
import styles from './MovieGrid.module.css'

interface Props { alphaOpen: boolean; onAlphaClose: () => void }

function pluralFilm(n: number): string {
  return `${n} ${n === 1 ? 'film' : 'films'}`
}

export default function MovieGrid({ alphaOpen, onAlphaClose }: Props) {
  const { movies, filtered, loading, error } = useMovies()
  const [editing, setEditing] = useState<Movie | null>(null)
  const [showAdd, setShowAdd] = useState(false)

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

  const isFiltered = filtered.length !== movies.length

  return (
    <div className={styles.wrap}>

      {/* Count */}
      {filtered.length > 0 && (
        <p className={styles.resultCount}>
          {isFiltered
            ? `${filtered.length} из ${movies.length}`
            : pluralFilm(filtered.length)}
        </p>
      )}

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

      {/* List */}
      {filtered.length > 0 && (
        <MovieList movies={filtered} onEdit={setEditing} alphaOpen={alphaOpen} onAlphaClose={onAlphaClose} />
      )}

      {/* FAB */}
      <button className={styles.fab} onClick={() => setShowAdd(true)} title="Add movie">
        <span className="material-symbols-outlined">add</span>
      </button>

      {showAdd  && <AddMovieModal                 onClose={() => setShowAdd(false)} />}
      {editing  && <AddMovieModal movie={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
