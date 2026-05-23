// Google Identity Services – client-side OAuth 2.0
// Token lives in memory only; user profile persisted in localStorage.
// Pattern mirrors Words_PWA auth.js exactly.

type TokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            login_hint?: string
            callback: (r: TokenResponse) => void
            error_callback?: (e: { type: string }) => void
          }): { requestAccessToken(opts: { prompt: string }): void }
          revoke(email: string, done: () => void): void
        }
      }
    }
  }
}

// --- scope: email + profile so /userinfo returns picture ---
const SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
].join(' ')

const USER_KEY = 'films_user'

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
    const d = await res.json()
    return { email: d.email, name: d.name, picture: d.picture }
  } catch { return null }
}

/* ── token client factory ───────────────────────────────────────── */

function makeTokenClient(
  onSuccess: () => void,
  onError: (type?: string) => void,
) {
  return window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    login_hint: getUser()?.email ?? undefined,
    callback: async (r: TokenResponse) => {
      if (r.error || !r.access_token) {
        onError(r.error)
        return
      }
      accessToken = r.access_token
      tokenExpiresAt = Date.now() + (r.expires_in ?? 3600) * 1000

      // Fetch and persist profile on first sign-in (needed for silent re-auth)
      if (!getUser()) {
        try {
          const p = await fetchUserProfile()
          if (p) saveUser(p)
        } catch { /* still usable without profile */ }
      }

      notify(true)
      onSuccess()
    },
    error_callback: (err: { type: string }) => {
      // popup_closed is not an error — user just dismissed
      if (err.type !== 'popup_closed') {
        onError(err.type)
      }
    },
  })
}

/* ── public API ─────────────────────────────────────────────────── */

/** Silent token restore (no UI). Resolves true if token obtained. */
export function trySilentSignIn(): Promise<boolean> {
  return new Promise(resolve => {
    if (!window.google?.accounts?.oauth2) { resolve(false); return }
    const client = makeTokenClient(
      () => resolve(true),
      () => resolve(false),
    )
    client.requestAccessToken({ prompt: '' })
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
  const email = getUser()?.email
  if (email) window.google?.accounts?.oauth2?.revoke(email, () => {})
  accessToken = null
  tokenExpiresAt = 0
  localStorage.removeItem(USER_KEY)
  notify(false)
}

/** Refresh token silently before API calls. */
export async function refreshTokenIfNeeded(): Promise<string | null> {
  if (isTokenFresh()) return accessToken
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
