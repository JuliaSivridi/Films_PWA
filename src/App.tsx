import { useEffect, useState } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MoviesProvider, useMovies } from './context/MoviesContext'
import LoginPage from './components/LoginPage'
import SetupPage from './components/SetupPage'
import Header from './components/Header'
import MovieGrid from './components/MovieGrid'
import SettingsModal from './components/SettingsModal'
import styles from './App.module.css'

function AppContent() {
  const { token } = useAuth()
  const { load } = useMovies()
  const [needSheets, setNeedSheets] = useState(false)

  useEffect(() => {
    if (!token) return
    const hasSheets = !!(localStorage.getItem('sheets_id') || import.meta.env.VITE_SHEETS_ID)
    if (!hasSheets) { setNeedSheets(true); return }
    load()
  }, [token, load])

  if (!token) return <LoginPage />

  return (
    <div className={styles.app}>
      <Header />
      <MovieGrid />
      {needSheets && (
        <SettingsModal onClose={() => { setNeedSheets(false); load() }} />
      )}
    </div>
  )
}

export default function App() {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const [clientId, setClientId] = useState(
    localStorage.getItem('google_client_id') || envId || '',
  )

  if (!clientId) {
    return <SetupPage onDone={setClientId} />
  }

  return (
    <GoogleOAuthProvider key={clientId} clientId={clientId}>
      <AuthProvider>
        <MoviesProvider>
          <AppContent />
        </MoviesProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
