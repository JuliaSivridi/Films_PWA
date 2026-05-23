/**
 * Google Drive API — find/create/list spreadsheets.
 */

import { refreshTokenIfNeeded } from './auth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const DB_NAME = 'db_films'
const SHEET_ID_KEY = 'films_sheet_id'
const SHEET_NAME_KEY = 'films_sheet_name'

/* ── getters / setters ───────────────────────────────────────────── */

export function getSheetId(): string {
  return localStorage.getItem(SHEET_ID_KEY) || ''
}

export function getSheetName(): string {
  return localStorage.getItem(SHEET_NAME_KEY) || ''
}

export function setSheetFile(id: string, name: string): void {
  localStorage.setItem(SHEET_ID_KEY, id)
  localStorage.setItem(SHEET_NAME_KEY, name)
}

export function clearSheetId(): void {
  localStorage.removeItem(SHEET_ID_KEY)
  localStorage.removeItem(SHEET_NAME_KEY)
}

/* ── helpers ─────────────────────────────────────────────────────── */

async function driveGet(path: string): Promise<Response> {
  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Не авторизован')
  return fetch(`${DRIVE_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

/* ── public API ──────────────────────────────────────────────────── */

/** List all Google Sheets in user's Drive, sorted by last modified. */
export async function listUserSheets(): Promise<{ id: string; name: string }[]> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
  )
  const res = await driveGet(`/files?q=${q}&fields=files(id,name)&orderBy=modifiedTime+desc`)
  if (!res.ok) throw new Error('Не удалось загрузить список файлов')
  const data = await res.json()
  return (data.files as { id: string; name: string }[]) ?? []
}

/** Find `db_films` in Drive (or create it), save ID+name to localStorage. */
export async function findOrCreateFilmsFile(): Promise<string> {
  const cached = localStorage.getItem(SHEET_ID_KEY)
  if (cached) return cached

  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Не авторизован')

  // Search by name
  const q = encodeURIComponent(
    `name='${DB_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
  )
  const res = await fetch(`${DRIVE_API}/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()

  if (data.files?.length > 0) {
    const { id, name } = data.files[0] as { id: string; name: string }
    setSheetFile(id, name)
    return id
  }

  // Create new spreadsheet via Sheets API
  const createRes = await fetch(SHEETS_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: DB_NAME },
      sheets: [{ properties: { title: 'Movies', sheetId: 0 } }],
    }),
  })
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } })?.error?.message || 'Не удалось создать таблицу')
  }
  const sheet = await createRes.json()
  const id: string = sheet.spreadsheetId
  setSheetFile(id, DB_NAME)
  return id
}
