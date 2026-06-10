// Google Identity Services – client-side OAuth 2.0
// Token is persisted in localStorage so page refresh doesn't require GIS popup.
// Types come from src/google.d.ts (GoogleTokenResponse, GoogleTokenClient, Window.google).

const SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
].join(' ')

const USER_KEY         = 'films_user'
const TOKEN_KEY        = 'films_token'
const TOKEN_EXPIRY_KEY = 'films_token_expiry'

let accessToken: string | null = null
let tokenExpiresAt = 0
let CLIENT_ID = ''

const listeners = new Set<(isAuth: boolean) => void>()

/* ── types ─────────────────────────────────────────────────────── */

export interface UserProfile {
  email: string
  name: string
  picture: string
}

/* ── profile storage ────────────────────────────────────────────── */

export function getUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as UserProfile) : null
  } catch { return null }
}

function saveUser(p: UserProfile) {
  localStorage.setItem(USER_KEY, JSON.stringify(p))
}

/* ── token helpers ──────────────────────────────────────────────── */

export function getToken(): string | null { return accessToken }

export function isTokenFresh(): boolean {
  return !!accessToken && Date.now() < tokenExpiresAt - 30_000
}

/* ── token persistence ──────────────────────────────────────────── */

function persistToken(token: string, expiresIn: number) {
  const expiry = Date.now() + expiresIn * 1000
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiry))
  accessToken = token
  tokenExpiresAt = expiry
}

function loadPersistedToken(): boolean {
  const token  = localStorage.getItem(TOKEN_KEY)
  const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) ?? '0')
  if (token && Date.now() < expiry - 30_000) {
    accessToken    = token
    tokenExpiresAt = expiry
    return true
  }
  return false
}

function clearPersistedToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
  accessToken    = null
  tokenExpiresAt = 0
}

/* ── listeners ──────────────────────────────────────────────────── */

export function onAuthChange(fn: (isAuth: boolean) => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify(isAuth: boolean) {
  listeners.forEach(fn => fn(isAuth))
}

/* ── profile fetch ──────────────────────────────────────────────── */

async function fetchUserProfile(): Promise<UserProfile | null> {
  if (!accessToken) return null
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const d = await res.json() as { email: string; name: string; picture: string }
    return { email: d.email, name: d.name, picture: d.picture }
  } catch { return null }
}

/* ── token client factory ───────────────────────────────────────── */
// login_hint is passed to requestAccessToken (not initTokenClient config)
// because google.d.ts only declares it on GoogleTokenClient.requestAccessToken.

function makeTokenClient(
  onSuccess: () => void,
  onError: (type?: string) => void,
): GoogleTokenClient {
  return window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: async (r: GoogleTokenResponse) => {
      if (r.error || !r.access_token) {
        onError(r.error)
        return
      }
      persistToken(r.access_token, r.expires_in ?? 3600)

      // Fetch and persist profile on first sign-in (needed for future silent auth)
      if (!getUser()) {
        try {
          const p = await fetchUserProfile()
          if (p) saveUser(p)
        } catch { /* still usable without picture */ }
      }

      notify(true)
      onSuccess()
    },
    error_callback: (err: { type: string }) => {
      if (err.type !== 'popup_closed') {
        onError(err.type)
      }
    },
  })
}

/* ── public API ─────────────────────────────────────────────────── */

/** Silent token restore (no UI). Resolves true if successful. */
export function trySilentSignIn(): Promise<boolean> {
  return new Promise(resolve => {
    if (!window.google?.accounts?.oauth2) { resolve(false); return }
    const client = makeTokenClient(
      () => resolve(true),
      () => resolve(false),
    )
    client.requestAccessToken({ prompt: '', login_hint: getUser()?.email })
  })
}

/** Interactive sign-in popup. Returns promise that resolves on success. */
export function signIn(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services not loaded'))
      return
    }
    const client = makeTokenClient(
      () => resolve(),
      (e) => reject(new Error(e ?? 'Sign-in failed')),
    )
    client.requestAccessToken({ prompt: 'consent' })
  })
}

export function signOut(): void {
  if (accessToken) window.google?.accounts?.oauth2?.revoke(accessToken, () => {})
  clearPersistedToken()
  localStorage.removeItem(USER_KEY)
  notify(false)
}

/** Refresh token silently before API calls. */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  if (isTokenFresh()) return accessToken
  if (loadPersistedToken()) return accessToken
  const ok = await trySilentSignIn()
  return ok ? accessToken : null
}

/* ── init ───────────────────────────────────────────────────────── */

function waitForGIS(): Promise<void> {
  return new Promise(resolve => {
    function check() {
      if (window.google?.accounts?.oauth2) resolve()
      else setTimeout(check, 50)
    }
    check()
  })
}

export async function initAuth(clientId: string): Promise<void> {
  CLIENT_ID = clientId

  // Fast path: use stored token if still valid — no GIS popup needed
  if (getUser() && loadPersistedToken()) {
    notify(true)
    return
  }

  await waitForGIS()

  if (getUser()) {
    // Has saved profile → restore token silently (no UI)
    const ok = await trySilentSignIn()
    if (!ok) notify(false)
    // if ok → notify(true) already called inside makeTokenClient callback
  } else {
    notify(false)
  }
}
