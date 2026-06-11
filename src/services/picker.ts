// Google Picker — the native Drive file-open dialog.
// With the drive.file scope, a file selected here is permanently granted to
// the app (the grant lives on Google's side, not on this device).

import { refreshTokenIfNeeded } from './auth'

const GAPI_SRC = 'https://apis.google.com/js/api.js'

let pickerReady: Promise<void> | null = null

/* eslint-disable @typescript-eslint/no-explicit-any */
function w(): any { return window as any }

function loadPickerApi(): Promise<void> {
  if (pickerReady) return pickerReady
  pickerReady = new Promise<void>((resolve, reject) => {
    const onGapi = () => w().gapi.load('picker', { callback: () => resolve() })
    if (w().gapi?.load) { onGapi(); return }
    const s = document.createElement('script')
    s.src = GAPI_SRC
    s.async = true
    s.onload = onGapi
    s.onerror = () => reject(new Error('Failed to load Google API script'))
    document.head.appendChild(s)
  })
  return pickerReady
}

export interface PickedFile { id: string; name: string }

/**
 * Opens the Google Picker limited to spreadsheets.
 * Resolves with the picked file, or null if the user cancelled.
 *
 * apiKey — browser API key with Google Picker API enabled (VITE_GOOGLE_API_KEY).
 * appId  — Cloud project number; required with drive.file so the selection
 *          grants this app access to the picked file.
 */
export async function openSpreadsheetPicker(apiKey: string, appId: string): Promise<PickedFile | null> {
  const token = await refreshTokenIfNeeded()
  if (!token) throw new Error('Not authorized')
  await loadPickerApi()

  const picker = w().google.picker
  return new Promise<PickedFile | null>((resolve) => {
    const view = new picker.DocsView(picker.ViewId.SPREADSHEETS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false)

    const dialog = new picker.PickerBuilder()
      .setAppId(appId)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .addView(view)
      .setCallback((data: { action: string; docs?: { id: string; name: string }[] }) => {
        if (data.action === picker.Action.PICKED && data.docs?.[0]) {
          resolve({ id: data.docs[0].id, name: data.docs[0].name })
        } else if (data.action === picker.Action.CANCEL) {
          resolve(null)
        }
      })
      .build()
    dialog.setVisible(true)
  })
}
