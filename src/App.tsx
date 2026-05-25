import { useEffect, useState } from 'react'
import { initAuth, onAuthChange } from './services/auth'
import { findOrCreateFilmsFile } from './services/drive'
import { AuthProvider } from './context/AuthContext'
import { MoviesProvider, useMovies } from './context/MoviesContext'
import LoginPage from './components/LoginPage'
import Header from './components/Header'
import MovieGrid from './components/MovieGrid'
import StatsPage from './components/StatsPage'
import styles from './App.module.css'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  localStorage.getItem('google_client_id') || ''

type Phase = 'loading' | 'login' | 'ready'

type View = 'list' | 'stats'

function MainContent() {
  const { load } = useMovies()
  const [alphaOpen, setAlphaOpen] = useState(false)
  const [view, setView] = useState<View>('list')

  useEffect(() => { load() }, [load])

  function handleLogoClick() {
    if (view === 'stats') setView('list')
    else setAlphaOpen(o => !o)
  }

  return (
    <>
      <Header
        onLogoClick={handleLogoClick}
        onStatsClick={() => setView('stats')}
      />
      {view === 'list'
        ? <MovieGrid alphaOpen={alphaOpen} onAlphaClose={() => setAlphaOpen(false)} />
        : <StatsPage onBack={() => setView('list')} />
      }
    </>
  )
}

function AppInner() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [driveError, setDriveError] = useState('')

  useEffect(() => {
    const unsub = onAuthChange(async isAuth => {
      if (!isAuth) { setPhase('login'); return }
      try {
        await findOrCreateFilmsFile()
        setPhase('ready')
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
        <img src="/icons/icon.svg" width={64} height={64} alt="" />
        <div className={styles.splashSpinner} />
      </div>
    )
  }

  if (phase === 'login') return <LoginPage error={driveError} />

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
