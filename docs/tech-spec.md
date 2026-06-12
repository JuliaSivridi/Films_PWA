# Films PWA — Technical Specification

**Version:** 1.3  
**Date:** June 2026  
**Repository:** `JuliaSivridi/Films_PWA`  
**Deployed at:** GitHub Pages — `https://juliasivridi.github.io/Films_PWA/`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project Structure](#3-project-structure)
4. [Data Model](#4-data-model)
5. [External APIs](#5-external-apis)
6. [Services Layer](#6-services-layer)
7. [State Management](#7-state-management)
8. [Component Architecture](#8-component-architecture)
9. [Navigation & Routing](#9-navigation--routing)
10. [Styling System](#10-styling-system)
11. [Build & Deployment](#11-build--deployment)
12. [Key Algorithms](#12-key-algorithms)

---

## 1. Overview

Films PWA is a personal movie-collection manager built as a Progressive Web App. The user authenticates with Google OAuth 2.0; their film data lives in a private Google Spreadsheet (no custom backend). The app lets the user browse, search, filter, add, edit, and delete movies, and view statistical breakdowns of the collection.

**Key design decisions:**

- **No backend server.** All persistence goes directly to Google Sheets API v4.
- **No routing library.** Navigation is modelled as React state (`view: 'list' | 'stats'`).
- **No chart library.** The statistics donut is rendered with raw SVG path math.
- **No CSS-in-JS.** Styles live in per-component CSS Modules plus global custom properties.
- **Virtual scrolling** for the movie list (3 000+ films) via `@tanstack/react-virtual`.
- **CI-generated PNG icons** — `rsvg-convert` converts the SVG source to 192 and 512 px PNG in the GitHub Actions workflow before the Vite build runs.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React 18 | Strict Mode in `main.tsx` |
| Language | TypeScript 5 | Strict, `moduleResolution: bundler` |
| Build tool | Vite 5 | `@vitejs/plugin-react` plugin |
| Styling | CSS Modules + CSS custom properties | Light/dark via `prefers-color-scheme` |
| Virtual scroll | `@tanstack/react-virtual` v3 | `useWindowVirtualizer` |
| Icons | Material Symbols Outlined | Loaded from Google Fonts CDN |
| Auth | Google Identity Services (GIS) | Token persisted in `localStorage`; `drive.file` scope |
| Database | Google Sheets API v4 | One spreadsheet, one `Movies` sheet |
| Movie metadata | TMDB API v3 | Search, details, genres, keywords |
| Extra links | Wikidata SPARQL | Kinopoisk URL + Wikipedia link |
| PWA | vite-plugin-pwa (Workbox) | PNG icons generated in CI |
| Hosting | GitHub Pages | Auto-deploy via GitHub Actions on push to `main` |

**Runtime dependencies (`package.json`):**

```
react, react-dom          — ^18
@tanstack/react-virtual   — ^3
vite, @vitejs/plugin-react, typescript, vite-plugin-pwa — devDependencies
```

---

## 3. Project Structure

```
Films_PWA/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions: build + deploy to Pages
├── public/
│   └── icons/
│       ├── icon.svg            # Source icon (orange bg, VideoLibraryOutlined)
│       ├── icon-192.png        # Generated in CI by rsvg-convert (not in repo)
│       └── icon-512.png        # Generated in CI by rsvg-convert (not in repo)
├── src/
│   ├── main.tsx                # ReactDOM.createRoot, StrictMode
│   ├── App.tsx                 # Root: auth phases, view routing, SetupScreen
│   ├── index.css               # Global variables, resets, base styles
│   ├── types/
│   │   └── movie.ts            # Movie interface, MovieStatus, STATUS_LABELS/COLORS
│   ├── context/
│   │   ├── AuthContext.tsx     # Thin wrapper: authenticated, user, signIn, signOut
│   │   └── MoviesContext.tsx   # useReducer store: movies, filters, CRUD + IndexedDB cache
│   ├── services/
│   │   ├── auth.ts             # GIS OAuth2, token persistence in localStorage
│   │   ├── cache.ts            # IndexedDB key-value cache (stale-while-revalidate)
│   │   ├── drive.ts            # Drive API: check/create spreadsheet (drive.file scope)
│   │   ├── picker.ts           # Google Picker dialog for spreadsheet selection
│   │   ├── sheets.ts           # Sheets API v4: CRUD on rows
│   │   ├── tmdb.ts             # TMDB search, details, genres, poster URLs
│   │   └── wikidata.ts         # SPARQL: Kinopoisk URL + Wikipedia
│   └── components/
│       ├── LoginPage.tsx / .module.css
│       ├── Header.tsx / .module.css
│       ├── FilterPanel.tsx / .module.css
│       ├── MovieGrid.tsx / .module.css
│       ├── MovieList.tsx / .module.css
│       ├── AlphaPicker.tsx / .module.css
│       ├── AddMovieModal.tsx / .module.css
│       ├── SettingsModal.tsx / .module.css
│       ├── StatsPage.tsx / .module.css
│       ├── HelpPage.tsx        # Full-screen short guide (StatsPage pattern)
│       └── FeedbackPage.tsx    # Full-screen feedback form (POST to VITE_FEEDBACK_URL)
├── docs/
│   └── tech-spec.md            # This document
├── index.html                  # Vite entry; loads GIS script
├── vite.config.ts
├── tsconfig.json
├── package.json
└── package-lock.json
```

---

## 4. Data Model

### 4.1 `Movie` interface (`src/types/movie.ts`)

```typescript
export type MovieStatus = 'want' | 'watched'

export interface Movie {
  id:            string           // UUID (crypto.randomUUID or fallback)
  title_ru:      string           // Russian title
  title_orig:    string           // Original title
  year:          number           // Release year (0 if unknown)
  status:        MovieStatus      // 'want' | 'watched'
  tmdb_id?:      string           // TMDB movie ID (stored as string)
  poster_path?:  string           // TMDB poster path (e.g. "/abc123.jpg")
  genres?:       string[]         // ["Drama", "Thriller"]
  tmdb_rating?:  number           // vote_average, rounded to 1 decimal
  duration_min?: number           // Runtime in minutes
  kinopoisk_url?: string
  imdb_url?:     string
  tmdb_url?:     string
  wiki_url?:     string
  countries?:    string[]         // ["France", "Italy"]
  keywords?:     string[]         // TMDB keywords, e.g. ["fairy tale"]
  _row?:         number           // 1-based Sheets row number (runtime only)
}

export const STATUS_LABELS: Record<MovieStatus, string> = {
  want: 'Want', watched: 'Watched'
}
export const STATUS_COLORS: Record<MovieStatus, string> = {
  want: '#f59e0b', watched: '#10b981'
}
```

### 4.2 Google Sheets Layout

One sheet named `Movies`. Row 1 is a header row written by `initializeSheet()` on first use. Columns A–P (16 total).

| Column | Letter | Field | Notes |
|---|---|---|---|
| 1 | A | id | UUID string |
| 2 | B | title_ru | Russian title |
| 3 | C | title_orig | Original title |
| 4 | D | year | Integer string |
| 5 | E | status | `want` or `watched` |
| 6 | F | tmdb_id | Numeric string |
| 7 | G | poster_path | TMDB path string |
| 8 | H | genres | JSON array string |
| 9 | I | tmdb_rating | Float string |
| 10 | J | duration_min | Integer string |
| 11 | K | kinopoisk_url | URL string |
| 12 | L | imdb_url | URL string |
| 13 | M | tmdb_url | URL string |
| 14 | N | wiki_url | URL string |
| 15 | O | countries | JSON array string |
| 16 | P | keywords | JSON array string |

Array fields (genres, countries, keywords) are stored as JSON-serialized string arrays: `["Drama","Thriller"]`. The `parseArr()` helper wraps `JSON.parse` in a try/catch so malformed cells return `undefined` instead of crashing the app.

---

## 5. External APIs

### 5.1 Google Identity Services (GIS)

- Script loaded from `https://accounts.google.com/gsi/client`
- TypeScript types declared in `src/google.d.ts`
- OAuth 2.0 implicit flow
- Scopes: `email profile https://www.googleapis.com/auth/drive.file`
  - `drive.file` — access only to files the app created or the user explicitly picked via Google Picker (no broad Drive/Sheets access)
- Token **persisted in `localStorage`** (`films_token`, `films_token_expiry`) — fast startup without a GIS popup on page refresh
- `CLIENT_ID` from `VITE_GOOGLE_CLIENT_ID` env var, with `localStorage('films_google_client_id')` fallback (namespaced to avoid collisions with other apps on the shared `juliasivridi.github.io` origin)

### 5.2 Google Sheets API v4

Base URL: `https://sheets.googleapis.com/v4/spreadsheets`

| Operation | Method | Endpoint |
|---|---|---|
| Read all rows | GET | `/{id}/values/Movies!A:P` |
| Append row | POST | `/{id}/values/Movies!A:P:append?valueInputOption=RAW` |
| Update row | PUT | `/{id}/values/Movies!A{row}:P{row}?valueInputOption=RAW` |
| Delete row | POST | `/{id}:batchUpdate` (deleteDimension) |
| Init headers | PUT | `/{id}/values/Movies!A1:P1?valueInputOption=RAW` |
| Get sheetId | GET | `/{id}?fields=sheets.properties` |

### 5.3 Google Drive API v3

Base URL: `https://www.googleapis.com/drive/v3`

Under the `drive.file` scope the app can only access files it created or files the user explicitly chose via Google Picker.

| Operation | Endpoint | Purpose |
|---|---|---|
| Check file access | `GET /files/{id}?fields=id,name` | Verify stored sheet ID is still accessible |
| Create spreadsheet | `POST sheets.googleapis.com/.../spreadsheets` | First-time or explicit new-file creation |

Results cached in `localStorage`: `films_sheet_id`, `films_sheet_name`.

> **No more silent find-by-name.** The old `findOrCreateFilmsFile()` (Drive search + silent create) is removed. On first run or after losing access, the user sees the `SetupScreen` and explicitly creates a new spreadsheet or picks one via Google Picker.

### 5.3a Google Picker API

Loaded lazily from `https://apis.google.com/js/api.js`. Opens the native Drive file-open dialog, filtered to spreadsheets. Requires `VITE_GOOGLE_API_KEY` (browser API key) and the Cloud project number (derived from `CLIENT_ID`). A file picked here is permanently granted to the `drive.file` scope.

### 5.4 TMDB API v3

Base URL: `https://api.themoviedb.org/3`. API key stored in `localStorage('tmdb_key')`.

| Endpoint | Purpose |
|---|---|
| `GET /search/movie?query=…&language=ru-RU` | Title search (max 8 results) |
| `GET /movie/{id}?append_to_response=external_ids,keywords` | Runtime, IMDb ID, countries, keywords |
| `GET /genre/movie/list?language=en-US` | Genre ID → name (cached in memory) |
| `https://image.tmdb.org/t/p/{size}{path}` | Poster images |

### 5.5 Wikidata SPARQL

Endpoint: `https://query.wikidata.org/sparql`

Looks up by IMDb ID (`P345`), retrieves Kinopoisk ID (`P2603`) and Wikipedia sitelinks (RU preferred, EN fallback). Returns `{ kinopoisk_url, wiki_url }`.

---

## 6. Services Layer

### 6.1 `auth.ts` — Token Lifecycle

Token is persisted in `localStorage` (`films_token`, `films_token_expiry`) so a page refresh restores the session without a GIS popup.

```
initAuth(clientId)
  └─ Fast path: if stored token still valid → notify(true) immediately
  └─ Otherwise: waitForGIS() → trySilentSignIn() (no UI)

trySilentSignIn(): Promise<boolean>
  └─ makeTokenClient({ prompt: '' }) → requestAccessToken({ login_hint: email })
  └─ on success: persistToken() → notify(true)

signIn(): Promise<void>
  └─ makeTokenClient({ prompt: 'consent' }) → requestAccessToken()

signOut()
  └─ google.accounts.oauth2.revoke()
  └─ clearPersistedToken() + removeItem(films_user) → notify(false)

refreshTokenIfNeeded(): Promise<string | null>
  └─ if isTokenFresh() → return current token
  └─ else loadPersistedToken() → or trySilentSignIn()
  └─ returns the token string (used directly by picker.ts)
```

`localStorage` keys used by `auth.ts`: `films_user`, `films_token`, `films_token_expiry`.

### 6.2 `drive.ts`

```
checkFilmsFile(): Promise<'ready' | 'setup'>
  └─ No cached id → 'setup'
  └─ GET /files/{id} → 200 → 'ready' (refreshes display name)
  └─ non-200 → 'setup' (access lost, e.g. after scope migration)

createFilmsFile(): Promise<string>
  └─ POST to Sheets API → creates new 'db_films' spreadsheet
  └─ setSheetFile(id, name) in localStorage → returns id
```

`localStorage` keys: `films_sheet_id`, `films_sheet_name`.

### 6.2a `picker.ts`

```
openSpreadsheetPicker(apiKey, appId): Promise<PickedFile | null>
  └─ loadPickerApi() — lazy-loads apis.google.com/js/api.js (once)
  └─ refreshTokenIfNeeded() → get current token
  └─ new google.picker.PickerBuilder()
       .setAppId(appId)
       .setOAuthToken(token)
       .setDeveloperKey(apiKey)
       .addView(SPREADSHEETS)
  └─ resolves { id, name } on PICKED, null on CANCEL
```

### 6.3 `cache.ts` — IndexedDB Key-Value Store

Tiny dependency-free wrapper around `indexedDB`. Database `films_cache`, object store `kv`.

```typescript
cacheGet<T>(key: string): Promise<T | null>   // read (readonly transaction)
cacheSet(key: string, value: unknown): void    // write (readwrite transaction, best-effort)
```

Used in `MoviesContext.load()` for **stale-while-revalidate**: the cached movie list renders immediately while the fresh copy is fetched from Sheets in the background. Cache errors are silently ignored — they never block the app.

### 6.4 `sheets.ts` — rowToMovie()

```typescript
function parseArr(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : undefined
  } catch { return undefined }
}

function rowToMovie(row: string[], rowIndex: number): Movie {
  return {
    id:           row[0] || String(rowIndex),
    title_ru:     row[1] || '',
    title_orig:   row[2] || '',
    year:         parseInt(row[3]) || 0,
    status:       (row[4] as MovieStatus) || 'want',
    tmdb_id:      row[5] || undefined,
    poster_path:  row[6] || undefined,
    genres:       parseArr(row[7]),
    tmdb_rating:  row[8] ? parseFloat(row[8]) : undefined,
    duration_min: row[9] ? parseInt(row[9]) : undefined,
    kinopoisk_url: row[10] || undefined,
    imdb_url:     row[11] || undefined,
    tmdb_url:     row[12] || undefined,
    wiki_url:     row[13] || undefined,
    countries:    parseArr(row[14]),
    keywords:     parseArr(row[15]),
    _row:         rowIndex + 2,
  }
}
```

### 6.5 `tmdb.ts`

- `searchMovies(query)` — returns up to 8 `TMDBMovie` objects; debounced at call site (400 ms)
- `getMovieDetails(tmdbId)` — `?append_to_response=external_ids,keywords`; returns `{ runtime, imdb_id, countries[], keywords[] }`
- `getGenres()` — fetches once, caches in module-level `genreCache: Record<number, string>`
- `getPosterUrl(path, size)` — `https://image.tmdb.org/t/p/${size}${path}`
- `formatDuration(min)` — e.g. `"1h 45m"`, `"2h"`, `"45m"`

### 6.6 `wikidata.ts`

SPARQL query looks up by IMDb ID (`P345`), gets Kinopoisk ID (`P2603`) and RU/EN Wikipedia sitelinks.

---

## 7. State Management

### 7.1 `AuthContext`

Thin provider exposing `{ authenticated, user, signIn, signOut }`. `UserProfile` is `{ name, email, picture }`, persisted in `localStorage('films_user')`.

### 7.2 `MoviesContext` — `useReducer` Store

```typescript
interface FiltersState {
  status:     MovieStatus | 'all'   // default: 'all'
  yearFrom:   number | null
  yearTo:     number | null
  ratingFrom: number | null
  ratingTo:   number | null
  country:    string                // substring match
}
```

**Reducer actions:** `LOADING` · `SET` · `ADD` · `UPDATE` · `ERROR` · `QUERY` · `SET_FILTERS` · `CLEAR_FILTERS`

> `DELETE` action and `remove()` method were removed — film deletion is no longer exposed in the UI.

**Startup — stale-while-revalidate:**

```typescript
// load() in MoviesContext
const cached = await cacheGet<Movie[]>('movies')
if (cached?.length) dispatch({ type: 'SET', payload: cached })  // instant render

await initializeSheet()
dispatch({ type: 'SET', payload: await fetchMovies() })         // fresh data replaces cache

// Cache kept in sync after every state change:
useEffect(() => { if (movies.length > 0) cacheSet('movies', movies) }, [movies])
```

A transient fetch error is non-fatal when cached data is already on screen.

**Search logic** (unified — titles + genres + keywords):

```typescript
const q = query.toLowerCase()
movie.title_ru.toLowerCase().includes(q)
|| movie.title_orig.toLowerCase().includes(q)
|| movie.genres?.some(g  => g.toLowerCase().includes(q))
|| movie.keywords?.some(k => k.toLowerCase().includes(q))
```

**Filter logic:**

```typescript
status:  movie.status === filters.status           (skipped if 'all')
year:    movie.year >= yearFrom && movie.year <= yearTo
rating:  movie.tmdb_rating != null && in [ratingFrom, ratingTo]
country: movie.countries?.some(c =>
           c.toLowerCase().includes(filters.country.toLowerCase()))
```

**`activeFilterCount`** (0–4): +1 for status ≠ `'all'`, +1 if year range set, +1 if rating range set, +1 if country non-empty.

---

## 8. Component Architecture

### 8.1 Component Tree

```
App
└── AuthProvider
    └── MoviesProvider
        └── AppInner
            ├── [phase=loading]  → splash screen
            ├── [phase=login]    → LoginPage
            ├── [phase=setup]    → SetupScreen (inline in App.tsx)
            └── [phase=ready]    → MainContent
                ├── Header (overlayTitle mode on Help/Feedback)
                │   ├── FilterPanel (conditional)
                │   └── SettingsModal (conditional)
                ├── [view=list]     → MovieGrid
                │   ├── MovieList
                │   │   └── AlphaPicker (conditional)
                │   └── AddMovieModal (conditional)
                ├── [view=stats]    → StatsPage
                ├── [view=help]     → HelpPage
                └── [view=feedback] → FeedbackPage
```

### 8.2 `App.tsx`

**Phases:** `'loading' | 'login' | 'setup' | 'ready'`

On mount, subscribes to `onAuthChange()`: not authenticated → `login`; authenticated → `checkFilmsFile()` → `'ready'` or `'setup'`.

**`SetupScreen`** (rendered at `phase=setup`) — user explicitly chooses:
- **"Choose from Google Drive"** → `openSpreadsheetPicker()` → `setSheetFile()` → `ready`
- **"Create new spreadsheet"** → `createFilmsFile()` → `ready`

`PICKER_API_KEY` = `VITE_GOOGLE_API_KEY` env var; `PICKER_APP_ID` = numeric prefix of `CLIENT_ID`.

`MainContent` manages `view: 'list' | 'stats' | 'help' | 'feedback'` and `alphaOpen: boolean`. Logo click: any non-list view → go to list; else → toggle AlphaPicker.

### 8.3 `Header`

Props: `{ onLogoClick, onStatsClick, onHelpClick, onFeedbackClick, overlayTitle?, onOverlayBack }`.

Normal mode: logo (26×26 SVG + "Films" label), unified search input, filter toggle with badge, avatar dropdown (Statistics → Help → Feedback → Settings → Sign out).

**Overlay mode** (`overlayTitle` is set, e.g. `"Short guide"` or `"Feedback"`): back arrow + centred title + avatar icon. Search and filter toggle are hidden. Used when `view === 'help'` or `view === 'feedback'`.

A `ResizeObserver` on `<header>` feeds its height to `MovieList` for virtual scroll `scrollMargin`.

### 8.4 `FilterPanel`

Controls bound to `MoviesContext`: Status chips (All/Want/Watched), Year range, Rating range, Country substring input. Shows "Clear all filters" when `activeFilterCount > 0`.

### 8.5 `MovieGrid`

Orchestrator for the list view: loading spinner → error text → empty state → `<MovieList>` + FAB. Manages `editing: Movie | null` to open `AddMovieModal` in edit mode.

**Result count** — shown above the list when `filtered.length > 0`. Format:
- No active filters: `"312 films"` (singular `"1 film"`)
- Filters/search active: `"47 of 312"` (when `filtered.length !== movies.length`)

**Empty state** — two distinct cases:
- `movies.length === 0` → first-run: `"No movies yet"` + "Add your first movie" button
- `movies.length > 0 && filtered.length === 0` → no match: `"Nothing matches your search or filters"`

### 8.6 `MovieList`

Sorted (`localeCompare('ru')`) and grouped into `VItem[]` (dividers + rows). Letter order: Cyrillic → A–Z → `#`.

```typescript
useWindowVirtualizer({
  count: items.length,
  estimateSize: i => items[i].type === 'divider' ? 42 : 157,
  overscan: 5,
  scrollMargin: headerHeight,   // updated by ResizeObserver
})
```

**Row content:** poster (90×135 px) · titles · year/duration/★rating · countries · link buttons (KP/IMDb/TMDB/Wiki).

**Status dot:** a 16×16 px circle, `position: absolute`, bottom-right corner of the poster button. Colour from `STATUS_COLORS[m.status]` (`#10b981` watched / `#f59e0b` want), `border: 2px solid var(--surface)` for separation from the poster.

**AlphaPicker:** fixed overlay, 7-column letter grid; only letters with films shown. Click scrolls via `virtualizer.scrollToIndex()`.

### 8.7 `AddMovieModal`

Two-phase modal (`'search'` → `'form'`):
- **Search phase:** debounced TMDB search (400 ms, min 2 chars); duplicate detection via `tmdbIndex = useMemo(() => Map<tmdb_id, Movie>)`; existing films show status badge
- **Background enrichment** after TMDB selection: genres, runtime, countries, keywords, IMDb ID, KP/Wiki fetched concurrently; `currentTmdbId` ref guards against stale results
- **Form order:** Poster+Titles → Year/Duration → Status → Links (editable) → Countries (read-only) → Genres (read-only chips) → Keywords (read-only chips)
- **Default status:** `'want'`

### 8.8 `StatsPage`

Props: `{ onBack }`. Selectable dimensions:

| Key | Source | Grouping |
|---|---|---|
| `decade` | `year` | `Math.floor(year/10)*10 + 's'` |
| `rating` | `tmdb_rating` | `Math.floor(rating) + '.x'` |
| `country` | `countries[]` | Each element separately |
| `genre` | `genres[]` | Each element separately |

`computeSlices()` returns `{ slices, uniqueCount }`:
- **`slices`** — top 15 entries by frequency + "Others" remainder bucket (`#94a3b8`)
- **`uniqueCount`** — number of films that had at least one valid value for the current dimension (not the sum of slice counts, which would be inflated for multi-value fields like genre/country)

`DonutChart` shows `uniqueCount` in the donut centre. The sector angles are still proportional to each slice's raw count. Color palette: 15 colors cycling from `#6366f1` through the full PALETTE array.

**SVG donut:** `viewBox="0 0 280 280"`, cx=140, cy=140, R=125, r=68, start angle −π/2.

### 8.9 `HelpPage`

Full-screen page (reuses `StatsPage.module.css` layout). Three sections: **Basics**, **Find & organize**, **Data** — each a list of `[term, description]` pairs covering add, edit, search, filters, alphabet jump, statistics, and data location.

### 8.10 `FeedbackPage`

Full-screen page. Textarea + "Send" button. POSTs to `VITE_FEEDBACK_URL` (form-encoded: `app=Films`, `email`, `message`) using `mode: 'no-cors'`. Hidden when `VITE_FEEDBACK_URL` is not set.

### 8.11 `SettingsModal`

- **TMDB key:** password input, `localStorage('tmdb_key')`, closes after 700 ms
- **Spreadsheet picker:** `listUserSheets()` → `<select>`; on change: `setSheetFile()` + `load()`

### 8.12 `LoginPage`

Centered card: horizontal logo row (SVG icon + "Films" heading + tagline), description, Google Sign-In button.

---

## 9. Navigation & Routing

No React Router. Pure React state:

**App phases:**

| From | Event | To |
|---|---|---|
| any | App load | `loading` |
| loading | Not authenticated | `login` |
| loading | Auth OK + file accessible | `ready` |
| loading | Auth OK + no file / access lost | `setup` |
| setup | File created or picked | `ready` |

**Views (within `ready`):**

| From | Event | To |
|---|---|---|
| any | Logo click | `list` (or AlphaPicker toggle if already `list`) |
| list | "Statistics" in avatar menu | `stats` |
| list | "Short guide" in avatar menu | `help` |
| list | "Feedback" in avatar menu | `feedback` |
| stats / help / feedback | Back button or logo click | `list` |

---

## 10. Styling System

### 10.1 CSS Custom Properties (`src/index.css`)

**Light theme:**

```css
--bg: #F5F3F0;        --surface: #FFFFFF;    --surface-2: #F0EDE8;
--surface-3: #E5E1DA; --border: #DDD9D2;
--text: #1C1C1C;      --text-2: #6B6B6B;     --text-3: #A0A0A0;
--accent: #E07E38;    --accent-hover: #C96E2F;
--accent-light: rgba(224, 126, 56, .14);
--want: #f59e0b;      --watched: #10b981;    --danger: #ef4444;
--radius: 12px;       --radius-sm: 8px;
--shadow: 0 4px 20px rgba(0, 0, 0, .08);
```

**Dark theme (`@media (prefers-color-scheme: dark)`):**

```css
--bg: #0f0f0f;        --surface: #1a1a1a;    --surface-2: #242424;
--surface-3: #2e2e2e; --border: #333;
--text: #f0f0f0;      --text-2: #999;        --text-3: #555;
--accent: #E8935A;    --accent-hover: #D4814A;
--accent-light: rgba(232, 147, 90, .15);
--shadow: 0 4px 24px rgba(0, 0, 0, .55);
```

### 10.2 CSS Modules

Each component has a co-located `.module.css`. Class names are locally scoped by Vite/CSS Modules at build time.

---

## 11. Build & Deployment

### 11.1 Vite Configuration

```typescript
export default defineConfig({
  base: '/Films_PWA/',   // subdirectory base for GitHub Pages
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Films',
        start_url: '/Films_PWA/',
        scope: '/Films_PWA/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon.svg',     sizes: 'any',     type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // runtime caching: Google Fonts, TMDB images
      },
    }),
  ],
})
```

Icon paths use no leading slash so VitePWA prepends the `base` (`/Films_PWA/`) in the generated manifest.

### 11.2 GitHub Actions Workflow (`.github/workflows/deploy.yml`)

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24 }
      - run: npm install
      - name: Generate PNG icons from SVG
        run: |
          sudo apt-get install -y librsvg2-bin
          rsvg-convert -w 192 -h 192 public/icons/icon.svg > public/icons/icon-192.png
          rsvg-convert -w 512 -h 512 public/icons/icon.svg > public/icons/icon-512.png
      - run: npm run build
        env: { VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }} }
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    uses: actions/deploy-pages@v4
```

PNG icons are generated **before** the Vite build so they land in `dist/icons/` as static assets. The PNG step uses `librsvg2-bin` (`rsvg-convert`), installed via `apt-get`; this correctly renders the SVG including `fill`, `stroke`, and `rx` attributes.

### 11.3 Environment Variables

| Variable | Purpose | Set in |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth2 client ID | GitHub → Settings → Secrets → Actions |
| `VITE_GOOGLE_API_KEY` | Browser API key (Google Picker API enabled) | GitHub → Settings → Secrets → Actions |
| `VITE_FEEDBACK_URL` | Endpoint for feedback form POST | GitHub → Settings → Secrets → Actions |

`VITE_GOOGLE_API_KEY` and `VITE_FEEDBACK_URL` are optional — the app works without them, but spreadsheet picking and the feedback form are unavailable.

The TMDB API key is stored in user's `localStorage`, not in environment variables.

### 11.4 App Icon

`public/icons/icon.svg` — orange background (`#E07E38`, rounded square `rx=22` on a 100×100 viewBox), white Material Design `VideoLibraryOutlined` icon path (scaled 3.33×, translated to centre). The icon is a stylised film-monitor with a play arrow, chosen for legibility at small sizes.

### 11.5 PWA Manifest

- `name: 'Films'` / `short_name: 'Films'`
- `start_url: '/Films_PWA/'`, `scope: '/Films_PWA/'`
- Three icons: 192 PNG (any), 512 PNG (maskable), SVG (any)
- `display: standalone`, `theme_color: '#E07E38'`, `background_color: '#E07E38'` (orange splash screen, matches icon)

### 11.6 Asset Paths in JSX

All `public/` folder asset paths in JSX use `import.meta.env.BASE_URL` to remain correct across both development (base `/`) and production (base `/Films_PWA/`):

```tsx
<img src={`${import.meta.env.BASE_URL}icons/icon.svg`} />
```

---

## 12. Key Algorithms

### 12.1 Virtual Scroll with Header Offset

```typescript
// ResizeObserver tracks header height including collapsible FilterPanel
const ro = new ResizeObserver(entries => {
  setScrollMargin(entries[0].contentRect.height)
})
ro.observe(headerEl)

useWindowVirtualizer({ scrollMargin, ... })
// Each item: transform: translateY(item.start - scrollMargin)
```

### 12.2 Alphabetical Grouping

```typescript
const CYRILLIC = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'

function firstLetter(m: Movie): string {
  const ch = (m.title_ru || m.title_orig || '')[0]?.toUpperCase() ?? ''
  if (/[А-ЯЁ]/.test(ch)) return ch
  if (/[A-Z]/.test(ch))   return ch
  return '#'
}
// Letter order: Cyrillic index → 100 + char code for A-Z → 999 for #
```

### 12.3 SVG Donut Sector Path

```typescript
function sectorPath(cx, cy, R, r, a1, a2): string {
  const large = a2 - a1 > Math.PI ? 1 : 0
  return [
    `M ${cx + R*cos(a1)} ${cy + R*sin(a1)}`,
    `A ${R} ${R} 0 ${large} 1 ${cx + R*cos(a2)} ${cy + R*sin(a2)}`,
    `L ${cx + r*cos(a2)} ${cy + r*sin(a2)}`,
    `A ${r} ${r} 0 ${large} 0 ${cx + r*cos(a1)} ${cy + r*sin(a1)}`,
    'Z',
  ].join(' ')
}
// Outer arc clockwise (sweep=1), inner arc counter-clockwise (sweep=0)
```

### 12.4 Stats: uniqueCount vs. Slice Sum

```typescript
// For each movie, count how many valid keys it contributes:
const validKeys = keys.filter(k => !!k)
if (validKeys.length > 0) uniqueCount++   // count the film once
for (const k of validKeys) counts[k]++   // count each key separately

// DonutChart shows uniqueCount in centre (= films with data),
// not the sum of all slice.count values (which exceeds film count
// for multi-value dimensions like genre and country).
```

### 12.5 Token Refresh Guard

```typescript
async function refreshTokenIfNeeded(): Promise<void> {
  if (Date.now() < tokenExpiresAt - 30_000) return
  await trySilentSignIn()
  // 30s buffer prevents mid-request expiry
}
```

### 12.6 TMDB Duplicate Detection

```typescript
const tmdbIndex = useMemo(() => {
  const map: Record<string, Movie> = {}
  movies.forEach(m => { if (m.tmdb_id) map[m.tmdb_id] = m })
  return map
}, [movies])
// O(1) lookup on every search result render
```

---

*End of Technical Specification — v1.3*
