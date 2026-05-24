/**
 * Compact alphabetical list view for large collections.
 * Groups movies by first letter of title_ru (or title_orig),
 * with a fixed alphabet index sidebar for quick navigation.
 */

import { useMemo, useRef } from 'react'
import type { Movie } from '../types/movie'
import { getPosterUrl, formatDuration } from '../services/tmdb'
import styles from './MovieList.module.css'

interface Props {
  movies: Movie[]
  onEdit: (m: Movie) => void
}

interface Group { letter: string; movies: Movie[] }

const CYRILLIC = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'

function firstLetter(m: Movie): string {
  const ch = (m.title_ru || m.title_orig || '')[0]?.toUpperCase() ?? ''
  if (/[А-ЯЁ]/.test(ch)) return ch
  if (/[A-Z]/.test(ch))   return ch
  return '#'
}

function letterOrder(l: string): number {
  const ci = CYRILLIC.indexOf(l)
  if (ci >= 0) return ci
  if (/[A-Z]/.test(l)) return 100 + l.charCodeAt(0)
  return 999
}

export default function MovieList({ movies, onEdit }: Props) {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const groups = useMemo<Group[]>(() => {
    const sorted = [...movies].sort((a, b) => {
      const ta = (a.title_ru || a.title_orig || '').toLowerCase()
      const tb = (b.title_ru || b.title_orig || '').toLowerCase()
      return ta.localeCompare(tb, 'ru')
    })

    const map: Record<string, Movie[]> = {}
    for (const m of sorted) {
      const l = firstLetter(m)
      if (!map[l]) map[l] = []
      map[l].push(m)
    }

    return Object.keys(map)
      .sort((a, b) => letterOrder(a) - letterOrder(b))
      .map(letter => ({ letter, movies: map[letter] }))
  }, [movies])

  const letters = groups.map(g => g.letter)

  function scrollToLetter(letter: string) {
    const el = sectionRefs.current[letter]
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 110
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
  }

  function handleIndexTouch(e: React.TouchEvent) {
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null
    const letter = el?.dataset?.letter
    if (letter) scrollToLetter(letter)
  }

  if (movies.length === 0) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.list}>
        {groups.map(({ letter, movies: group }) => (
          <section
            key={letter}
            ref={el => { sectionRefs.current[letter] = el }}
          >
            {/* Letter divider */}
            <div className={styles.divider}>
              <span className={styles.dividerLetter}>{letter}</span>
              <span className={styles.dividerLine} />
            </div>

            {/* Rows */}
            {group.map(m => (
              <div key={m.id} className={styles.row}>
                {/* Poster — tap opens edit */}
                <button
                  className={styles.posterWrap}
                  onClick={() => onEdit(m)}
                  aria-label="Edit"
                >
                  {m.poster_path
                    ? <img
                        src={getPosterUrl(m.poster_path, 'w92')}
                        alt=""
                        className={styles.poster}
                        loading="lazy"
                      />
                    : <div className={`${styles.poster} ${styles.noPoster}`}>
                        <span className="material-symbols-outlined">image</span>
                      </div>
                  }
                </button>

                {/* Info — tap opens edit */}
                <button className={styles.info} onClick={() => onEdit(m)}>

                  {/* Russian title */}
                  <span className={styles.titleRu}>
                    {m.title_ru || m.title_orig}
                  </span>

                  {/* Original title (only if different) */}
                  {m.title_orig && m.title_orig !== m.title_ru && (
                    <span className={styles.titleOrig}>{m.title_orig}</span>
                  )}

                  {/* Year · Duration · Rating */}
                  {(m.year > 0 || m.duration_min || m.tmdb_rating != null) && (
                    <span className={styles.meta}>
                      {m.year > 0 && <span>{m.year}</span>}
                      {!!m.duration_min && <span>{formatDuration(m.duration_min)}</span>}
                      {m.tmdb_rating != null && (
                        <span className={styles.rating}>★ {m.tmdb_rating}</span>
                      )}
                    </span>
                  )}

                  {/* Genres */}
                  {m.genres && m.genres.length > 0 && (
                    <span className={styles.genres}>
                      {m.genres.slice(0, 3).join(' · ')}
                    </span>
                  )}
                </button>

                {/* External links — open directly, don't trigger edit */}
                {(m.kinopoisk_url || m.imdb_url || m.tmdb_url || m.wiki_url) && (
                  <div
                    className={styles.links}
                    onClick={e => e.stopPropagation()}
                  >
                    {m.kinopoisk_url && (
                      <a href={m.kinopoisk_url} target="_blank" rel="noreferrer" className={styles.link}>KP</a>
                    )}
                    {m.imdb_url && (
                      <a href={m.imdb_url} target="_blank" rel="noreferrer" className={styles.link}>IMDb</a>
                    )}
                    {m.tmdb_url && (
                      <a href={m.tmdb_url} target="_blank" rel="noreferrer" className={styles.link}>TMDB</a>
                    )}
                    {m.wiki_url && (
                      <a href={m.wiki_url} target="_blank" rel="noreferrer" className={styles.link}>Wiki</a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>

      {/* Alphabet index sidebar */}
      <nav
        className={styles.alphaNav}
        onTouchStart={handleIndexTouch}
        onTouchMove={handleIndexTouch}
      >
        {letters.map(l => (
          <button
            key={l}
            className={styles.alphaBtn}
            data-letter={l}
            onClick={() => scrollToLetter(l)}
          >
            {l}
          </button>
        ))}
      </nav>
    </div>
  )
}
