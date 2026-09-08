// Wrapper de Google Identity Services (google.accounts.oauth2.initTokenClient),
// adaptado del patrón ya probado en producción en el proyecto "PPT HTML"
// (Docs/Documentación Branded KPIs/01_ARQUITECTURA_Y_DECISIONES.md):
//
//  - Sin backend: el token vive solo en el navegador del usuario.
//  - La seguridad real no la da esta capa sino el OAuth consent screen
//    "Internal" del proyecto de Google Cloud (una cuenta fuera del dominio
//    Workspace no puede ni completar el login) y, en las llamadas a Drive/
//    Sheets, el ACL propio de cada archivo.
//  - El access token dura ~1h y no hay refresh token en este flujo; se
//    renueva en silencio (prompt:'') antes de expirar, con un timeout duro
//    porque el callback simplemente no llega si no hay sesión de Google viva.

import { config } from '../config'

const STORAGE_KEY = 'mpc_google_token_v1'
const SILENT_RENEW_TIMEOUT_MS = 8000
const RENEW_BEFORE_EXPIRY_MS = 5 * 60 * 1000

interface StoredToken {
  accessToken: string
  expiresAt: number // epoch ms
}

type TokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: unknown) => void
          }) => TokenClient
        }
      }
    }
  }
}

interface TokenResponse {
  access_token?: string
  expires_in?: number
  error?: string
}

let current: StoredToken | null = loadStoredToken()
let renewTimer: ReturnType<typeof setTimeout> | null = null

function loadStoredToken(): StoredToken | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredToken
    if (!parsed.accessToken || !parsed.expiresAt) return null
    return parsed
  } catch {
    return null
  }
}

function saveStoredToken(token: StoredToken | null) {
  current = token
  try {
    if (token) localStorage.setItem(STORAGE_KEY, JSON.stringify(token))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage puede fallar (modo privado, cuota) — no es crítico, solo
    // significa que habrá que loguearse de nuevo la próxima vez.
  }
}

function isValid(token: StoredToken | null): token is StoredToken {
  return !!token && token.expiresAt - Date.now() > 60_000
}

function scheduleProactiveRenewal() {
  if (renewTimer) clearTimeout(renewTimer)
  if (!current) return
  const delay = Math.max(current.expiresAt - Date.now() - RENEW_BEFORE_EXPIRY_MS, 5_000)
  renewTimer = setTimeout(() => {
    void requestToken({ silent: true }).catch(() => {
      /* si falla, la próxima llamada a getAccessToken() reintentará */
    })
  }, delay)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

function requestToken(opts: { silent: boolean }): Promise<StoredToken> {
  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(new Error('Google Identity Services todavía no cargó (revisa el <script> en index.html)'))
  }
  const attempt = new Promise<StoredToken>((resolve, reject) => {
    // Un client nuevo por intento: initTokenClient no expone forma de
    // cambiar el callback de uno ya creado, y cada intento necesita
    // resolver/rechazar su propia promesa.
    const scoped = window.google!.accounts.oauth2.initTokenClient({
      client_id: config.google.clientId,
      scope: config.google.scopes,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'sin access_token'))
          return
        }
        const token: StoredToken = {
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
        }
        resolve(token)
      },
    })
    scoped.requestAccessToken(opts.silent ? { prompt: '' } : undefined)
  })

  const withOverallTimeout = opts.silent ? withTimeout(attempt, SILENT_RENEW_TIMEOUT_MS) : attempt

  return withOverallTimeout.then((token) => {
    saveStoredToken(token)
    scheduleProactiveRenewal()
    return token
  })
}

/** Dispara el popup de consentimiento de Google. Debe llamarse desde un click. */
export async function signInInteractive(): Promise<string> {
  const token = await requestToken({ silent: false })
  return token.accessToken
}

/** Intenta recuperar sesión sin mostrar UI (para cuando la app carga). */
export async function tryResumeSession(): Promise<string | null> {
  if (isValid(current)) {
    scheduleProactiveRenewal()
    return current.accessToken
  }
  try {
    const token = await requestToken({ silent: true })
    return token.accessToken
  } catch {
    return null
  }
}

/** Token válido para llamar Sheets/Drive; renueva en silencio si hace falta. */
export async function getAccessToken(): Promise<string> {
  if (isValid(current)) return current.accessToken
  const token = await requestToken({ silent: true })
  return token.accessToken
}

export function signOutGoogle() {
  saveStoredToken(null)
  if (renewTimer) clearTimeout(renewTimer)
}

export function getAllowedDomain(): string {
  return config.allowedDomain
}
