// Acceso a datos. Todo vive en Firestore bajo months/{monthKey}/<colección>.
// Cada escritura sobre datos del plan deja un ChangeRecord (ver changelog.ts)
// con el estado anterior y el nuevo, para historial, deshacer y auditoría.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { getDb } from './firebaseClient'
import { recordChange, type ChangeAuthor } from './changelog'
import {
  COLLECTIONS,
  COUNTRY_LABELS,
  type EscenarioRow,
  type MonthEntry,
  type NotaRow,
  type PlanRow,
} from '../types'

function monthsCol(db: Firestore) {
  return collection(db, COLLECTIONS.months)
}
function subCol(db: Firestore, monthKey: string, name: string) {
  return collection(db, COLLECTIONS.months, monthKey, name)
}

// ---------------- Meses ----------------

export async function listMonths(): Promise<MonthEntry[]> {
  const snapshot = await getDocs(query(monthsCol(getDb()), orderBy('month_key', 'desc')))
  return snapshot.docs.map((d) => d.data() as MonthEntry)
}

export async function getMonth(monthKey: string): Promise<MonthEntry | null> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.months, monthKey))
  return snap.exists() ? (snap.data() as MonthEntry) : null
}

export async function createMonth(monthKey: string, createdBy: string): Promise<MonthEntry> {
  const db = getDb()
  const ref = doc(db, COLLECTIONS.months, monthKey)
  if ((await getDoc(ref)).exists()) throw new Error(`El mes ${monthKey} ya existe.`)
  const entry: MonthEntry = {
    month_key: monthKey,
    status: 'active',
    created_by: createdBy,
    created_at: new Date().toISOString(),
  }
  await setDoc(ref, entry)
  return entry
}

export async function setMonthStatus(monthKey: string, status: MonthEntry['status']): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.months, monthKey), { status })
}

/**
 * Borra un mes completo: primero el contenido de cada subcolección y al
 * final el documento del mes. Firestore no borra subcolecciones en cascada,
 * así que hay que recorrerlas explícitamente.
 */
export async function deleteMonth(monthKey: string): Promise<void> {
  const db = getDb()
  const subCollections = [
    COLLECTIONS.plan,
    COLLECTIONS.escenario,
    COLLECTIONS.nota,
    COLLECTIONS.bloqueo,
    COLLECTIONS.real,
    COLLECTIONS.results,
    COLLECTIONS.creative,
    COLLECTIONS.changes,
  ]
  for (const name of subCollections) {
    const snapshot = await getDocs(subCol(db, monthKey, name))
    if (snapshot.empty) continue
    // Firestore admite hasta 500 operaciones por lote.
    for (let i = 0; i < snapshot.docs.length; i += 450) {
      const batch = writeBatch(db)
      snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }
  await deleteDoc(doc(db, COLLECTIONS.months, monthKey))
}

// ---------------- Plan ----------------

function planDocId(row: Pick<PlanRow, 'date' | 'brand' | 'country' | 'channel'>): string {
  return `${row.date}_${row.brand}_${row.country}_${row.channel}`
}

function planWhereLabel(row: PlanRow, locale: string): string {
  const day = new Date(row.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  return `${day} · ${row.brand} · ${COUNTRY_LABELS[row.country]} · ${row.channel}`
}

export async function getPlanRows(monthKey: string): Promise<PlanRow[]> {
  const snapshot = await getDocs(subCol(getDb(), monthKey, COLLECTIONS.plan))
  return snapshot.docs.map((d) => d.data() as PlanRow)
}

/** Crea o reemplaza una celda del plan y registra el cambio. */
export async function savePlanCell(
  monthKey: string,
  row: PlanRow,
  author: ChangeAuthor,
  locale: string,
): Promise<void> {
  const db = getDb()
  const ref = doc(db, COLLECTIONS.months, monthKey, COLLECTIONS.plan, planDocId(row))
  const existing = await getDoc(ref)
  const before = existing.exists() ? (existing.data() as Record<string, unknown>) : null

  await setDoc(ref, row)
  await recordChange({
    monthKey,
    entity: 'plan',
    docId: planDocId(row),
    action: before ? 'update' : 'create',
    whereLabel: planWhereLabel(row, locale),
    before,
    after: row as unknown as Record<string, unknown>,
    author,
  })
}

// ---------------- Escenarios ----------------

export async function getEscenarios(monthKey: string): Promise<EscenarioRow[]> {
  const snapshot = await getDocs(subCol(getDb(), monthKey, COLLECTIONS.escenario))
  return snapshot.docs.map((d) => d.data() as EscenarioRow)
}

export async function addEscenario(monthKey: string, row: EscenarioRow, author: ChangeAuthor): Promise<void> {
  await setDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.escenario, row.scenario_id), row)
  await recordChange({
    monthKey,
    entity: 'escenario',
    docId: row.scenario_id,
    action: 'create',
    whereLabel: `${row.brand} · ${row.week_start} · ${row.description || '—'}`,
    before: null,
    after: row as unknown as Record<string, unknown>,
    author,
  })
}

/** Marca un escenario como el activo de su semana+marca; desactiva los demás. */
export async function setActiveEscenario(
  monthKey: string,
  scenario: EscenarioRow,
  author: ChangeAuthor,
): Promise<void> {
  const col = subCol(getDb(), monthKey, COLLECTIONS.escenario)
  const snapshot = await getDocs(
    query(col, where('week_start', '==', scenario.week_start), where('brand', '==', scenario.brand)),
  )
  await Promise.all(
    snapshot.docs.map((d) => updateDoc(d.ref, { is_active: d.id === scenario.scenario_id })),
  )
  await recordChange({
    monthKey,
    entity: 'escenario',
    docId: scenario.scenario_id,
    action: 'update',
    whereLabel: `${scenario.brand} · ${scenario.week_start} · ${scenario.description || '—'}`,
    before: { ...scenario, is_active: false } as unknown as Record<string, unknown>,
    after: { ...scenario, is_active: true } as unknown as Record<string, unknown>,
    author,
  })
}

// ---------------- Notas ----------------

export async function getNotas(monthKey: string): Promise<NotaRow[]> {
  const snapshot = await getDocs(subCol(getDb(), monthKey, COLLECTIONS.nota))
  return snapshot.docs
    .map((d) => normalizeNota(d.data() as Record<string, unknown>))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

/**
 * Tolera notas guardadas por versiones anteriores de la app (tenían
 * `category`, `week_start` y no `kind`/`created_at` consistentes), para que
 * las notas viejas sigan visibles en lugar de desaparecer.
 */
function normalizeNota(raw: Record<string, unknown>): NotaRow {
  const legacyCategory = String(raw.category ?? '')
  const legacyMap: Record<string, NotaRow['kind']> = {
    promo: 'otro',
    channel_toggle: 'cambio',
    rationale: 'info',
    general: 'info',
  }
  const kind = (raw.kind as NotaRow['kind']) ?? legacyMap[legacyCategory] ?? 'otro'
  const content = String(raw.content ?? '')
  const sourceLang = (raw.source_lang as NotaRow['source_lang']) ?? 'es'
  return {
    note_id: String(raw.note_id ?? crypto.randomUUID()),
    kind,
    content,
    source_lang: sourceLang,
    text: (raw.text as NotaRow['text']) ?? { [sourceLang]: content },
    created_at: String(raw.created_at ?? raw.week_start ?? new Date(0).toISOString()),
    created_by: String(raw.created_by ?? ''),
    scope_label: String(raw.scope_label ?? raw.week_start ?? ''),
    brand: (raw.brand as NotaRow['brand']) ?? '',
    country: (raw.country as NotaRow['country']) ?? '',
  }
}

/** Guarda las traducciones que llegaron después de crear la nota. */
export async function setNotaTranslations(monthKey: string, noteId: string, row: NotaRow): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.nota, noteId), {
    text: row.text,
    source_lang: row.source_lang,
  })
}

export async function addNota(monthKey: string, row: NotaRow, author: ChangeAuthor): Promise<void> {
  await setDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.nota, row.note_id), row)
  await recordChange({
    monthKey,
    entity: 'nota',
    docId: row.note_id,
    action: 'create',
    whereLabel: row.scope_label || monthKey,
    before: null,
    after: row as unknown as Record<string, unknown>,
    author,
  })
}

export async function deleteNota(monthKey: string, row: NotaRow, author: ChangeAuthor): Promise<void> {
  await deleteDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.nota, row.note_id))
  await recordChange({
    monthKey,
    entity: 'nota',
    docId: row.note_id,
    action: 'delete',
    whereLabel: row.scope_label || monthKey,
    before: row as unknown as Record<string, unknown>,
    after: null,
    author,
  })
}
