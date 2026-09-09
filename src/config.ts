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

/**
 * Proyecto `offline-planning`, creado para esta herramienta y solo para ella.
 * Está aquí, en el código, a propósito: son los valores por defecto para que
 * el proyecto se pueda clonar y compilar sin tener que ir a buscar nada, y
 * porque de todas formas viajan dentro del bundle que descarga el navegador.
 * Una variable de entorno los sobreescribe si algún día hay que reapuntar la
 * app a otro proyecto.
 */
const FIREBASE_DEFAULTS = {
  apiKey: 'AIzaSyBpMlbfENSFGZZW-VrBXDX5V_vPeztcHMA',
  authDomain: 'offline-planning.firebaseapp.com',
  projectId: 'offline-planning',
  storageBucket: 'offline-planning.firebasestorage.app',
  messagingSenderId: '655635528612',
  appId: '1:655635528612:web:7240675c4826da2ae59f31',
} as const

export const config = {
  allowedDomain: readEnv('VITE_ALLOWED_DOMAIN') || 'openenglish.com',

  firebase: {
    apiKey: readEnv('VITE_FIREBASE_API_KEY') || FIREBASE_DEFAULTS.apiKey,
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN') || FIREBASE_DEFAULTS.authDomain,
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID') || FIREBASE_DEFAULTS.projectId,
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET') || FIREBASE_DEFAULTS.storageBucket,
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || FIREBASE_DEFAULTS.messagingSenderId,
    appId: readEnv('VITE_FIREBASE_APP_ID') || FIREBASE_DEFAULTS.appId,
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
