import type { Movie, MovieStatus } from '../types/movie'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const SHEET_NAME = 'Movies'
const HEADERS = [
  'id', 'title_ru', 'title_en', 'year', 'genres', 'status',
  'rating', 'review', 'tmdb_id', 'poster_path',
  'kinopoisk_url', 'imdb_url', 'tmdb_url', 'wiki_url',
  'date_added', 'date_watched',
]

export function getSheetsId(): string {
  return localStorage.getItem('sheets_id') || import.meta.env.VITE_SHEETS_ID || ''
}

async function api(
  path: string,
  method: string,
  token: string,
  body?: object,
): Promise<Response> {
  const id = getSheetsId()
  const res = await fetch(`${SHEETS_API}/${id}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Sheets API error ${res.status}`)
  }
  return res
}

function rowToMovie(row: string[], rowIndex: number): Movie {
  return {
    id: row[0] || String(rowIndex),
    title_ru: row[1] || '',
    title_en: row[2] || '',
    year: parseInt(row[3]) || 0,
    genres: row[4] ? JSON.parse(row[4]) : [],
    status: (row[5] as MovieStatus) || 'want',
    rating: row[6] ? parseFloat(row[6]) : undefined,
    review: row[7] || undefined,
    tmdb_id: row[8] || undefined,
    poster_path: row[9] || undefined,
    kinopoisk_url: row[10] || undefined,
    imdb_url: row[11] || undefined,
    tmdb_url: row[12] || undefined,
    wiki_url: row[13] || undefined,
    date_added: row[14] || new Date().toISOString(),
    date_watched: row[15] || undefined,
    _row: rowIndex + 2,
  }
}

function movieToRow(movie: Movie): string[] {
  return [
    movie.id,
    movie.title_ru,
    movie.title_en,
    String(movie.year),
    JSON.stringify(movie.genres),
    movie.status,
    movie.rating != null ? String(movie.rating) : '',
    movie.review || '',
    movie.tmdb_id || '',
    movie.poster_path || '',
    movie.kinopoisk_url || '',
    movie.imdb_url || '',
    movie.tmdb_url || '',
    movie.wiki_url || '',
    movie.date_added,
    movie.date_watched || '',
  ]
}

export async function initializeSheet(token: string): Promise<void> {
  const id = getSheetsId()
  const metaRes = await fetch(
    `${SHEETS_API}/${id}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!metaRes.ok) throw new Error('Не удалось получить метаданные таблицы')
  const meta = await metaRes.json()

  const hasSheet = meta.sheets?.some(
    (s: { properties: { title: string } }) => s.properties.title === SHEET_NAME,
  )

  if (!hasSheet) {
    await api(':batchUpdate', 'POST', token, {
      requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
    })
    await api(
      `/values/${SHEET_NAME}!A1:P1?valueInputOption=RAW`,
      'PUT', token, { values: [HEADERS] },
    )
    return
  }

  const headRes = await api(`/values/${SHEET_NAME}!A1:A1`, 'GET', token)
  const headData = await headRes.json()
  if (!headData.values || headData.values[0]?.[0] !== 'id') {
    await api(
      `/values/${SHEET_NAME}!A1:P1?valueInputOption=RAW`,
      'PUT', token, { values: [HEADERS] },
    )
  }
}

export async function fetchMovies(token: string): Promise<Movie[]> {
  const res = await api(`/values/${SHEET_NAME}!A:P`, 'GET', token)
  const data = await res.json()
  if (!data.values || data.values.length <= 1) return []
  return (data.values as string[][])
    .slice(1)
    .map((row, i) => rowToMovie(row, i))
    .filter(m => m.id && (m.title_ru || m.title_en))
}

export async function addMovie(token: string, movie: Movie): Promise<Movie> {
  const res = await api(
    `/values/${SHEET_NAME}!A:P:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    'POST', token, { values: [movieToRow(movie)] },
  )
  const data = await res.json()
  const range: string = data.updates?.updatedRange || ''
  const match = range.match(/!A(\d+):/)
  return { ...movie, _row: match ? parseInt(match[1]) : undefined }
}

export async function updateMovie(token: string, movie: Movie): Promise<void> {
  if (!movie._row) throw new Error('Номер строки неизвестен')
  await api(
    `/values/${SHEET_NAME}!A${movie._row}:P${movie._row}?valueInputOption=RAW`,
    'PUT', token, { values: [movieToRow(movie)] },
  )
}

export async function deleteMovie(token: string, movie: Movie): Promise<void> {
  if (!movie._row) throw new Error('Номер строки неизвестен')
  const id = getSheetsId()
  const metaRes = await fetch(`${SHEETS_API}/${id}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meta = await metaRes.json()
  const sheet = meta.sheets?.find(
    (s: { properties: { title: string; sheetId: number } }) =>
      s.properties.title === SHEET_NAME,
  )
  if (!sheet) throw new Error('Лист Movies не найден')

  await api(':batchUpdate', 'POST', token, {
    requests: [{
      deleteDimension: {
        range: {
          sheetId: sheet.properties.sheetId,
          dimension: 'ROWS',
          startIndex: movie._row - 1,
          endIndex: movie._row,
        },
      },
    }],
  })
}
