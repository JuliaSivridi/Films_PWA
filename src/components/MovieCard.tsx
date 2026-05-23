import { useState } from 'react'
import type { Movie } from '../types/movie'
import { STATUS_LABELS, STATUS_COLORS } from '../types/movie'
import { getPosterUrl, formatDuration } from '../services/tmdb'
import { useMovies } from '../context/MoviesContext'
import styles from './MovieCard.module.css'

interface Props {
  movie: Movie
  onEdit: (m: Movie) => void
}

export default function MovieCard({ movie, onEdit }: Props) {
  const { remove } = useMovies()
  const [deleting,   setDeleting]   = useState(false)
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
          ? <img src={poster} alt={movie.title_orig || movie.title_ru} loading="lazy" />
          : <div className={styles.noPoster}>
              <span className="material-symbols-outlined">image</span>
            </div>
        }
        <div className={styles.overlay}>
          <button className={styles.editBtn} onClick={() => onEdit(movie)}>
            <span className="material-symbols-outlined">edit</span>
            Edit
          </button>
          {confirmDel
            ? <button className={`${styles.editBtn} ${styles.danger}`} onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Confirm?'}
              </button>
            : <button className={`${styles.editBtn} ${styles.dangerSoft}`} onClick={handleDelete}>
                <span className="material-symbols-outlined">delete</span>
              </button>
          }
        </div>
      </div>

      <div className={styles.info}>
        {/* Status + rating row */}
        <div className={styles.statusRow}>
          <span
            className={styles.badge}
            style={{ background: STATUS_COLORS[movie.status] + '22', color: STATUS_COLORS[movie.status] }}
          >
            {STATUS_LABELS[movie.status]}
          </span>
          {movie.tmdb_rating != null && (
            <span className={styles.rating}>★ {movie.tmdb_rating}</span>
          )}
        </div>

        <h3 className={styles.titleRu}>{movie.title_ru || movie.title_orig}</h3>

        {movie.title_orig && movie.title_ru && (
          <p className={styles.titleEn}>{movie.title_orig}</p>
        )}

        {/* Year + duration */}
        {(movie.year > 0 || movie.duration_min) && (
          <p className={styles.meta}>
            {movie.year > 0 && movie.year}
            {movie.year > 0 && movie.duration_min ? ' · ' : ''}
            {movie.duration_min ? formatDuration(movie.duration_min) : ''}
          </p>
        )}

        {/* Genres */}
        {movie.genres && movie.genres.length > 0 && (
          <p className={styles.genres}>
            {movie.genres.slice(0, 3).join(' · ')}
          </p>
        )}

        {/* External links */}
        {(movie.kinopoisk_url || movie.imdb_url || movie.tmdb_url || movie.wiki_url) && (
          <div className={styles.links}>
            {movie.kinopoisk_url && <a href={movie.kinopoisk_url} target="_blank" rel="noreferrer">KP</a>}
            {movie.imdb_url      && <a href={movie.imdb_url}      target="_blank" rel="noreferrer">IMDb</a>}
            {movie.tmdb_url      && <a href={movie.tmdb_url}      target="_blank" rel="noreferrer">TMDB</a>}
            {movie.wiki_url      && <a href={movie.wiki_url}      target="_blank" rel="noreferrer">Wiki</a>}
          </div>
        )}
      </div>
    </div>
  )
}
