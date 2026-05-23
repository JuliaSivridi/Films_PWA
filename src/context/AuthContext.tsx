import React, { createContext, useCallback, useContext, useState } from 'react'
import { useGoogleLogin, googleLogout } from '@react-oauth/google'

interface AuthCtx {
  token: string | null
  login: () => void
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    sessionStorage.getItem('gtoken'),
  )

  const handleLogin = useGoogleLogin({
    onSuccess: r => {
      setToken(r.access_token)
      sessionStorage.setItem('gtoken', r.access_token)
    },
    onError: e => console.error('OAuth error', e),
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  })

  const logout = useCallback(() => {
    googleLogout()
    setToken(null)
    sessionStorage.removeItem('gtoken')
  }, [])

  return (
    <Ctx.Provider value={{ token, login: handleLogin, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
