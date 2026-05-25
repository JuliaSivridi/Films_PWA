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

function rowToMovie(row: string[], rowIndex: number): Movie {
  return {
    id:            row[0]  || String(rowIndex),
    title_ru:      row[1]  || '',
    title_orig:      row[2]  || '',
    year:          parseInt(row[3]) || 0,
    status:        (row[4] as MovieStatus) || 'want',
    tmdb_id:       row[5]  || undefined,
    poster_path:   row[6]  || undefined,
    genres:        row[7]  ? (JSON.parse(row[7]) as string[]) : undefined,
    tmdb_rating:   row[8]  ? parseFloat(row[8]) : undefined,
    duration_min:  row[9]  ? parseInt(row[9])   : undefined,
    kinopoisk_url: row[10] || undefined,
    imdb_url:      row[11] || undefined,
    tmdb_url:      row[12] || undefined,
    wiki_url:      row[13] || undefined,
    countries:     row[14] ? (JSON.parse(row[14]) as string[]) : undefined,
    keywords:      row[15] ? (JSON.parse(row[15]) as string[]) : undefined,
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

export async function updateMovie(movie: Movie): Promise<void> {
  if (!movie._row) throw new Error('Row number unknown')
  await api(
    `/values/${SHEET_NAME}!A${movie._row}:P${movie._row}?valueInputOption=RAW`,
    'PUT',
    { values: [movieToRow(movie)] },
  )
}

export async function deleteMovie(movie: Movie): Promise<void> {
  if (!movie._row) throw new Error('Row number unknown')
  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Not authorized')
  const id = getSheetId()

  const metaRes = await fetch(`${SHEETS_BASE}/${id}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meta  = await metaRes.json()
  const sheet = meta.sheets?.find(
    (s: { properties: { title: string; sheetId: number } }) =>
      s.properties.title === SHEET_NAME,
  )
  if (!sheet) throw new Error('Movies sheet not found')

  await api(':batchUpdate', 'POST', {
    requests: [{
      deleteDimension: {
        range: {
          sheetId:    sheet.properties.sheetId,
          dimension:  'ROWS',
          startIndex: movie._row - 1,
          endIndex:   movie._row,
        },
      },
    }],
  })
}
