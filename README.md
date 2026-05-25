# Films

A personal film library tracker built as a **Progressive Web App**. Runs in any browser and installs on Android/iOS home screens as a standalone app. No backend — Google Sheets is the database.

**Live:** [stler-films.netlify.app](https://stler-films.netlify.app)

---

## Features

- **Smart Add** — type a title, pick from TMDB search results, and all fields auto-fill: Russian and original title, poster, genres, rating, runtime, and four external links
- **Auto-enriched links** — Kinopoisk URL and Wikipedia article fetched automatically via Wikidata SPARQL (property P2603); no scraping, no manual copy-paste
- **Duplicate detection** — films already in your library show a ✓ Watched / ✓ Want badge directly in the TMDB search results; tapping one opens the edit form instead of adding a duplicate
- **Alphabetical list view** — compact rows with window-level virtual scrolling; only visible rows are rendered so 3000+ films scroll smoothly; tap the logo to open an alphabet popup and jump to any letter instantly
- **Filter panel** — filter by status (Want / Watched), year range, rating range, and genre multi-select (OR logic); all filters stack
- **Poster + links on one screen** — each row shows poster, titles, year · duration · rating, genres, and KP / IMDb / TMDB / Wiki link buttons
- **Light / dark theme** — follows OS preference automatically
- **PWA** — installable on Android and iOS, works as a standalone app with its own icon

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Styling | CSS Modules + CSS custom properties (light / dark theme) |
| Database | Google Sheets API v4 |
| Auth | Google Identity Services (OAuth 2.0) |
| Movie data | TMDB API v3 |
| External links | Wikidata SPARQL — Kinopoisk IDs (P2603) + Wikipedia sitelinks |
| Virtual scrolling | @tanstack/react-virtual v3 (useWindowVirtualizer) |
| PWA | vite-plugin-pwa (Workbox) |
| Hosting | Netlify |

---

## Setup

### Prerequisites

- Google account
- Google Cloud project with **Google Sheets API v4** and **Google Drive API** enabled
- OAuth 2.0 Client ID (type: Web application)
- [TMDB API key](https://www.themoviedb.org/settings/api) (free, v3 key)
- Node.js ≥ 18

### Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Google Sheets API v4** and **Google Drive API**
3. Create an **OAuth 2.0 Client ID** → type: Web application
4. Add to **Authorized JavaScript origins** (not Redirect URIs):
   ```
   http://localhost:5173
   https://your-app.netlify.app
   ```
5. Add your Google account as a **test user** in the OAuth consent screen

### Local Development

```bash
git clone https://github.com/JuliaSivridi/Films_PWA.git
cd Films_PWA
npm install
```

Create `.env` in the project root:
```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

```bash
npm run dev    # http://localhost:5173
npm run build  # production build → dist/
```

The TMDB API key is entered inside the app on first launch (Settings → TMDB API Key) and stored in `localStorage` — it never leaves the browser.

### Deploy to Netlify

1. Import the repository at [app.netlify.com](https://app.netlify.com)
2. Add environment variable in Site Settings → Environment Variables:
   - `VITE_GOOGLE_CLIENT_ID`
3. Add a `netlify.toml` at the project root for SPA routing:
   ```toml
   [[redirects]]
   from = "/*"
   to = "/index.html"
   status = 200
   ```
4. Every push to `main` triggers automatic deployment

---

## Data Model

All data lives in the user's **db_films** Google Spreadsheet, found or created automatically on first login. A single sheet (default name: Films) stores one film per row.

| Col | Field | Description |
|-----|-------|-------------|
| A | id | UUID |
| B | title_ru | Russian title (or original if no Russian release) |
| C | title_orig | Original language title |
| D | year | Release year |
| E | status | `watched` or `want` |
| F | tmdb_id | TMDB movie ID |
| G | poster_path | TMDB poster path (e.g. `/abc123.jpg`) |
| H | genres | JSON array — e.g. `["Action","Drama"]` |
| I | tmdb_rating | TMDB vote_average snapshot (e.g. `7.9`) |
| J | duration_min | Runtime in minutes |
| K | kinopoisk_url | Kinopoisk film page |
| L | imdb_url | IMDb title page |
| M | tmdb_url | TMDB movie page |
| N | wiki_url | Wikipedia article (Russian preferred, English fallback) |
| O | countries | JSON array of production countries — e.g. `["France","Italy"]` |
| P | keywords | JSON array of TMDB keywords — e.g. `["fairy tale","based on novel"]` |

---

## Bulk Import / Enrichment Script

If you have an existing film collection in a CSV, `enrich_films.py` backfills the missing TMDB columns using the IMDb IDs already present in the file.

```bash
pip install requests
python enrich_films.py --api-key YOUR_TMDB_KEY --input films.csv --output films_enriched.csv
```

The script:
- Extracts the IMDb ID from each `imdb_url` and calls `GET /find/{imdb_id}?external_source=imdb_id`
- Falls back to title search for rows without an IMDb link
- Fills `tmdb_id`, `poster_path`, `tmdb_rating`, `tmdb_url`, `countries`, `keywords`
- Converts genres from `"Action, Drama"` to `["Action","Drama"]`
- Generates a UUID for each `id`
- Saves a checkpoint every 100 rows — rerun against the output file to resume after interruption

After enrichment, import `films_enriched.csv` into Google Sheets (File → Import → Replace current sheet).

---

## Install as Mobile App

**Android:** Chrome prompts automatically, or use the browser menu → *Install app*

**iOS:** Safari → Share button → *Add to Home Screen*
