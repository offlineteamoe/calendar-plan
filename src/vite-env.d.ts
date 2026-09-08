/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALLOWED_DOMAIN: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_INDEX_SPREADSHEET_ID: string
  readonly VITE_TEMPLATE_SPREADSHEET_ID: string
  readonly VITE_MEDIA_PLANS_FOLDER_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
