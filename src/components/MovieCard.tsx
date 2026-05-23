import { useState } from 'react'
import type { Movie } from '../types/movie'
import { STATUS_LABELS, STATUS_COLORS } from '../types/movie'
import { getPosterUrl } from '../services/tmdb'
import { useMovies } from '../context/MoviesContext'
import styles from './MovieCard.module.css'

interface Props {
  movie: Movie
  onEdit: (m: Movie) => void
}

export default function MovieCard({ movie, onEdit }: Props) {
  const { remove } = useMovies()
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const poster = getPosterUrl(movie.poster_path)

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    try { await remove(movie) } finally { setDeleting(false) }
  }

  return (
    <div className={styles.card}>
      <div className={styles.poster}>
        {poster
          ? <img src={poster} alt={movie.title_ru} loading="lazy" />
          : <div className={styles.noPoster}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
        }
        <div className={styles.overlay}>
          <button className={styles.editBtn} onClick={() => onEdit(movie)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Изменить
          </button>
          {confirmDel
            ? <button className={`${styles.editBtn} ${styles.danger}`} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Удалить?'}
              </button>
            : <button className={`${styles.editBtn} ${styles.dangerSoft}`} onClick={handleDelete}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                </svg>
              </button>
          }
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.statusRow}>
          <span
            className={styles.badge}
            style={{ background: STATUS_COLORS[movie.status] + '22', color: STATUS_COLORS[movie.status] }}
          >
            {STATUS_LABELS[movie.status]}
          </span>
          {movie.rating != null && (
            <span className={styles.rating}>★ {movie.rating}</span>
          )}
        </div>
        <h3 className={styles.titleRu}>{movie.title_ru || movie.title_en}</h3>
        {movie.title_en && movie.title_ru && (
          <p className={styles.titleEn}>{movie.title_en}</p>
        )}
        {movie.year > 0 && (
          <p className={styles.meta}>
            {movie.year}
            {movie.genres.length > 0 && ` · ${movie.genres.slice(0, 2).join(', ')}`}
          </p>
        )}
        {(movie.kinopoisk_url || movie.imdb_url || movie.tmdb_url || movie.wiki_url) && (
          <div className={styles.links}>
            {movie.kinopoisk_url && <a href={movie.kinopoisk_url} target="_blank" rel="noreferrer">КП</a>}
            {movie.imdb_url && <a href={movie.imdb_url} target="_blank" rel="noreferrer">IMDb</a>}
            {movie.tmdb_url && <a href={movie.tmdb_url} target="_blank" rel="noreferrer">TMDB</a>}
            {movie.wiki_url && <a href={movie.wiki_url} target="_blank" rel="noreferrer">Wiki</a>}
          </div>
        )}
      </div>
    </div>
  )
}
