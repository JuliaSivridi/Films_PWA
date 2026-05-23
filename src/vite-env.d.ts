/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_TMDB_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
