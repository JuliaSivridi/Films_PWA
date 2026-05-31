# Films

[![Live PWA](https://img.shields.io/badge/Films_PWA-Live_PWA-E07E38?style=for-the-badge)](https://juliasivridi.github.io/Films_PWA/)

![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets_API-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)
![Google OAuth](https://img.shields.io/badge/Google_OAuth_2.0-4285F4?style=for-the-badge&logo=google&logoColor=white)
![TMDB](https://img.shields.io/badge/TMDB_API-01B4E4?style=for-the-badge&logo=themoviedatabase&logoColor=white)
![Wikidata](https://img.shields.io/badge/Wikidata_SPARQL-990000?style=for-the-badge&logo=wikidata&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=for-the-badge&logo=githubpages&logoColor=white)](https://juliasivridi.github.io/Films_PWA/)

A personal film library tracker built as a **Progressive Web App**. Runs in any browser and installs on Android/iOS/desktop as a standalone app. No backend — Google Sheets is the database.

**Live:** [juliasivridi.github.io/Films_PWA](https://juliasivridi.github.io/Films_PWA/)

---

## Features

- 🔍 **Smart Add** — type a title, pick from TMDB search results, and all fields auto-fill: Russian and original title, poster, genres, rating, runtime, countries, keywords, and four external links
- 🔗 **Auto-enriched links** — Kinopoisk URL and Wikipedia article fetched automatically via Wikidata SPARQL (property P2603); no scraping, no manual copy-paste
- ✅ **Duplicate detection** — films already in your library show a ✓ Watched / ✓ Want badge directly in the TMDB search results; tapping one opens the edit form instead of adding a duplicate
- 🔤 **Alphabetical list view** — compact rows with window-level virtual scrolling; only visible rows are rendered so 3000+ films scroll smoothly; tap the logo to open an alphabet popup and jump to any letter instantly
- 🟢 **Status dot** — a 16×16 colour-coded circle (green = Watched, amber = Want) overlaid on each poster
- 🔎 **Unified search** — the top search bar searches title, genres, and keywords simultaneously
- 🎛️ **Filter panel** — filter by status (Want / Watched), year range, rating range, and country; all filters stack
- 📊 **Statistics page** — SVG donut chart showing collection breakdown by decade, rating bucket, country, or genre; accessible from the avatar menu
- 🌙 **Light / dark theme** — follows OS preference automatically
- 📱 **PWA** — installable on Android, iOS, and desktop; PNG icons generated automatically in CI

---

## Tech Stack

| Layer | Technology |
|---|---|
| ⚛️ Framework | React 18 + TypeScript 5 |
| ⚡ Build | Vite 5 |
| 🎨 Styling | CSS Modules + CSS custom properties (light / dark theme) |
| 🗄️ Database | Google Sheets API v4 |
| 🔐 Auth | Google Identity Services (OAuth 2.0) |
| 🎬 Movie data | TMDB API v3 |
| 🔗 External links | Wikidata SPARQL — Kinopoisk IDs (P2603) + Wikipedia sitelinks |
| 📜 Virtual scrolling | @tanstack/react-virtual v3 (useWindowVirtualizer) |
| 📱 PWA | vite-plugin-pwa (Workbox) + PNG icons generated in CI via rsvg-convert |
| 🚀 Hosting | GitHub Pages (auto-deploy via GitHub Actions on push to `main`) |

---

## Setup

### Prerequisites

- Google account
- Google Cloud project with **Google Sheets API v4** and **Google Drive API** enabled
- OAuth 2.0 Client ID (type: Web application)
- [TMDB API key](https://www.themoviedb.org/settings/api) (free, v3 key)
- Node.js ≥ 18 (for local development only)

### Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable **Google Sheets API v4** and **Google Drive API**
3. Create an **OAuth 2.0 Client ID** → type: Web application
4. Add to **Authorized JavaScript origins** (not Redirect URIs):
   ```
   http://localhost:5173
   https://juliasivridi.github.io
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

### Deploy to GitHub Pages

1. Fork or push the repository to GitHub
2. Go to **Settings → Pages → Source** and select **GitHub Actions**
3. Add a repository secret under **Settings → Secrets and variables → Actions**:
   - `VITE_GOOGLE_CLIENT_ID` — your Google OAuth2 client ID
4. Every push to `main` triggers automatic build and deployment via `.github/workflows/deploy.yml`

The workflow installs dependencies, generates `icon-192.png` and `icon-512.png` from the SVG source using `rsvg-convert`, then builds and deploys to GitHub Pages.

---

## Data Model

All data lives in the user's **db_films** Google Spreadsheet, found or created automatically on first login. A single sheet (default name: Movies) stores one film per row.

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

Array fields are stored as JSON strings. Malformed cells are silently ignored via a `parseArr()` try/catch wrapper rather than crashing the list.

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

## Install as App

**Android / Chrome:** the address bar shows an install icon, or use the browser menu → *Install app*

**iOS / Safari:** Share button → *Add to Home Screen*

**Desktop / Chrome:** install icon in the address bar
