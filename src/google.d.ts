interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken(options?: { prompt?: string; login_hint?: string }): void
}

interface Window {
  google: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string
          scope: string
          callback: (r: GoogleTokenResponse) => void
          error_callback?: (e: { type: string }) => void
        }): GoogleTokenClient
        revoke(token: string, done: () => void): void
      }
    }
  }
}
