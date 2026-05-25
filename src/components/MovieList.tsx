/**
 * Compact alphabetical list with window-level virtual scrolling.
 * Only visible rows are rendered — handles 3000+ films smoothly.
 * Alphabet navigation via AlphaPicker popup (triggered by logo in Header).
 */

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import type { Movie } from '../types/movie'
import { getPosterUrl, formatDuration } from '../services/tmdb'
import AlphaPicker from './AlphaPicker'
import styles from './MovieList.module.css'

/* ── types ─────────────────────────────────────────────────────── */

type VItem =
  | { type: 'divider'; letter: string }
  | { type: 'row';     movie: Movie   }

interface Props {
  movies:       Movie[]
  onEdit:       (m: Movie) => void
  alphaOpen:    boolean
  onAlphaClose: () => void
}

/* ── helpers ────────────────────────────────────────────────────── */

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

/* ── component ──────────────────────────────────────────────────── */

export default function MovieList({ movies, onEdit, alphaOpen, onAlphaClose }: Props) {
  const listRef        = useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  /* measure distance from top of document to list container;
     re-measure when header resizes (filter panel open/close)    */
  useLayoutEffect(() => {
    const update = () => setScrollMargin(listRef.current?.offsetTop ?? 0)
    update()
    const headerEl = document.querySelector('header')
    if (!headerEl) return
    const ro = new ResizeObserver(update)
    ro.observe(headerEl)
    return () => ro.disconnect()
  }, [])

  /* ── build flat item array ──────────────────────────────────── */

  const { flatItems, letters } = useMemo<{ flatItems: VItem[]; letters: string[] }>(() => {
    const sorted = [...movies].sort((a, b) =>
      (a.title_ru || a.title_orig || '').localeCompare(
        b.title_ru || b.title_orig || '', 'ru',
      ),
    )

    const map: Record<string, Movie[]> = {}
    for (const m of sorted) {
      const l = firstLetter(m)
      if (!map[l]) map[l] = []
      map[l].push(m)
    }

    const groupLetters = Object.keys(map).sort((a, b) => letterOrder(a) - letterOrder(b))

    const items: VItem[] = []
    for (const letter of groupLetters) {
      items.push({ type: 'divider', letter })
      for (const movie of map[letter]) items.push({ type: 'row', movie })
    }

    return { flatItems: items, letters: groupLetters }
  }, [movies])

  /* ── letter → flat index ────────────────────────────────────── */

  const letterIndex = useMemo(() => {
    const map: Record<string, number> = {}
    flatItems.forEach((item, i) => { if (item.type === 'divider') map[item.letter] = i })
    return map
  }, [flatItems])

  /* ── virtualizer ────────────────────────────────────────────── */

  const virtualizer = useWindowVirtualizer({
    count:        flatItems.length,
    estimateSize: i => flatItems[i].type === 'divider' ? 42 : 157,
    overscan:     5,
    scrollMargin,
  })

  function scrollToLetter(letter: string) {
    const idx = letterIndex[letter]
    if (idx != null) virtualizer.scrollToIndex(idx, { align: 'start', behavior: 'smooth' })
  }

  if (movies.length === 0) return null

  /* ── render ─────────────────────────────────────────────────── */

  return (
    <div ref={listRef}>

      {/* Alphabet picker popup */}
      {alphaOpen && (
        <AlphaPicker
          letters={letters}
          onSelect={letter => { scrollToLetter(letter); onAlphaClose() }}
          onClose={onAlphaClose}
        />
      )}

      {/* Virtual list container */}
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>

        {virtualizer.getVirtualItems().map(vItem => {
          const item = flatItems[vItem.index]

          return (
            <div
              key={vItem.key}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              style={{
                position:  'absolute',
                top:       0,
                left:      0,
                width:     '100%',
                transform: `translateY(${vItem.start - scrollMargin}px)`,
              }}
            >
              {/* ── Letter divider ─────────────────────────── */}
              {item.type === 'divider' && (
                <div className={styles.divider}>
                  <span className={styles.dividerLetter}>{item.letter}</span>
                  <span className={styles.dividerLine} />
                </div>
              )}

              {/* ── Film row ───────────────────────────────── */}
              {item.type === 'row' && (() => {
                const m = item.movie
                return (
                  <div className={styles.row}>

                    {/* Poster */}
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

                    {/* Info column — tap opens edit */}
                    <div className={styles.info} onClick={() => onEdit(m)}>

                      <span className={styles.titleRu}>
                        {m.title_ru || m.title_orig}
                      </span>

                      {m.title_orig && m.title_orig !== m.title_ru && (
                        <span className={styles.titleOrig}>{m.title_orig}</span>
                      )}

                      {(m.year > 0 || m.duration_min || m.tmdb_rating != null) && (
                        <span className={styles.meta}>
                          {m.year > 0             && <span>{m.year}</span>}
                          {!!m.duration_min        && <span>{formatDuration(m.duration_min)}</span>}
                          {m.tmdb_rating != null   && <span className={styles.rating}>★ {m.tmdb_rating}</span>}
                        </span>
                      )}

                      {m.countries && m.countries.length > 0 && (
                        <span className={styles.genres}>
                          {m.countries.join(' · ')}
                        </span>
                      )}

                      {/* Links — stop propagation so tap doesn't open edit */}
                      {(m.kinopoisk_url || m.imdb_url || m.tmdb_url || m.wiki_url) && (
                        <div className={styles.links} onClick={e => e.stopPropagation()}>
                          {m.kinopoisk_url && <a href={m.kinopoisk_url} target="_blank" rel="noreferrer" className={styles.link}>KP</a>}
                          {m.imdb_url      && <a href={m.imdb_url}      target="_blank" rel="noreferrer" className={styles.link}>IMDb</a>}
                          {m.tmdb_url      && <a href={m.tmdb_url}      target="_blank" rel="noreferrer" className={styles.link}>TMDB</a>}
                          {m.wiki_url      && <a href={m.wiki_url}      target="_blank" rel="noreferrer" className={styles.link}>Wiki</a>}
                        </div>
                      )}

                    </div>
                  </div>
                )
              })()}

            </div>
          )
        })}

      </div>
    </div>
  )
}
