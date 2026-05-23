/**
 * Google Identity Services auth module.
 * Access token lives in memory only — profile cached in localStorage.
 * On app start, silent sign-in restores the session without any UI.
 */

let accessToken: string | null = null
let tokenExpiresAt = 0
let tokenClient: GoogleTokenClient | null = null
let pendingResolve: ((t: string | null) => void) | null = null

const listeners = new Set<(auth: boolean) => void>()

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
].join(' ')

const USER_KEY = 'films_user'
const SHEET_KEY = 'films_sheet_id'

export interface UserProfile {
  email: string
  name: string
  picture: string
}

/* ── helpers ─────────────────────────────────────────────────────── */

export function getUser(): UserProfile | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as UserProfile) : null
}

function saveUser(p: UserProfile) {
  localStorage.setItem(USER_KEY, JSON.stringify(p))
}

function notify(auth: boolean) {
  listeners.forEach(fn => fn(auth))
}

/* ── public API ──────────────────────────────────────────────────── */

export function onAuthChange(fn: (auth: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getToken(): string | null { return accessToken }

export function isTokenFresh(): boolean {
  return !!accessToken && Date.now() < tokenExpiresAt - 30_000
}

/* ── token lifecycle ─────────────────────────────────────────────── */

function onTokenSuccess(r: GoogleTokenResponse) {
  accessToken = r.access_token
  tokenExpiresAt = Date.now() + r.expires_in * 1000
  pendingResolve?.(r.access_token)
  pendingResolve = null
  notify(true)
  fetchUserProfile().then(p => { if (p) saveUser(p) })
}

function onTokenError() {
  pendingResolve?.(null)
  pendingResolve = null
  if (!accessToken) notify(false)
}

function handleCallback(r: GoogleTokenResponse) {
  if (r.error || !r.access_token) { onTokenError(); return }
  onTokenSuccess(r)
}

async function fetchUserProfile(): Promise<UserProfile | null> {
  if (!accessToken) return null
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const d = await res.json()
    return { email: d.email, name: d.name, picture: d.picture }
  } catch { return null }
}

/** Request token, returns access_token or null (times out after 5 s) */
function requestToken(prompt = '', hint?: string): Promise<string | null> {
  return Promise.race([
    new Promise<string | null>(resolve => {
      pendingResolve = resolve
      tokenClient!.requestAccessToken({ prompt, login_hint: hint })
    }),
    new Promise<null>(resolve =>
      setTimeout(() => { pendingResolve = null; resolve(null) }, 5_000),
    ),
  ])
}

/* ── init ────────────────────────────────────────────────────────── */

function waitForGoogle(): Promise<void> {
  return new Promise(resolve => {
    const check = () => {
      if (window.google?.accounts?.oauth2) resolve()
      else requestAnimationFrame(check)
    }
    check()
  })
}

export async function initAuth(clientId: string): Promise<void> {
  await waitForGoogle()

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: handleCallback,
    error_callback: onTokenError,
  })

  const user = getUser()
  if (user) {
    await requestToken('', user.email)
    // notify() was called inside handleCallback / onTokenError
  } else {
    notify(false)
  }
}

/* ── public actions ──────────────────────────────────────────────── */

export function signIn(): void {
  tokenClient?.requestAccessToken({ prompt: 'consent' })
}

export function signOut(): void {
  if (accessToken) window.google?.accounts?.oauth2?.revoke(accessToken, () => {})
  accessToken = null
  tokenExpiresAt = 0
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(SHEET_KEY)
  notify(false)
}

/** Call before every API request to ensure a fresh token. */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  if (isTokenFresh()) return accessToken
  const user = getUser()
  if (!user) return null
  return requestToken('', user.email)
}
