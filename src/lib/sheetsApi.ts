// Llamadas directas del navegador a Google Sheets API v4 y Drive API v3, con
// el access token del propio usuario (ver googleAuth.ts) — sin backend.
//
// `supportsAllDrives` / `includeItemsFromAllDrives` / `corpora=allDrives` van
// en TODAS las llamadas de Drive: si el Sheet Index, la plantilla o la
// carpeta "Media Plans" viven en una Unidad Compartida, omitir estos
// parámetros hace que la API devuelva "vacío" en vez de un error — el mismo
// problema ya documentado en el proyecto PPT HTML.

import { getAccessToken } from './googleAuth'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3'

async function authedFetch(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const token = await getAccessToken()
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
  if ((response.status === 401 || response.status === 403) && !retried) {
    // El token pudo expirar/revocarse entre la última renovación y ahora;
    // getAccessToken() ya intenta renovar en silencio, así que un solo
    // reintento es suficiente (igual que el patrón validado en PPT HTML).
    return authedFetch(url, init, true)
  }
  return response
}

async function asJson<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`${context} falló (${response.status}): ${body.slice(0, 500)}`)
  }
  return response.json() as Promise<T>
}

// ---------- Sheets ----------

export interface ValueRange {
  range?: string
  majorDimension?: string
  values?: string[][]
}

export async function getValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`
  const data = await asJson<ValueRange>(await authedFetch(url), `Leer ${range}`)
  return data.values ?? []
}

export async function updateValues(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][],
): Promise<void> {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`
  await asJson(
    await authedFetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) }),
    `Escribir ${range}`,
  )
}

export async function appendValues(
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][],
): Promise<void> {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  await asJson(
    await authedFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values }) }),
    `Agregar filas en ${range}`,
  )
}

export async function clearValues(spreadsheetId: string, range: string): Promise<void> {
  const url = `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`
  await asJson(await authedFetch(url, { method: 'POST' }), `Limpiar ${range}`)
}

export interface SpreadsheetMeta {
  spreadsheetId: string
  properties?: { title?: string }
  sheets?: { properties?: { title?: string; sheetId?: number; gridProperties?: { rowCount?: number; columnCount?: number } } }[]
}

export async function getSpreadsheetMeta(spreadsheetId: string): Promise<SpreadsheetMeta> {
  const url = `${SHEETS_BASE}/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`
  return asJson<SpreadsheetMeta>(await authedFetch(url), 'Leer metadata del spreadsheet')
}

// ---------- Drive ----------

export interface DriveFile {
  id: string
  name: string
  modifiedTime?: string
}

export async function copySpreadsheet(fileId: string, newName: string, parentFolderId?: string): Promise<DriveFile> {
  const url = `${DRIVE_BASE}/files/${fileId}/copy?supportsAllDrives=true&fields=id,name,modifiedTime`
  const body: Record<string, unknown> = { name: newName }
  if (parentFolderId) body.parents = [parentFolderId]
  return asJson<DriveFile>(
    await authedFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    `Copiar spreadsheet ${fileId}`,
  )
}

export async function getFileMeta(fileId: string): Promise<DriveFile> {
  const url = `${DRIVE_BASE}/files/${fileId}?supportsAllDrives=true&fields=id,name,modifiedTime`
  return asJson<DriveFile>(await authedFetch(url), `Leer metadata de ${fileId}`)
}
