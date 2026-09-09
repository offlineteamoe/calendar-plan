// Firebase es la única infraestructura de esta app: Authentication (login con
// Google, restringido a Workspace) y Firestore (todos los datos del plan +
// presencia/actividad en tiempo real). Sin Google Sheets, sin Drive API, sin
// backend propio.
//
// El control de dominio real vive en dos lugares que este archivo no
// controla: el OAuth consent screen "Internal" del proyecto de Google Cloud
// detrás de este proyecto de Firebase (una cuenta fuera del Workspace no
// puede ni completar el login), y las reglas de seguridad de Firestore
// (firestore.rules). El parámetro `hd` de abajo es solo una comodidad de UX
// (preselecciona el dominio en el selector de cuentas de Google).

import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { config } from '../config'

let app: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null

function ensureApp(): FirebaseApp {
  if (!app) {
    app = initializeApp({
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain,
      projectId: config.firebase.projectId,
      storageBucket: config.firebase.storageBucket,
      messagingSenderId: config.firebase.messagingSenderId,
      appId: config.firebase.appId,
    })
  }
  return app
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(ensureApp())
  return authInstance
}

export function getDb(): Firestore {
  if (!dbInstance) dbInstance = getFirestore(ensureApp())
  return dbInstance
}

/**
 * Único paso de login. Firebase persiste la sesión solo (IndexedDB) y la
 * restaura sola en la próxima visita — no hace falta lógica de renovación
 * como con un token OAuth de vida corta.
 */
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ hd: config.allowedDomain })
  const result = await signInWithPopup(getFirebaseAuth(), provider)
  return result.user
}

export function signOutFirebase() {
  return firebaseSignOut(getFirebaseAuth())
}

export function onAuthStateChanged(cb: (user: User | null) => void) {
  return onFirebaseAuthStateChanged(getFirebaseAuth(), cb)
}

/**
 * Acepta el dominio corporativo y sus subdominios: hay cuentas del equipo en
 * `@openenglish.com` y otras en `@business.openenglish.com`. La comprobación
 * exige el punto separador para que `notopenenglish.com` no cuele.
 */
export function isAllowedDomainEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const domain = email.toLowerCase().split('@')[1] ?? ''
  const allowed = config.allowedDomain.toLowerCase()
  return domain === allowed || domain.endsWith('.' + allowed)
}

export function getAllowedDomain(): string {
  return config.allowedDomain
}
