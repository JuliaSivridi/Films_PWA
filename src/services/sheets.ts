/**
 * Google Sheets API v4 — CRUD for movies.
 * Gets token via refreshTokenIfNeeded(), sheet ID via getSheetId().
 *
 * Columns A–P (16 total):
 *   id | title_ru | title_orig | year | status |
 *   tmdb_id | poster_path |
 *   genres | tmdb_rating | duration_min |
 *   kinopoisk_url | imdb_url | tmdb_url | wiki_url |
 *   countries | keywords
 */

import type { Movie, MovieStatus } from '../types/movie'
import { refreshTokenIfNeeded } from './auth'
import { getSheetId } from './drive'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const SHEET_NAME  = 'Movies'
const HEADERS = [
  'id', 'title_ru', 'title_orig', 'year', 'status',
  'tmdb_id', 'poster_path',
  'genres', 'tmdb_rating', 'duration_min',
  'kinopoisk_url', 'imdb_url', 'tmdb_url', 'wiki_url',
  'countries', 'keywords',
]

async function api(path: string, method: string, body?: object): Promise<Response> {
  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Not authorized')
  const id = getSheetId()
  if (!id) throw new Error('Sheet not found')

  const res = await fetch(`${SHEETS_BASE}/${id}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Sheets API ${res.status}`)
  }
  return res
}

// Only http(s) URLs are allowed — anything else (e.g. javascript:) is dropped
function safeUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  return /^https?:\/\//i.test(raw.trim()) ? raw.trim() : undefined
}

function parseArr(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : undefined
  } catch {
    // cell contains plain comma-separated text or truncated JSON — ignore silently
    return undefined
  }
}

function rowToMovie(row: string[], rowIndex: number): Movie {
  return {
    id:            row[0]  || String(rowIndex),
    title_ru:      row[1]  || '',
    title_orig:    row[2]  || '',
    year:          parseInt(row[3]) || 0,
    status:        (row[4] as MovieStatus) || 'want',
    tmdb_id:       row[5]  || undefined,
    poster_path:   row[6]  || undefined,
    genres:        parseArr(row[7]),
    tmdb_rating:   row[8]  ? parseFloat(row[8]) : undefined,
    duration_min:  row[9]  ? parseInt(row[9])   : undefined,
    kinopoisk_url: safeUrl(row[10]),
    imdb_url:      safeUrl(row[11]),
    tmdb_url:      safeUrl(row[12]),
    wiki_url:      safeUrl(row[13]),
    countries:     parseArr(row[14]),
    keywords:      parseArr(row[15]),
    _row: rowIndex + 2,
  }
}

function movieToRow(m: Movie): string[] {
  return [
    m.id,
    m.title_ru,
    m.title_orig,
    String(m.year),
    m.status,
    m.tmdb_id       || '',
    m.poster_path   || '',
    m.genres?.length ? JSON.stringify(m.genres) : '',
    m.tmdb_rating   != null ? String(m.tmdb_rating)  : '',
    m.duration_min  != null ? String(m.duration_min) : '',
    m.kinopoisk_url || '',
    m.imdb_url      || '',
    m.tmdb_url      || '',
    m.wiki_url      || '',
    m.countries?.length ? JSON.stringify(m.countries) : '',
    m.keywords?.length  ? JSON.stringify(m.keywords)  : '',
  ]
}

export async function initializeSheet(): Promise<void> {
  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Not authorized')
  const id = getSheetId()
  if (!id) throw new Error('Sheet not found')

  const headRes  = await api(`/values/${SHEET_NAME}!A1:A1`, 'GET')
  const headData = await headRes.json()

  if (!headData.values || headData.values[0]?.[0] !== 'id') {
    await api(
      `/values/${SHEET_NAME}!A1:P1?valueInputOption=RAW`,
      'PUT',
      { values: [HEADERS] },
    )
  }
}

export async function fetchMovies(): Promise<Movie[]> {
  const res  = await api(`/values/${SHEET_NAME}!A:P`, 'GET')
  const data = await res.json()
  if (!data.values || data.values.length <= 1) return []
  return (data.values as string[][])
    .slice(1)
    .map((row, i) => rowToMovie(row, i))
    .filter(m => m.id && (m.title_ru || m.title_orig))
}

export async function addMovie(movie: Movie): Promise<Movie> {
  const res  = await api(
    `/values/${SHEET_NAME}!A:P:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    'POST',
    { values: [movieToRow(movie)] },
  )
  const data  = await res.json()
  const range: string = data.updates?.updatedRange || ''
  const match = range.match(/!A(\d+):/)
  return { ...movie, _row: match ? parseInt(match[1]) : undefined }
}

/** The in-memory _row can go stale (cache-first start, edits from another
 *  device). Verify the row still holds this movie's id before writing;
 *  if not, find the right row by id. */
async function resolveRow(movie: Movie): Promise<number> {
  if (movie._row) {
    const res  = await api(`/values/${SHEET_NAME}!A${movie._row}`, 'GET')
    const data = await res.json()
    if (data.values?.[0]?.[0] === movie.id) return movie._row
  }
  const res  = await api(`/values/${SHEET_NAME}!A:A`, 'GET')
  const data = await res.json()
  const rows: string[][] = data.values ?? []
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === movie.id) return i + 1
  }
  throw new Error('Фильм не найден в таблице — обновите страницу')
}

export async function updateMovie(movie: Movie): Promise<void> {
  const row = await resolveRow(movie)
  await api(
    `/values/${SHEET_NAME}!A${row}:P${row}?valueInputOption=RAW`,
    'PUT',
    { values: [movieToRow(movie)] },
  )
}

