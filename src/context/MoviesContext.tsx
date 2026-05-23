import React, { createContext, useCallback, useContext, useReducer } from 'react'
import type { Movie, MovieStatus } from '../types/movie'
import {
  fetchMovies, addMovie, updateMovie, deleteMovie, initializeSheet,
} from '../services/sheets'

interface State {
  movies: Movie[]
  loading: boolean
  error: string | null
  query: string
  statusFilter: MovieStatus | 'all'
}

type Action =
  | { type: 'LOADING' }
  | { type: 'SET'; payload: Movie[] }
  | { type: 'ADD'; payload: Movie }
  | { type: 'UPDATE'; payload: Movie }
  | { type: 'DELETE'; payload: string }
  | { type: 'ERROR'; payload: string }
  | { type: 'QUERY'; payload: string }
  | { type: 'FILTER'; payload: MovieStatus | 'all' }

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'LOADING': return { ...s, loading: true, error: null }
    case 'SET': return { ...s, movies: a.payload, loading: false, error: null }
    case 'ADD': return { ...s, movies: [...s.movies, a.payload] }
    case 'UPDATE': return { ...s, movies: s.movies.map(m => m.id === a.payload.id ? a.payload : m) }
    case 'DELETE': return { ...s, movies: s.movies.filter(m => m.id !== a.payload) }
    case 'ERROR': return { ...s, error: a.payload, loading: false }
    case 'QUERY': return { ...s, query: a.payload }
    case 'FILTER': return { ...s, statusFilter: a.payload }
    default: return s
  }
}

interface Ctx extends State {
  filtered: Movie[]
  load: () => Promise<void>
  create: (m: Movie) => Promise<void>
  edit: (m: Movie) => Promise<void>
  remove: (m: Movie) => Promise<void>
  setQuery: (q: string) => void
  setFilter: (f: MovieStatus | 'all') => void
}

const MoviesCtx = createContext<Ctx | null>(null)

export function MoviesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    movies: [], loading: false, error: null, query: '', statusFilter: 'all',
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

  const setQuery = useCallback((q: string) => dispatch({ type: 'QUERY', payload: q }), [])
  const setFilter = useCallback((f: MovieStatus | 'all') => dispatch({ type: 'FILTER', payload: f }), [])

  const filtered = state.movies.filter(m => {
    const okStatus = state.statusFilter === 'all' || m.status === state.statusFilter
    const q = state.query.toLowerCase()
    const okQuery = !q ||
      m.title_ru.toLowerCase().includes(q) ||
      m.title_orig.toLowerCase().includes(q) ||
      (m.genres ?? []).some(g => g.toLowerCase().includes(q))
    return okStatus && okQuery
  })

  return (
    <MoviesCtx.Provider value={{ ...state, filtered, load, create, edit, remove, setQuery, setFilter }}>
      {children}
    </MoviesCtx.Provider>
  )
}

export function useMovies() {
  const ctx = useContext(MoviesCtx)
  if (!ctx) throw new Error('useMovies outside MoviesProvider')
  return ctx
}
