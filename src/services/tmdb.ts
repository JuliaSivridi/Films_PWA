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
  const res = await fetch(`${BASE}/genre/movie/list?api_key=${key}&language=ru-RU`)
  if (!res.ok) return {}
  const data = await res.json()
  genreCache = Object.fromEntries(
    (data.genres as { id: number; name: string }[]).map(g => [g.id, g.name]),
  )
  return genreCache!
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

export function getPosterUrl(posterPath: string | null | undefined, size = 'w342'): string {
  if (!posterPath) return ''
  return `https://image.tmdb.org/t/p/${size}${posterPath}`
}
