import type { TMDBMovie } from '../types/movie'

const BASE = 'https://api.themoviedb.org/3'

export function getTmdbKey(): string {
  return localStorage.getItem('tmdb_key') || import.meta.env.VITE_TMDB_API_KEY || ''
}

let genreCache: Record<number, string> | null = null

export async function getGenres(): Promise<Record<number, string>> {
  if (genreCache) return genreCache
  const key = getTmdbKey()
  if (!key) return {}
  try {
    const res = await fetch(`${BASE}/genre/movie/list?api_key=${key}&language=en-US`)
    if (!res.ok) return {}
    const data = await res.json()
    genreCache = Object.fromEntries(
      (data.genres as { id: number; name: string }[]).map(g => [g.id, g.name]),
    )
    return genreCache!
  } catch {
    return {}
  }
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

export interface MovieDetails {
  runtime:   number | null
  imdb_id:   string | null
  countries: string[]       // production_countries[].name
  keywords:  string[]       // keywords.keywords[].name
}

/**
 * Fetch runtime, IMDb ID, production countries, and keywords in one request
 * using TMDB's append_to_response feature.
 */
export async function getMovieDetails(tmdbId: string): Promise<MovieDetails> {
  const key = getTmdbKey()
  const empty: MovieDetails = { runtime: null, imdb_id: null, countries: [], keywords: [] }
  if (!key) return empty
  try {
    const res = await fetch(
      `${BASE}/movie/${tmdbId}?api_key=${key}&append_to_response=external_ids,keywords`,
    )
    if (!res.ok) return empty
    const data = await res.json() as {
      runtime?:              number | null
      external_ids?:         { imdb_id?: string | null }
      production_countries?: { iso_3166_1: string; name: string }[]
      keywords?:             { keywords: { id: number; name: string }[] }
    }
    return {
      runtime:   (typeof data.runtime === 'number' && data.runtime > 0) ? data.runtime : null,
      imdb_id:   data.external_ids?.imdb_id || null,
      countries: data.production_countries?.map(c => c.name) ?? [],
      keywords:  data.keywords?.keywords?.map(k => k.name)  ?? [],
    }
  } catch {
    return empty
  }
}

export function getPosterUrl(posterPath: string | null | undefined, size = 'w342'): string {
  if (!posterPath) return ''
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
