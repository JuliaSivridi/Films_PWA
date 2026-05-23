export type MovieStatus = 'want' | 'watched'

export interface Movie {
  id: string
  title_ru: string
  title_orig: string      // original title (any language)
  year: number
  status: MovieStatus
  tmdb_id?: string
  poster_path?: string
  genres?: string[]       // from TMDB at add-time; editable
  tmdb_rating?: number    // TMDB vote_average snapshot
  duration_min?: number   // runtime in minutes (static)
  kinopoisk_url?: string
  imdb_url?: string
  tmdb_url?: string
  wiki_url?: string
  _row?: number
}

export interface TMDBMovie {
  id: number
  title: string
  original_title: string
  release_date: string
  genre_ids: number[]
  poster_path: string | null
  overview: string
  vote_average: number
}

export const STATUS_LABELS: Record<MovieStatus, string> = {
  want:    'Want',
  watched: 'Watched',
}

export const STATUS_COLORS: Record<MovieStatus, string> = {
  want:    '#f59e0b',
  watched: '#10b981',
}
