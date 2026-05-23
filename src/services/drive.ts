/**
 * Google Drive + initial Spreadsheet setup.
 * Finds `db_films` in user's Drive; creates it if absent.
 */

import { refreshTokenIfNeeded } from './auth'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const DB_NAME = 'db_films'
const SHEET_KEY = 'films_sheet_id'

export function getSheetId(): string {
  return localStorage.getItem(SHEET_KEY) || ''
}

export function clearSheetId(): void {
  localStorage.removeItem(SHEET_KEY)
}

async function driveGet(path: string): Promise<Response> {
  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Не авторизован')
  return fetch(`${DRIVE_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

async function sheetsPost(body: object): Promise<Response> {
  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Не авторизован')
  return fetch(SHEETS_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function findOrCreateFilmsFile(): Promise<string> {
  const cached = localStorage.getItem(SHEET_KEY)
  if (cached) return cached

  // Search by name in Drive (drive.file scope covers files created by this app)
  const q = encodeURIComponent(
    `name='${DB_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
  )
  const res = await driveGet(`/files?q=${q}&fields=files(id,name)`)
  const data = await res.json()

  if (data.files?.length > 0) {
    const id: string = data.files[0].id
    localStorage.setItem(SHEET_KEY, id)
    return id
  }

  // Not found — create a new spreadsheet
  const createRes = await sheetsPost({
    properties: { title: DB_NAME },
    sheets: [{ properties: { title: 'Movies', sheetId: 0 } }],
  })
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Не удалось создать таблицу')
  }
  const sheet = await createRes.json()
  const id: string = sheet.spreadsheetId
  localStorage.setItem(SHEET_KEY, id)
  return id
}
