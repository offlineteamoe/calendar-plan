// Une los dos pasos de login (ver plan, sección 2: "Autenticación — un solo
// clic") detrás de una sola función signIn(): primero el token de Google
// para Drive/Sheets, después la sesión de Firebase para Firestore. Expone un
// único estado de auth al resto de la app.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { isConfigured } from '../config'
import { getAllowedDomain, signInInteractive, signOutGoogle, tryResumeSession } from '../lib/googleAuth'
import { isAllowedDomainEmail, onAuthStateChanged, signInWithGoogleFirebase, signOutFirebase } from '../lib/firebaseClient'

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
    // Sin config de Firebase/Google, ni siquiera intentamos inicializar el
    // SDK: initializeApp/getAuth con una API key vacía o inválida lanza de
    // forma síncrona y tumbaría toda la app antes de poder mostrar el aviso
    // de "falta configuración" de LoginPage.
    if (!isConfigured()) {
      setStatus('signed-out')
      return
    }

    // Al cargar la app, intentamos recuperar sesión sin mostrar UI. Si el
    // usuario ya tenía sesión de Firebase, onAuthStateChanged nos lo dice
    // directamente sin necesidad de otro popup.
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        setStatus((prev) => (prev === 'loading' ? 'signed-out' : prev))
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

    void tryResumeSession()

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
      await signInInteractive() // 1) token de Drive/Sheets
      await signInWithGoogleFirebase() // 2) sesión de Firestore (dispara onAuthStateChanged)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.')
      setStatus('error')
    }
  }, [])

  const signOut = useCallback(async () => {
    signOutGoogle()
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
