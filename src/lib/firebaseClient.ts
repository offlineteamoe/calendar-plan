// Firebase se usa ÚNICAMENTE para la capa de tiempo real (presencia + feed de
// actividad, ver src/hooks/usePresence.ts y useActivityFeed.ts). Los datos del
// plan (Plan/Escenario/Nota/etc.) viven en Google Sheets, no acá — ver
// src/lib/sheetsApi.ts.
//
// Importante: el control de dominio real para esta capa vive en las reglas de
// seguridad de Firestore (firestore.rules), no en este archivo. El parámetro
// `hd` de abajo solo preselecciona el dominio en el selector de cuentas de
// Google — es una comodidad de UX, no una barrera de seguridad.

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
 * Segundo paso del login (después de googleAuth.signInInteractive()). Es un
 * popup aparte y deliberadamente simple: como el usuario ya eligió/confirmó
 * su cuenta de Google en el primer paso, este suele resolverse muy rápido.
 * Mantenemos los dos flujos separados porque cada uno tiene su propia forma
 * de renovarse sola (Firebase renueva su sesión internamente; el token de
 * Drive/Sheets se renueva en silencio vía googleAuth.ts) — mezclarlos en un
 * solo mecanismo perdería la renovación silenciosa ya probada en producción.
 */
export async function signInWithGoogleFirebase(): Promise<User> {
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

export function isAllowedDomainEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith('@' + config.allowedDomain.toLowerCase())
}
