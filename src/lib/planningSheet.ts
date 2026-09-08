// Lógica de dominio sobre Sheets: leer/escribir filas tipadas por pestaña,
// listar/crear meses (Sheet Index + clonado), ver "5. Creación automática de
// mes" en el plan. Todo corre en el navegador con el token del usuario —
// nada de esto pasa por un backend.

import { config } from '../config'
import { appendValues, clearValues, copySpreadsheet, getSpreadsheetMeta, getValues, updateValues } from './sheetsApi'
import {
  SHEET_TABS,
  TAB_HEADERS,
  type EscenarioRow,
  type MonthIndexEntry,
  type NotaRow,
  type PlanRow,
  type SheetTabName,
} from '../types'

const INDEX_TAB = 'Months'

// ---------- helpers genéricos de mapeo fila <-> objeto ----------

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {}
  headers.forEach((key, i) => {
    record[key] = row[i] ?? ''
  })
  return record
}

function recordToRow(headers: string[], record: Record<string, string | number | boolean>): (string | number | boolean)[] {
  return headers.map((key) => record[key] ?? '')
}

async function readTabRecords(spreadsheetId: string, tab: SheetTabName): Promise<Record<string, string>[]> {
  const headers = TAB_HEADERS[tab]
  const lastCol = columnLetter(headers.length)
  const rows = await getValues(spreadsheetId, `${tab}!A2:${lastCol}`)
  return rows.filter((r) => r.some((cell) => cell !== '')).map((r) => rowToRecord(headers, r))
}

function columnLetter(count: number): string {
  let n = count
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

// ---------- Index (mes -> spreadsheet) ----------

export async function listMonths(): Promise<MonthIndexEntry[]> {
  const rows = await getValues(config.sheets.indexSpreadsheetId, `${INDEX_TAB}!A2:F`)
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      month_key: r[0] ?? '',
      spreadsheet_id: r[1] ?? '',
      drive_folder_id: r[2] ?? '',
      status: (r[3] as MonthIndexEntry['status']) || 'active',
      created_by: r[4] ?? '',
      created_at: r[5] ?? '',
    }))
    .sort((a, b) => (a.month_key < b.month_key ? 1 : -1))
}

async function appendMonthToIndex(entry: MonthIndexEntry): Promise<void> {
  await appendValues(config.sheets.indexSpreadsheetId, `${INDEX_TAB}!A:F`, [
    [entry.month_key, entry.spreadsheet_id, entry.drive_folder_id, entry.status, entry.created_by, entry.created_at],
  ])
}

/**
 * Crea el Sheet de un mes nuevo: lo clona del mes activo más reciente (o de
 * la plantilla si todavía no existe ninguno), limpia las filas de datos de
 * cada pestaña dejando solo los encabezados, y lo registra en el Index.
 */
export async function createMonth(monthKey: string, createdBy: string): Promise<MonthIndexEntry> {
  const months = await listMonths()
  const sourceId =
    months.find((m) => m.status === 'active')?.spreadsheet_id || config.sheets.templateSpreadsheetId
  const sourceLabel = months.length > 0 ? 'mes anterior' : 'plantilla'

  const copy = await copySpreadsheet(sourceId, `Media Plan - ${monthKey}`, config.sheets.mediaPlansFolderId || undefined)

  const dataTabs = (Object.values(SHEET_TABS) as SheetTabName[]).filter((t) => t !== SHEET_TABS.meta)
  for (const tab of dataTabs) {
    await clearDataRows(copy.id, tab)
  }

  const nowIso = new Date().toISOString()
  await writeMeta(copy.id, {
    month: monthKey,
    created_from_spreadsheet_id: sourceId,
    created_from: sourceLabel,
    created_at: nowIso,
    schema_version: '1',
  })

  const entry: MonthIndexEntry = {
    month_key: monthKey,
    spreadsheet_id: copy.id,
    drive_folder_id: config.sheets.mediaPlansFolderId,
    status: 'active',
    created_by: createdBy,
    created_at: nowIso,
  }
  await appendMonthToIndex(entry)
  return entry
}

/** Deja la pestaña con solo su fila de encabezado (ver esquema, sección 4). */
async function clearDataRows(spreadsheetId: string, tab: SheetTabName): Promise<void> {
  const meta = await getSpreadsheetMeta(spreadsheetId)
  const sheet = meta.sheets?.find((s) => s.properties?.title === tab)
  const rowCount = sheet?.properties?.gridProperties?.rowCount ?? 1000
  if (rowCount <= 1) return
  const lastCol = columnLetter(TAB_HEADERS[tab].length)
  await clearValues(spreadsheetId, `${tab}!A2:${lastCol}${rowCount}`)
}

async function writeMeta(spreadsheetId: string, entries: Record<string, string>): Promise<void> {
  const rows = Object.entries(entries).map(([key, value]) => [key, value])
  await updateValues(spreadsheetId, `${SHEET_TABS.meta}!A2:B${rows.length + 1}`, rows)
}

// ---------- Plan ----------

export async function getPlanRows(spreadsheetId: string): Promise<PlanRow[]> {
  const records = await readTabRecords(spreadsheetId, SHEET_TABS.plan)
  return records.map((r) => ({
    date: r.date,
    brand: r.brand as PlanRow['brand'],
    country: r.country as PlanRow['country'],
    channel: r.channel,
    scenario_id: r.scenario_id,
    planned_spend: Number(r.planned_spend) || 0,
    last_edited_by: r.last_edited_by,
    last_edited_at: r.last_edited_at,
  }))
}

/** Crea o reemplaza (por date+brand+country+channel) una fila de Plan. */
export async function upsertPlanRow(spreadsheetId: string, row: PlanRow): Promise<void> {
  const headers = TAB_HEADERS[SHEET_TABS.plan]
  const lastCol = columnLetter(headers.length)
  const existingRows = await getValues(spreadsheetId, `${SHEET_TABS.plan}!A2:${lastCol}`)
  const idx = existingRows.findIndex(
    (r) => r[0] === row.date && r[1] === row.brand && r[2] === row.country && r[3] === row.channel,
  )
  const values = recordToRow(headers, row as unknown as Record<string, string | number | boolean>)
  if (idx >= 0) {
    await updateValues(spreadsheetId, `${SHEET_TABS.plan}!A${idx + 2}:${lastCol}${idx + 2}`, [values])
  } else {
    await appendValues(spreadsheetId, `${SHEET_TABS.plan}!A:${lastCol}`, [values])
  }
}

// ---------- Escenario ----------

export async function getEscenarios(spreadsheetId: string): Promise<EscenarioRow[]> {
  const records = await readTabRecords(spreadsheetId, SHEET_TABS.escenario)
  return records.map((r) => ({
    scenario_id: r.scenario_id,
    week_start: r.week_start,
    brand: r.brand as EscenarioRow['brand'],
    description: r.description,
    weekly_spend: Number(r.weekly_spend) || 0,
    is_active: r.is_active === 'TRUE' || r.is_active === 'true',
    created_by: r.created_by,
    created_at: r.created_at,
  }))
}

export async function addEscenario(spreadsheetId: string, row: EscenarioRow): Promise<void> {
  const headers = TAB_HEADERS[SHEET_TABS.escenario]
  await appendValues(spreadsheetId, `${SHEET_TABS.escenario}!A:${columnLetter(headers.length)}`, [
    recordToRow(headers, row as unknown as Record<string, string | number | boolean>),
  ])
}

/** Marca un escenario como el activo de su semana+marca; desactiva los demás. */
export async function setActiveEscenario(spreadsheetId: string, scenarioId: string, weekStart: string, brand: string): Promise<void> {
  const headers = TAB_HEADERS[SHEET_TABS.escenario]
  const lastCol = columnLetter(headers.length)
  const activeCol = columnLetter(headers.indexOf('is_active') + 1)
  const rows = await getValues(spreadsheetId, `${SHEET_TABS.escenario}!A2:${lastCol}`)
  const updates: { rowNumber: number; value: boolean }[] = []
  rows.forEach((r, i) => {
    if (r[1] !== weekStart || r[2] !== brand) return
    const isTarget = r[0] === scenarioId
    updates.push({ rowNumber: i + 2, value: isTarget })
  })
  for (const u of updates) {
    await updateValues(spreadsheetId, `${SHEET_TABS.escenario}!${activeCol}${u.rowNumber}:${activeCol}${u.rowNumber}`, [[u.value]])
  }
}

// ---------- Nota ----------

export async function getNotas(spreadsheetId: string): Promise<NotaRow[]> {
  const records = await readTabRecords(spreadsheetId, SHEET_TABS.nota)
  return records.map((r) => ({
    note_id: r.note_id,
    scope: r.scope as NotaRow['scope'],
    week_start: r.week_start,
    day: r.day,
    brand: r.brand as NotaRow['brand'],
    country: r.country as NotaRow['country'],
    category: r.category as NotaRow['category'],
    content: r.content,
    created_by: r.created_by,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))
}

export async function addNota(spreadsheetId: string, row: NotaRow): Promise<void> {
  const headers = TAB_HEADERS[SHEET_TABS.nota]
  await appendValues(spreadsheetId, `${SHEET_TABS.nota}!A:${columnLetter(headers.length)}`, [
    recordToRow(headers, row as unknown as Record<string, string | number | boolean>),
  ])
}
