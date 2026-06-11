import { useEffect, useState } from 'react'
import { initAuth, onAuthChange } from './services/auth'
import { checkFilmsFile, createFilmsFile, setSheetFile } from './services/drive'
import { openSpreadsheetPicker } from './services/picker'
import { AuthProvider } from './context/AuthContext'
import { MoviesProvider, useMovies } from './context/MoviesContext'
import LoginPage from './components/LoginPage'
import Header from './components/Header'
import MovieGrid from './components/MovieGrid'
import StatsPage from './components/StatsPage'
import HelpPage from './components/HelpPage'
import FeedbackPage from './components/FeedbackPage'
import styles from './App.module.css'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  localStorage.getItem('films_google_client_id') || ''
export const PICKER_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''
// Cloud project number — the numeric prefix of the OAuth client id
export const PICKER_APP_ID = CLIENT_ID.split('-')[0] || ''

type Phase = 'loading' | 'login' | 'setup' | 'ready'

type View = 'list' | 'stats' | 'help' | 'feedback'

function MainContent() {
  const { load } = useMovies()
  const [alphaOpen, setAlphaOpen] = useState(false)
  const [view, setView] = useState<View>('list')

  useEffect(() => { load() }, [load])

  function handleLogoClick() {
    if (view !== 'list') setView('list')
    else setAlphaOpen(o => !o)
  }

  return (
    <>
      {/* On Help/Feedback the header switches to "back + title + avatar" mode */}
      <Header
        onLogoClick={handleLogoClick}
        onStatsClick={() => setView('stats')}
        onHelpClick={() => setView('help')}
        onFeedbackClick={() => setView('feedback')}
        overlayTitle={view === 'help' ? 'Short guide' : view === 'feedback' ? 'Feedback' : undefined}
        onOverlayBack={() => setView('list')}
      />
      {view === 'list'     ? <MovieGrid alphaOpen={alphaOpen} onAlphaClose={() => setAlphaOpen(false)} />
        : view === 'stats' ? <StatsPage onBack={() => setView('list')} />
        : view === 'help'  ? <HelpPage />
        : <FeedbackPage />
      }
    </>
  )
}

/** First-run / migration screen: never create a file silently — the user
 *  explicitly creates a new spreadsheet or picks an existing one. */
function SetupScreen({ onDone }: { onDone: () => void }) {
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setBusy(true); setError('')
    try { await createFilmsFile(); onDone() }
    catch (e) { setError(String(e)) }
    finally { setBusy(false) }
  }

  async function handlePick() {
    setError('')
    try {
      const file = await openSpreadsheetPicker(PICKER_API_KEY, PICKER_APP_ID)
      if (file) { setSheetFile(file.id, file.name); onDone() }
    } catch (e) { setError(String(e)) }
  }

  return (
    <div className={styles.splash}>
      <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} width={64} height={64} alt="" />
      <h2 style={{ margin: '18px 0 4px' }}>Choose your data file</h2>
      <p style={{ opacity: .7, maxWidth: 320, textAlign: 'center', lineHeight: 1.45, fontSize: '.95rem' }}>
        Films stores your collection in a Google Sheets file in your Drive.
        Create a new one, or pick an existing spreadsheet (e.g. your db_films).
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className={styles.setupPrimary} onClick={handlePick} disabled={busy}>
          Choose from Google Drive
        </button>
        <button className={styles.setupSecondary} onClick={handleCreate} disabled={busy}>
          {busy ? 'Creating…' : 'Create new spreadsheet'}
        </button>
      </div>
      {error && <p style={{ color: '#e05555', marginTop: 14, maxWidth: 340, textAlign: 'center' }}>{error}</p>}
    </div>
  )
}

function AppInner() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [driveError, setDriveError] = useState('')

  useEffect(() => {
    const unsub = onAuthChange(async isAuth => {
      if (!isAuth) { setPhase('login'); return }
      try {
        setPhase(await checkFilmsFile() === 'ready' ? 'ready' : 'setup')
      } catch (e) {
        setDriveError(String(e))
        setPhase('login')
      }
    })

    if (!CLIENT_ID) {
      setDriveError('Не задан VITE_GOOGLE_CLIENT_ID')
      setPhase('login')
    } else {
      initAuth(CLIENT_ID)
    }

    return unsub
  }, [])

  if (phase === 'loading') {
    return (
      <div className={styles.splash}>
        <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} width={64} height={64} alt="" />
        <div className={styles.splashSpinner} />
      </div>
    )
  }

  if (phase === 'login') return <LoginPage error={driveError} />

  if (phase === 'setup') return <SetupScreen onDone={() => setPhase('ready')} />

  return <MainContent />
}

export default function App() {
  return (
    <AuthProvider>
      <MoviesProvider>
        <AppInner />
      </MoviesProvider>
    </AuthProvider>
  )
}
