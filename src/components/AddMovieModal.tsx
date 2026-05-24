import { useEffect, useMemo, useRef, useState } from 'react'
import type { Movie, MovieStatus, TMDBMovie } from '../types/movie'
import { STATUS_LABELS } from '../types/movie'
import { searchMovies, getPosterUrl, getGenres, getMovieDetails } from '../services/tmdb'
import { lookupFilmByImdbId } from '../services/wikidata'
import { useMovies } from '../context/MoviesContext'
import styles from './AddMovieModal.module.css'

/* ── types ────────────────────────────────────────────────────────── */

type Phase    = 'search' | 'form'
type FormData = Omit<Movie, 'id' | '_row'>

const BLANK: FormData = {
  title_ru: '', title_orig: '', year: 0, status: 'watched', // default: Watched
  tmdb_id: undefined, poster_path: undefined,
  genres: undefined, tmdb_rating: undefined, duration_min: undefined,
  kinopoisk_url: undefined, imdb_url: undefined,
  tmdb_url: undefined, wiki_url: undefined,
}

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

interface Props { movie?: Movie; onClose: () => void }

/* ── component ────────────────────────────────────────────────────── */

export default function AddMovieModal({ movie, onClose }: Props) {
  const { create, edit, movies } = useMovies()

  /* editTarget: the existing Movie being edited (from prop or duplicate found in search) */
  const [editTarget, setEditTarget] = useState<Movie | null>(movie ?? null)
  const isEdit = !!editTarget

  const [phase, setPhase]               = useState<Phase>(movie ? 'form' : 'search')
  const [form,  setForm]                = useState<FormData>(movie ? { ...movie } : { ...BLANK })

  /* tmdb_id → Movie lookup for duplicate detection */
  const tmdbIndex = useMemo(() => {
    const map: Record<string, Movie> = {}
    movies.forEach(m => { if (m.tmdb_id) map[m.tmdb_id] = m })
    return map
  }, [movies])
  const [linksLoading, setLinksLoading] = useState(false)

  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<TMDBMovie[]>([])
  const [searching, setSearching] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const timerRef      = useRef<ReturnType<typeof setTimeout>>()
  const overlayRef    = useRef<HTMLDivElement>(null)
  const currentTmdbId = useRef<string | null>(null)

  /* ── debounced TMDB search ──────────────────────────────────────── */

  useEffect(() => {
    clearTimeout(timerRef.current)
    if (query.length < 2) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await searchMovies(query)
      setResults(res)
      setSearching(false)
    }, 400)
    return () => clearTimeout(timerRef.current)
  }, [query])

  /* ── helpers ────────────────────────────────────────────────────── */

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setLink(key: 'kinopoisk_url' | 'imdb_url' | 'tmdb_url' | 'wiki_url', value: string) {
    setForm(f => ({ ...f, [key]: value || undefined }))
  }

  /* ── duplicate found in search → switch to edit mode ───────────── */

  function selectDuplicate(existing: Movie) {
    currentTmdbId.current = null   // cancel any pending enrichment
    setEditTarget(existing)
    setForm({ ...existing })
    setPhase('form')
  }

  /* ── TMDB selection — immediate form + background enrichment ────── */

  async function selectTMDB(t: TMDBMovie) {
    const year   = t.release_date ? parseInt(t.release_date.slice(0, 4)) : 0
    const tmdbId = String(t.id)
    currentTmdbId.current = tmdbId

    setForm({
      title_ru:    t.title,
      title_orig:  t.original_title,
      year,
      status:      form.status,
      tmdb_id:     tmdbId,
      poster_path: t.poster_path || undefined,
      tmdb_rating: t.vote_average > 0 ? Math.round(t.vote_average * 10) / 10 : undefined,
      genres:      undefined,
      duration_min: undefined,
      imdb_url:    undefined,
      tmdb_url:    `https://www.themoviedb.org/movie/${tmdbId}`,
      kinopoisk_url: undefined,
      wiki_url:    undefined,
    })
    setPhase('form')
    setLinksLoading(true)

    try {
      const [genreMap, details] = await Promise.all([
        getGenres(),
        getMovieDetails(tmdbId),
      ])
      if (currentTmdbId.current !== tmdbId) return

      const genreNames = t.genre_ids
        .map(id => genreMap[id])
        .filter(Boolean) as string[]

      const imdbId = details.imdb_id

      setForm(f => ({
        ...f,
        genres:      genreNames.length ? genreNames : undefined,
        duration_min: details.runtime ?? undefined,
        imdb_url:    imdbId ? `https://www.imdb.com/title/${imdbId}/` : undefined,
      }))

      if (imdbId) {
        const links = await lookupFilmByImdbId(imdbId)
        if (currentTmdbId.current !== tmdbId) return
        setForm(f => ({
          ...f,
          kinopoisk_url: links.kinopoisk_url || undefined,
          wiki_url:      links.wiki_url      || undefined,
        }))
      }
    } finally {
      if (currentTmdbId.current === tmdbId) setLinksLoading(false)
    }
  }

  /* ── save ───────────────────────────────────────────────────────── */

  async function handleSave() {
    if (!form.title_ru && !form.title_orig) {
      setError('Enter at least one title')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isEdit && editTarget) {
        await edit({ ...editTarget, ...form })
      } else {
        await create({ id: uuid(), ...form })
      }
      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  /* ── render ─────────────────────────────────────────────────────── */

  return (
    <div
      className={styles.overlay}
      ref={overlayRef}
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          {phase === 'form' && !isEdit && (
            <button className={styles.backBtn} onClick={() => setPhase('search')} title="Back to search">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <h2>{isEdit ? 'Edit movie' : 'Add movie'}</h2>
          <button className={styles.close} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className={styles.body}>

          {/* ── SEARCH PHASE ─────────────────────────────────────── */}
          {phase === 'search' && (
            <div className={styles.searchPhase}>
              <div className={styles.tmdbSearch}>
                <input
                  type="search"
                  placeholder="Movie title…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
                {searching && <div className={styles.miniSpinner} />}
              </div>

              {results.length > 0 && (
                <div className={styles.tmdbResults}>
                  {results.map(t => {
                    const existing = tmdbIndex[String(t.id)]
                    return (
                      <button
                        key={t.id}
                        className={styles.tmdbItem}
                        onClick={() => existing ? selectDuplicate(existing) : selectTMDB(t)}
                      >
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
                        {existing && (
                          <span className={`${styles.tmdbBadge} ${styles[`tmdbBadge_${existing.status}`]}`}>
                            ✓ {STATUS_LABELS[existing.status]}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {!searching && query.length >= 2 && results.length === 0 && (
                <p className={styles.noResults}>Nothing found on TMDB</p>
              )}

              <button className={styles.skipLink} onClick={() => setPhase('form')}>
                Add without search
              </button>
            </div>
          )}

          {/* ── FORM PHASE ───────────────────────────────────────── */}
          {phase === 'form' && (
            <>
              {/* Poster + title fields */}
              <div className={styles.topSection}>
                {form.poster_path && (
                  <img
                    className={styles.posterSm}
                    src={getPosterUrl(form.poster_path, 'w92')}
                    alt=""
                  />
                )}
                <div className={styles.titleFields}>
                  <input
                    value={form.title_ru}
                    onChange={e => set('title_ru', e.target.value)}
                    placeholder="Russian title"
                  />
                  <input
                    value={form.title_orig}
                    onChange={e => set('title_orig', e.target.value)}
                    placeholder="Original title"
                  />
                </div>
              </div>

              {/* Year + Duration — one row, no labels */}
              <div className={styles.yearDurRow}>
                <input
                  type="number"
                  min="1895" max="2099"
                  value={form.year || ''}
                  onChange={e => set('year', parseInt(e.target.value) || 0)}
                  placeholder="Year"
                />
                <input
                  type="number"
                  min="1"
                  value={form.duration_min || ''}
                  onChange={e => set('duration_min', parseInt(e.target.value) || undefined)}
                  placeholder="Duration (min)"
                />
              </div>

              {/* Status */}
              <div className={styles.section}>
                <p className={styles.label}>Status</p>
                <div className={styles.statusGroup}>
                  {(Object.keys(STATUS_LABELS) as MovieStatus[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.statusBtn} ${form.status === s ? styles.statusActive : ''}`}
                      data-status={s}
                      onClick={() => set('status', s)}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Genres */}
              <div className={styles.section}>
                <p className={styles.label}>Genres</p>
                <input
                  value={form.genres?.join(', ') || ''}
                  onChange={e => {
                    const v = e.target.value
                    set('genres', v ? v.split(',').map(g => g.trim()).filter(Boolean) : undefined)
                  }}
                  placeholder="Action, Drama…"
                />
              </div>

              {/* Links */}
              <div className={styles.section}>
                <p className={styles.label}>
                  Links
                  {linksLoading && <span className={styles.linksSpinner} title="Fetching links…" />}
                </p>
                <div className={styles.links}>
                  {([
                    { key: 'kinopoisk_url', label: 'KP',   placeholder: 'https://www.kinopoisk.ru/film/…' },
                    { key: 'imdb_url',      label: 'IMDb', placeholder: 'https://www.imdb.com/title/…' },
                    { key: 'tmdb_url',      label: 'TMDB', placeholder: 'https://www.themoviedb.org/movie/…' },
                    { key: 'wiki_url',      label: 'Wiki', placeholder: 'https://ru.wikipedia.org/wiki/…' },
                  ] as const).map(({ key, label, placeholder }) => (
                    <div key={key} className={styles.linkRow}>
                      <span className={styles.linkLabel}>{label}</span>
                      <input
                        value={form[key] || ''}
                        onChange={e => setLink(key, e.target.value)}
                        placeholder={placeholder}
                      />
                      {/* Open link in new tab for quick verification */}
                      <a
                        href={form[key] || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`${styles.openBtn} ${!form[key] ? styles.openBtnDisabled : ''}`}
                        onClick={e => { if (!form[key]) e.preventDefault() }}
                        title={form[key] ? `Open ${label}` : 'No URL yet'}
                        aria-disabled={!form[key]}
                      >
                        <span className="material-symbols-outlined">open_in_new</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          {phase === 'form' && (
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save' : 'Add movie'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
