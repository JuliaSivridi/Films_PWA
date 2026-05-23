import { useState } from 'react'
import { useMovies } from '../context/MoviesContext'
import MovieCard from './MovieCard'
import AddMovieModal from './AddMovieModal'
import type { Movie } from '../types/movie'
import styles from './MovieGrid.module.css'

export default function MovieGrid() {
  const { filtered, loading, error } = useMovies()
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

  return (
    <div className={styles.wrap}>
      {filtered.length === 0 && (
        <div className={styles.empty}>
          <p>Фильмов не найдено</p>
          <button className={styles.addFirst} onClick={() => setShowAdd(true)}>
            + Добавить первый фильм
          </button>
        </div>
      )}
      <div className={styles.grid}>
        {filtered.map(m => (
          <MovieCard key={m.id} movie={m} onEdit={setEditing} />
        ))}
      </div>

      <button className={styles.fab} onClick={() => setShowAdd(true)} title="Добавить фильм">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>

      {showAdd && <AddMovieModal onClose={() => setShowAdd(false)} />}
      {editing && <AddMovieModal movie={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
