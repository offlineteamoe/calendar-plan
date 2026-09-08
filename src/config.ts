/**
 * Central place for every value that depends on the manual Google/Firebase/GitHub
 * setup steps (see README.md "Configuración inicial"). Nothing here is a secret —
 * OAuth Client IDs and Firebase web config are meant to live in the client bundle;
 * the real access control happens server-side (Google's OAuth consent screen +
 * Drive ACLs, and Firestore security rules), not by hiding these values.
 *
 * All values come from Vite env vars so the project can be reconfigured (or moved
 * to a different Google Cloud / Firebase project) without touching code — copy
 * .env.example to .env.local and fill it in.
 */

function readEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv] as string | undefined
  return value ?? ''
}

export const config = {
  allowedDomain: readEnv('VITE_ALLOWED_DOMAIN') || 'openenglish.com',

  google: {
    clientId: readEnv('VITE_GOOGLE_CLIENT_ID'),
    // Escritura, no solo lectura: esta app crea/copia Sheets y edita celdas.
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
      'email',
      'openid',
    ].join(' '),
  },

  firebase: {
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
  },

  sheets: {
    // El Sheet raíz que mapea mes -> spreadsheetId (ver README, paso "Sheet Index").
    indexSpreadsheetId: readEnv('VITE_INDEX_SPREADSHEET_ID'),
    // El Sheet en blanco (solo encabezados) usado cuando no existe un mes anterior.
    templateSpreadsheetId: readEnv('VITE_TEMPLATE_SPREADSHEET_ID'),
    // Carpeta compartida donde se crean los Sheets mensuales nuevos.
    mediaPlansFolderId: readEnv('VITE_MEDIA_PLANS_FOLDER_ID'),
  },
} as const

/** true una vez que los valores mínimos para operar están presentes. */
export function isConfigured(): boolean {
  return Boolean(
    config.google.clientId &&
      config.firebase.apiKey &&
      config.firebase.projectId &&
      config.sheets.indexSpreadsheetId &&
      config.sheets.templateSpreadsheetId,
  )
}

export function missingConfigKeys(): string[] {
  const missing: string[] = []
  if (!config.google.clientId) missing.push('VITE_GOOGLE_CLIENT_ID')
  if (!config.firebase.apiKey) missing.push('VITE_FIREBASE_API_KEY')
  if (!config.firebase.projectId) missing.push('VITE_FIREBASE_PROJECT_ID')
  if (!config.firebase.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN')
  if (!config.firebase.appId) missing.push('VITE_FIREBASE_APP_ID')
  if (!config.sheets.indexSpreadsheetId) missing.push('VITE_INDEX_SPREADSHEET_ID')
  if (!config.sheets.templateSpreadsheetId) missing.push('VITE_TEMPLATE_SPREADSHEET_ID')
  return missing
}
