/**
 * Valores que dependen del proyecto de Firebase/Google Cloud (ver README,
 * "Configuración inicial"). Nada de esto es secreto en el sentido de tener
 * que esconderlo: la config web de Firebase está hecha para vivir en el
 * bundle del cliente. La seguridad real la dan el consent screen "Internal"
 * del proyecto de Google Cloud y las reglas de Firestore.
 */

function readEnv(name: keyof ImportMetaEnv): string {
  return (import.meta.env[name] as string | undefined) ?? ''
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

  /**
   * API key de Cloud Translation, restringida por dominio en Google Cloud.
   * Si falta, las notas simplemente no se traducen (ver lib/translate.ts).
   */
  translateApiKey: readEnv('VITE_GOOGLE_TRANSLATE_KEY'),
} as const

export function isConfigured(): boolean {
  const f = config.firebase
  return Boolean(f.apiKey && f.projectId && f.authDomain && f.appId)
}

export function missingConfigKeys(): string[] {
  const missing: string[] = []
  if (!config.firebase.apiKey) missing.push('VITE_FIREBASE_API_KEY')
  if (!config.firebase.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN')
  if (!config.firebase.projectId) missing.push('VITE_FIREBASE_PROJECT_ID')
  if (!config.firebase.appId) missing.push('VITE_FIREBASE_APP_ID')
  return missing
}
