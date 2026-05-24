import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react'
import type { Movie, MovieStatus } from '../types/movie'
import {
  fetchMovies, addMovie, updateMovie, deleteMovie, initializeSheet,
} from '../services/sheets'

/* ── filter shape ──────────────────────────────────────────────── */

export interface FiltersState {
  status:     MovieStatus | 'all'
  yearFrom:   number | null
  yearTo:     number | null
  ratingFrom: number | null
  ratingTo:   number | null
  genres:     string[]      // OR logic: film must have ≥1 of selected
}

const BLANK_FILTERS: FiltersState = {
  status: 'all',
  yearFrom: null, yearTo: null,
  ratingFrom: null, ratingTo: null,
  genres: [],
}

/* ── reducer ───────────────────────────────────────────────────── */

interface State {
  movies:  Movie[]
  loading: boolean
  error:   string | null
  query:   string
  filters: FiltersState
}

type Action =
  | { type: 'LOADING' }
  | { type: 'SET';          payload: Movie[] }
  | { type: 'ADD';          payload: Movie }
  | { type: 'UPDATE';       payload: Movie }
  | { type: 'DELETE';       payload: string }
  | { type: 'ERROR';        payload: string }
  | { type: 'QUERY';        payload: string }
  | { type: 'SET_FILTERS';  payload: Partial<FiltersState> }
  | { type: 'CLEAR_FILTERS' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'LOADING':       return { ...s, loading: true, error: null }
    case 'SET':           return { ...s, movies: a.payload, loading: false, error: null }
    case 'ADD':           return { ...s, movies: [...s.movies, a.payload] }
    case 'UPDATE':        return { ...s, movies: s.movies.map(m => m.id === a.payload.id ? a.payload : m) }
    case 'DELETE':        return { ...s, movies: s.movies.filter(m => m.id !== a.payload) }
    case 'ERROR':         return { ...s, error: a.payload, loading: false }
    case 'QUERY':         return { ...s, query: a.payload }
    case 'SET_FILTERS':   return { ...s, filters: { ...s.filters, ...a.payload } }
    case 'CLEAR_FILTERS': return { ...s, filters: { ...BLANK_FILTERS } }
    default:              return s
  }
}

/* ── context interface ─────────────────────────────────────────── */

interface Ctx extends State {
  filtered:          Movie[]
  allGenres:         string[]
  activeFilterCount: number
  load:         () => Promise<void>
  create:       (m: Movie) => Promise<void>
  edit:         (m: Movie) => Promise<void>
  remove:       (m: Movie) => Promise<void>
  setQuery:     (q: string) => void
  setFilters:   (f: Partial<FiltersState>) => void
  clearFilters: () => void
}

const MoviesCtx = createContext<Ctx | null>(null)

/* ── provider ──────────────────────────────────────────────────── */

export function MoviesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    movies: [], loading: false, error: null,
    query: '', filters: { ...BLANK_FILTERS },
  })

  const load = useCallback(async () => {
    dispatch({ type: 'LOADING' })
    try {
      await initializeSheet()
      dispatch({ type: 'SET', payload: await fetchMovies() })
    } catch (e) {
      dispatch({ type: 'ERROR', payload: String(e) })
    }
  }, [])

  const create = useCallback(async (m: Movie) => {
    const saved = await addMovie(m)
    dispatch({ type: 'ADD', payload: saved })
  }, [])

  const edit = useCallback(async (m: Movie) => {
    await updateMovie(m)
    dispatch({ type: 'UPDATE', payload: m })
  }, [])

  const remove = useCallback(async (m: Movie) => {
    await deleteMovie(m)
    dispatch({ type: 'DELETE', payload: m.id })
  }, [])

  const setQuery     = useCallback((q: string) => dispatch({ type: 'QUERY', payload: q }), [])
  const setFilters   = useCallback((f: Partial<FiltersState>) => dispatch({ type: 'SET_FILTERS', payload: f }), [])
  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), [])

  /* all unique genres from the collection, sorted */
  const allGenres = useMemo(() => {
    const set = new Set<string>()
    state.movies.forEach(m => m.genres?.forEach(g => set.add(g)))
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [state.movies])

  /* filtered list */
  const filtered = useMemo(() => {
    const { filters, query } = state
    return state.movies.filter(m => {
      // status
      if (filters.status !== 'all' && m.status !== filters.status) return false
      // text search
      if (query) {
        const q = query.toLowerCase()
        const inTitle = m.title_ru.toLowerCase().includes(q) || m.title_orig.toLowerCase().includes(q)
        const inGenre = (m.genres ?? []).some(g => g.toLowerCase().includes(q))
        if (!inTitle && !inGenre) return false
      }
      // year range
      if (filters.yearFrom != null && m.year < filters.yearFrom) return false
      if (filters.yearTo   != null && m.year > filters.yearTo)   return false
      // rating range (films with no rating are excluded when filter is active)
      if (filters.ratingFrom != null && (m.tmdb_rating == null || m.tmdb_rating < filters.ratingFrom)) return false
      if (filters.ratingTo   != null && (m.tmdb_rating == null || m.tmdb_rating > filters.ratingTo))   return false
      // genres — OR logic
      if (filters.genres.length > 0) {
        const mg = new Set((m.genres ?? []).map(g => g.toLowerCase()))
        if (!filters.genres.some(g => mg.has(g.toLowerCase()))) return false
      }
      return true
    })
  }, [state])

  /* how many filter categories are active (for badge) */
  const activeFilterCount = useMemo(() => {
    const f = state.filters
    let n = 0
    if (f.status !== 'all')                         n++
    if (f.yearFrom   != null || f.yearTo   != null) n++
    if (f.ratingFrom != null || f.ratingTo != null) n++
    if (f.genres.length > 0)                        n++
    return n
  }, [state.filters])

  return (
    <MoviesCtx.Provider value={{
      ...state, filtered, allGenres, activeFilterCount,
      load, create, edit, remove, setQuery, setFilters, clearFilters,
    }}>
      {children}
    </MoviesCtx.Provider>
  )
}

export function useMovies() {
  const ctx = useContext(MoviesCtx)
  if (!ctx) throw new Error('useMovies outside MoviesProvider')
  return ctx
}
