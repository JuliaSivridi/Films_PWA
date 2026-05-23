import { useEffect, useRef, useState } from 'react'
import type { Movie, MovieStatus, TMDBMovie } from '../types/movie'
import { STATUS_LABELS } from '../types/movie'
import { searchMovies, getGenres, getPosterUrl } from '../services/tmdb'
import { useMovies } from '../context/MoviesContext'
import styles from './AddMovieModal.module.css'

const BLANK: Omit<Movie, 'id' | 'date_added'> = {
  title_ru: '', title_en: '', year: 0, genres: [], status: 'want',
  rating: undefined, review: undefined,
  tmdb_id: undefined, poster_path: undefined,
  kinopoisk_url: undefined, imdb_url: undefined,
  tmdb_url: undefined, wiki_url: undefined,
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

interface Props { movie?: Movie; onClose: () => void }

export default function AddMovieModal({ movie, onClose }: Props) {
  const isEdit = !!movie
  const { create, edit } = useMovies()
  const [form, setForm] = useState<Omit<Movie, 'id' | 'date_added'>>(
    movie ? { ...movie } : { ...BLANK },
  )
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TMDBMovie[]>([])
  const [tmdbLoading, setTmdbLoading] = useState(false)
  const [genres, setGenres] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => { getGenres().then(setGenres) }, [])

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (tmdbQuery.length < 2) { setTmdbResults([]); return }
    timerRef.current = setTimeout(async () => {
      setTmdbLoading(true)
      const res = await searchMovies(tmdbQuery)
      setTmdbResults(res)
      setTmdbLoading(false)
    }, 450)
    return () => clearTimeout(timerRef.current)
  }, [tmdbQuery])

  function selectTMDB(t: TMDBMovie) {
    const year = t.release_date ? parseInt(t.release_date.slice(0, 4)) : 0
    setForm(f => ({
      ...f,
      title_ru: t.title,
      title_en: t.original_title,
      year,
      genres: t.genre_ids.map(id => genres[id]).filter(Boolean),
      tmdb_id: String(t.id),
      poster_path: t.poster_path || '',
      tmdb_url: `https://www.themoviedb.org/movie/${t.id}`,
      imdb_url: f.imdb_url || `https://www.imdb.com/find?q=${encodeURIComponent(t.original_title)}`,
    }))
    setTmdbQuery('')
    setTmdbResults([])
  }

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave() {
    if (!form.title_ru && !form.title_en) {
      setError('Введите хотя бы одно название')
      return
    }
    setSaving(true)
    setError('')
    try {
      const now = new Date().toISOString()
      if (isEdit && movie) {
        await edit({ ...movie, ...form })
      } else {
        await create({ id: uuid(), date_added: now, ...form })
      }
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  function handleOverlay(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose()
  }

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Редактировать фильм' : 'Добавить фильм'}</h2>
          <button className={styles.close} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.body}>
          {/* TMDB Search */}
          <section className={styles.section}>
            <label className={styles.label}>Поиск в TMDB</label>
            <div className={styles.tmdbSearch}>
              <input
                type="search"
                placeholder="Название фильма…"
                value={tmdbQuery}
                onChange={e => setTmdbQuery(e.target.value)}
              />
              {tmdbLoading && <div className={styles.miniSpinner} />}
            </div>
            {tmdbResults.length > 0 && (
              <div className={styles.tmdbResults}>
                {tmdbResults.map(t => (
                  <button key={t.id} className={styles.tmdbItem} onClick={() => selectTMDB(t)}>
                    <img
                      src={getPosterUrl(t.poster_path, 'w92')}
                      alt=""
                      className={styles.tmdbThumb}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                    <div className={styles.tmdbInfo}>
                      <span className={styles.tmdbTitle}>{t.title}</span>
                      <span className={styles.tmdbYear}>
                        {t.original_title !== t.title && `${t.original_title} · `}
                        {t.release_date?.slice(0, 4)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Preview */}
          {form.poster_path && (
            <div className={styles.preview}>
              <img src={getPosterUrl(form.poster_path, 'w185')} alt="" />
            </div>
          )}

          {/* Titles */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Название (RU)</label>
              <input value={form.title_ru} onChange={e => set('title_ru', e.target.value)} placeholder="Русское название" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Название (EN)</label>
              <input value={form.title_en} onChange={e => set('title_en', e.target.value)} placeholder="English title" />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Год</label>
              <input
                type="number" min="1895" max="2099"
                value={form.year || ''}
                onChange={e => set('year', parseInt(e.target.value) || 0)}
                placeholder="2024"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Жанры</label>
              <input
                value={form.genres.join(', ')}
                onChange={e => set('genres', e.target.value.split(',').map(g => g.trim()).filter(Boolean))}
                placeholder="Боевик, Драма"
              />
            </div>
          </div>

          {/* Status + Rating */}
          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Статус</label>
              <div className={styles.statusGroup}>
                {(Object.keys(STATUS_LABELS) as MovieStatus[]).map(s => (
                  <button
                    key={s}
                    className={`${styles.statusBtn} ${form.status === s ? styles.statusActive : ''}`}
                    data-status={s}
                    onClick={() => set('status', s)}
                    type="button"
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Оценка (1–10)</label>
              <div className={styles.ratingRow}>
                <input
                  type="range" min="1" max="10" step="0.5"
                  value={form.rating ?? ''}
                  onChange={e => set('rating', parseFloat(e.target.value))}
                />
                <span className={styles.ratingVal}>
                  {form.rating != null ? `★ ${form.rating}` : '–'}
                </span>
                {form.rating != null && (
                  <button className={styles.clearBtn} onClick={() => set('rating', undefined)}>×</button>
                )}
              </div>
            </div>
          </div>

          {/* Review */}
          <div className={styles.field}>
            <label className={styles.label}>Заметка</label>
            <textarea
              value={form.review || ''}
              onChange={e => set('review', e.target.value || undefined)}
              placeholder="Впечатления, мысли…"
              rows={3}
            />
          </div>

          {/* Links */}
          <section className={styles.section}>
            <label className={styles.label}>Ссылки</label>
            <div className={styles.links}>
              {[
                { key: 'kinopoisk_url', label: 'Кинопоиск', placeholder: 'https://www.kinopoisk.ru/film/…' },
                { key: 'imdb_url', label: 'IMDb', placeholder: 'https://www.imdb.com/title/…' },
                { key: 'tmdb_url', label: 'TMDB', placeholder: 'https://www.themoviedb.org/movie/…' },
                { key: 'wiki_url', label: 'Wikipedia', placeholder: 'https://ru.wikipedia.org/wiki/…' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className={styles.linkRow}>
                  <span className={styles.linkLabel}>{label}</span>
                  <input
                    value={form[key as keyof typeof form] as string || ''}
                    onChange={e => set(key as keyof typeof form, e.target.value || undefined)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </section>

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Отмена</button>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Сохраняется…' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  )
}
