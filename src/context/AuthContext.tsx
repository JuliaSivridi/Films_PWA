import React, { createContext, useContext, useEffect, useState } from 'react'
import { getUser, onAuthChange, signIn, signOut } from '../services/auth'
import type { UserProfile } from '../services/auth'

interface AuthCtx {
  authenticated: boolean
  user: UserProfile | null
  signIn: () => void
  signOut: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState<UserProfile | null>(getUser())

  useEffect(() => {
    return onAuthChange(isAuth => {
      setAuthenticated(isAuth)
      setUser(getUser())
    })
  }, [])

  return (
    <Ctx.Provider value={{ authenticated, user, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
