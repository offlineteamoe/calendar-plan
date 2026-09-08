// Login en un solo paso: signInWithGoogle() abre el popup de Firebase Auth
// (Google), y onAuthStateChanged nos entera del resultado — incluida la
// restauración automática de sesión en visitas siguientes, sin lógica propia.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { isConfigured } from '../config'
import { getAllowedDomain, isAllowedDomainEmail, onAuthStateChanged, signInWithGoogle, signOutFirebase } from '../lib/firebaseClient'

export interface CurrentUser {
  uid: string
  name: string
  email: string
  initials: string
}

type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'error'

interface AuthContextValue {
  status: AuthStatus
  user: CurrentUser | null
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function toCurrentUser(firebaseUser: User): CurrentUser | null {
  const email = firebaseUser.email ?? ''
  if (!isAllowedDomainEmail(email)) return null
  const name = firebaseUser.displayName || email
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return { uid: firebaseUser.uid, name, email, initials: initials || email.slice(0, 2).toUpperCase() }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Sin config de Firebase, ni siquiera intentamos inicializar el SDK:
    // getAuth con una API key vacía/inválida lanza de forma síncrona y
    // tumbaría toda la app antes de poder mostrar el aviso de "falta
    // configuración" de LoginPage.
    if (!isConfigured()) {
      setStatus('signed-out')
      return
    }

    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        setStatus('signed-out')
        return
      }
      const current = toCurrentUser(firebaseUser)
      if (!current) {
        setError(`Esta cuenta no pertenece a ${getAllowedDomain()}.`)
        setStatus('error')
        return
      }
      setUser(current)
      setStatus('signed-in')
    })

    return unsubscribe
  }, [])

  const signIn = useCallback(async () => {
    if (!isConfigured()) {
      setError('Falta configuración (ver .env.example).')
      return
    }
    setError(null)
    setStatus('loading')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.')
      setStatus('error')
    }
  }, [])

  const signOut = useCallback(async () => {
    await signOutFirebase()
    setUser(null)
    setStatus('signed-out')
  }, [])

  const value = useMemo<AuthContextValue>(() => ({ status, user, error, signIn, signOut }), [status, user, error, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
