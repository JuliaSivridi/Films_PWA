import type { TMDBMovie } from '../types/movie'

const BASE = 'https://api.themoviedb.org/3'

export function getTmdbKey(): string {
  return localStorage.getItem('tmdb_key') || import.meta.env.VITE_TMDB_API_KEY || ''
}

export async function searchMovies(query: string): Promise<TMDBMovie[]> {
  const key = getTmdbKey()
  if (!key || query.length < 2) return []
  const res = await fetch(
    `${BASE}/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=ru-RU&include_adult=false`,
  )
  if (!res.ok) return []
  const data = await res.json()
  return (data.results as TMDBMovie[])?.slice(0, 8) || []
}

/** Fetch IMDb ID (and other external IDs) for a TMDB movie. */
export async function getExternalIds(tmdbId: string): Promise<{ imdb_id: string | null }> {
  const key = getTmdbKey()
  if (!key) return { imdb_id: null }
  try {
    const res = await fetch(`${BASE}/movie/${tmdbId}/external_ids?api_key=${key}`)
    if (!res.ok) return { imdb_id: null }
    const data = await res.json() as { imdb_id?: string | null }
    return { imdb_id: data.imdb_id || null }
  } catch {
    return { imdb_id: null }
  }
}

export function getPosterUrl(posterPath: string | null | undefined, size = 'w342'): string {
  if (!posterPath) return ''
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}
