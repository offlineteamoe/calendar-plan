// Lectura de los datos pesados desde Google Drive, con la sesión de Google de
// quien entra.
//
// POR QUÉ DRIVE Y NO FIRESTORE
// Los resultados de Spotfire son cientos de miles de filas que se regeneran
// cada día. Copiarlas a Firestore costaría el cupo diario entero y no aportaría
// nada: no se editan desde la app, solo se leen. Viven como un JSON en la misma
// carpeta compartida de Drive donde el equipo ya deja sus datos procesados.
//
// QUIÉN PUEDE LEERLAS
// El control real es el permiso de la carpeta en Drive: está compartida al
// dominio, así que quien no tenga acceso recibe un 403 del propio Drive. La app
// no guarda ninguna credencial — solo pide un token al navegador en nombre de
// la persona que ya inició sesión.
//
// EL TOKEN
// Google Identity Services entrega tokens de ~1 hora y sin refresh_token (no
// hay servidor que pueda custodiarlo). Para que eso no se traduzca en un botón
// de "conectar" cada hora: el token se guarda con su vencimiento, al arrancar
// se intenta renovarlo en silencio (`prompt: ''`, sin ventana emergente) y
// cualquier 401/403 reintenta una vez por esa misma vía.

import { config } from '../config'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const STORAGE_KEY = 'offline-planning-drive-token'
/** Margen antes del vencimiento real: un token a punto de caducar no sirve. */
const EXPIRY_MARGIN_MS = 60_000
/** GIS puede no llamar nunca a su callback si no hay sesión de Google viva. */
const SILENT_TIMEOUT_MS = 8_000

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: unknown) => void
            hint?: string
          }) => TokenClient
        }
      }
    }
  }
}

interface StoredToken {
  token: string
  expiresAt: number
}

let client: TokenClient | null = null
let current: StoredToken | null = null
let pending: ((response: TokenResponse) => void) | null = null
let scriptPromise: Promise<void> | null = null

function readStored(): StoredToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredToken
    return typeof parsed?.token === 'string' ? parsed : null
  } catch {
    return null
  }
}

function writeStored(value: StoredToken | null) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Navegador sin almacenamiento (ventana privada): se pierde la comodidad
    // de no volver a pedir el token, nada más.
  }
}

function isUsable(value: StoredToken | null): value is StoredToken {
  return !!value && value.expiresAt - EXPIRY_MARGIN_MS > Date.now()
}

/** Carga el script de Google Identity Services una sola vez. */
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gis]')
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services.')))
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.dataset.gis = 'true'
      document.head.appendChild(script)
    }
  })
  return scriptPromise
}

async function ensureClient(hint?: string): Promise<TokenClient> {
  if (client) return client
  await loadGis()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new Error('Google Identity Services no está disponible.')
  client = oauth2.initTokenClient({
    client_id: config.google.clientId,
    scope: DRIVE_SCOPE,
    hint,
    callback: (response) => {
      const resolve = pending
      pending = null
      resolve?.(response)
    },
    error_callback: (error) => {
      const resolve = pending
      pending = null
      resolve?.({ error: String((error as { type?: string })?.type ?? 'popup_error') })
    },
  })
  return client
}

/**
 * Pide un token. `prompt` vacío es la vía silenciosa; 'consent' abre la ventana
 * de Google y por eso solo puede nacer de un clic de la persona.
 *
 * Nunca rechaza: quien llama mira `.error`, igual que hace GIS con su callback.
 */
async function requestToken(prompt: '' | 'consent', hint?: string): Promise<TokenResponse> {
  const tokenClient = await ensureClient(hint)
  return new Promise<TokenResponse>((resolve) => {
    let settled = false
    const finish = (response: TokenResponse) => {
      if (settled) return
      settled = true
      resolve(response)
    }
    // Sin sesión de Google viva, GIS puede no llamar nunca al callback de una
    // petición silenciosa: sin este plazo, la pantalla se quedaría cargando
    // para siempre en vez de ofrecer el botón de conectar.
    if (prompt === '') setTimeout(() => finish({ error: 'silent_timeout' }), SILENT_TIMEOUT_MS)
    pending = finish
    tokenClient.requestAccessToken({ prompt })
  })
}

async function acquire(prompt: '' | 'consent', hint?: string): Promise<string | null> {
  const response = await requestToken(prompt, hint)
  if (response.error || !response.access_token) return null
  current = {
    token: response.access_token,
    expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
  }
  writeStored(current)
  return current.token
}

/**
 * Token válido sin molestar a nadie: el guardado si sigue vivo, si no una
 * renovación silenciosa. `null` significa que hace falta un clic.
 */
export async function getDriveTokenSilently(hint?: string): Promise<string | null> {
  if (isUsable(current)) return current.token
  const stored = readStored()
  if (isUsable(stored)) {
    current = stored
    return stored.token
  }
  return acquire('', hint)
}

/** Vía visible, con ventana de Google. Solo desde un clic. */
export async function connectDrive(hint?: string): Promise<boolean> {
  const token = await acquire('consent', hint)
  return token !== null
}

export function forgetDriveToken() {
  current = null
  writeStored(null)
}

async function driveFetch(url: string, token: string, retried = false): Promise<Response> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if ((response.status === 401 || response.status === 403) && !retried) {
    forgetDriveToken()
    const fresh = await getDriveTokenSilently()
    if (fresh) return driveFetch(url, fresh, true)
  }
  return response
}

export class DriveAuthError extends Error {}

export interface DriveFileMeta {
  id: string
  modifiedTime: string
}

/**
 * Busca un archivo por nombre exacto dentro de la carpeta compartida y devuelve
 * solo su ficha: id y cuándo cambió por última vez.
 *
 * Es una llamada de unos pocos cientos de bytes, y es lo que permite saber si
 * hay algo nuevo sin descargar el archivo entero.
 *
 * Los tres parámetros de unidades compartidas son obligatorios: la carpeta vive
 * en una Unidad compartida y la API de Drive excluye ese contenido por defecto
 * —devolviendo una lista vacía, no un error— lo que se ve exactamente igual que
 * "el archivo no existe".
 */
export async function findDriveFile(fileName: string, hint?: string): Promise<DriveFileMeta> {
  const token = await getDriveTokenSilently(hint)
  if (!token) throw new DriveAuthError('Hace falta conectar con Google Drive.')

  const folder = config.google.driveFolderId
  const query = encodeURIComponent(`'${folder}' in parents and name='${fileName}' and trashed=false`)
  const url =
    `https://www.googleapis.com/drive/v3/files?q=${query}` +
    '&fields=files(id,name,modifiedTime)&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives'

  const response = await driveFetch(url, token)
  if (response.status === 401 || response.status === 403) {
    throw new DriveAuthError('Tu cuenta no tiene acceso a la carpeta compartida de Drive.')
  }
  if (!response.ok) throw new Error(`Drive respondió ${response.status} al buscar ${fileName}.`)

  const json = (await response.json()) as { files?: DriveFileMeta[] }
  const file = json.files?.[0]
  if (!file) throw new Error(`No se encontró ${fileName} en la carpeta compartida de Drive.`)
  return file
}

/** Descarga y interpreta el contenido de un archivo ya localizado. */
export async function downloadDriveJson<T>(file: DriveFileMeta, hint?: string): Promise<T> {
  const token = await getDriveTokenSilently(hint)
  if (!token) throw new DriveAuthError('Hace falta conectar con Google Drive.')

  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`,
    token,
  )
  if (response.status === 401 || response.status === 403) {
    throw new DriveAuthError('Tu cuenta no tiene acceso a la carpeta compartida de Drive.')
  }
  if (!response.ok) throw new Error(`Drive respondió ${response.status} al descargar el archivo.`)
  return (await response.json()) as T
}
