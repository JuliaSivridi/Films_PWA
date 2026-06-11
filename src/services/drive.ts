// Drive file management under the drive.file scope: the app can only see
// files it created itself or that the user picked via the Google Picker.
// There is deliberately NO silent find-by-name and NO silent create — on
// first run the user explicitly chooses "create new" or "pick existing".

import { refreshTokenIfNeeded } from './auth'

const DRIVE_API  = 'https://www.googleapis.com/drive/v3'
const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const DB_NAME        = 'db_films'
const SHEET_ID_KEY   = 'films_sheet_id'
const SHEET_NAME_KEY = 'films_sheet_name'

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

/**
 * Checks whether the app currently has a working data file.
 * 'ready' — the stored file id is accessible.
 * 'setup' — no file yet, or access to the stored one was lost
 *           (e.g. after the scope migration) → show the setup screen.
 */
export async function checkFilmsFile(): Promise<'ready' | 'setup'> {
  const cached = getSheetId()
  if (!cached) return 'setup'

  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Не авторизован')

  const res = await fetch(`${DRIVE_API}/files/${cached}?fields=id,name`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.ok) {
    const f = await res.json() as { id: string; name: string }
    setSheetFile(f.id, f.name)   // keep the display name fresh
    return 'ready'
  }
  return 'setup'
}

/** Creates a fresh db_films spreadsheet (drive.file grants access to files the app creates). */
export async function createFilmsFile(): Promise<string> {
  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Не авторизован')

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
