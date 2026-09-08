/**
 * Todo lo que depende del proyecto de Firebase (ver README "Configuración
 * inicial"). Nada de esto es secreto — la config web de Firebase está hecha
 * para vivir en el bundle del cliente; la seguridad real la dan el OAuth
 * consent screen "Internal" del proyecto de Google Cloud detrás de Firebase
 * y las reglas de seguridad de Firestore (firestore.rules), no ocultar
 * estos valores.
 */

function readEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv] as string | undefined
  return value ?? ''
}

export const config = {
  allowedDomain: readEnv('VITE_ALLOWED_DOMAIN') || 'openenglish.com',

  firebase: {
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
  },
} as const

/** true una vez que hay suficiente config de Firebase para operar. */
export function isConfigured(): boolean {
  return Boolean(config.firebase.apiKey && config.firebase.projectId && config.firebase.authDomain && config.firebase.appId)
}

export function missingConfigKeys(): string[] {
  const missing: string[] = []
  if (!config.firebase.apiKey) missing.push('VITE_FIREBASE_API_KEY')
  if (!config.firebase.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN')
  if (!config.firebase.projectId) missing.push('VITE_FIREBASE_PROJECT_ID')
  if (!config.firebase.appId) missing.push('VITE_FIREBASE_APP_ID')
  return missing
}
