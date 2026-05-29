import { useState } from 'react'
import { signIn } from '../services/auth'
import styles from './LoginPage.module.css'

interface Props { error?: string }

export default function LoginPage({ error: externalError }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(externalError ?? null)

  async function handleSignIn() {
    setLoading(true)
    setError(null)
    try {
      await signIn()
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.content}>

        {/* Horizontal logo row: icon left, name + tagline right */}
        <div className={styles.logoRow}>
          <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="Films" className={styles.logoIcon} />
          <div className={styles.logoTexts}>
            <h1 className={styles.logoText}>Films</h1>
            <p className={styles.tagline}>Your personal movie library</p>
          </div>
        </div>

        {/* Description */}
        <div className={styles.description}>
          <p>Data stored in your Google Sheets.</p>
          <p>Access from any device, works offline.</p>
        </div>

        {/* Sign-in */}
        <div className={styles.actions}>
          {error && <p className={styles.error}>{error}</p>}
          <button
            className={styles.googleBtn}
            onClick={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <span className={styles.spinner} />
              : <GoogleIcon />
            }
            {loading ? 'Signing in…' : 'Sign in with Google'}
          </button>
        </div>

      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#fff"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/>
    </svg>
  )
}
