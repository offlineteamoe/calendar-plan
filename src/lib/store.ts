// Acceso a datos. Todo vive en Firestore bajo months/{monthKey}/…
//
// Regla central: TODO lo editable está alcanzado por versión + marca +
// región. Los ids de documento incluyen ese alcance, así que dos regiones o
// dos versiones nunca se pisan entre sí.
//
// Cada escritura deja un ChangeRecord (ver changelog.ts) con el estado
// anterior y el nuevo, para historial, deshacer y auditoría.

import {
  collection,
  collectionGroup,
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
import { pruneUndefined } from './firestoreSafe'
import {
  calendarKey,
  COLLECTIONS,
  COUNTRY_LABELS,
  type Brand,
  type Country,
  type EscenarioRow,
  type MonthEntry,
  type NotaRow,
  type PlanRow,
  type VersionEntry,
  type VersionStatus,
  type WeekCardRow,
} from '../types'

function subCol(db: Firestore, monthKey: string, name: string) {
  return collection(db, COLLECTIONS.months, monthKey, name)
}

/** Alcance de todo lo editable: versión + marca + región. */
export interface Scope {
  versionId: string
  brand: Brand
  country: Country
}

function scopeLabel(scope: Scope, versionLetter: string, extra?: string): string {
  const base = `${versionLetter} · ${scope.brand} · ${COUNTRY_LABELS[scope.country]}`
  return extra ? `${base} · ${extra}` : base
}

function scopeKey(scope: Scope): string {
  return `${scope.versionId}_${scope.brand}_${scope.country}`
}

/**
 * Estampa en el documento los campos que lo hacen legible por sí solo (mes,
 * letra de versión, nombre de la región). La app no los usa —ya conoce el
 * contexto— pero permiten que una consulta externa entienda una fila suelta
 * sin cruzar colecciones. Ver docs/DATA-MODEL.md.
 */
function stamped<T extends object>(monthKey: string, scope: Scope, versionLetter: string, row: T): T {
  return pruneUndefined({
    ...row,
    month_key: monthKey,
    version_letter: versionLetter,
    country_label: COUNTRY_LABELS[scope.country],
  })
}

// ---------------- Meses ----------------

export async function listMonths(): Promise<MonthEntry[]> {
  const snapshot = await getDocs(query(collection(getDb(), COLLECTIONS.months), orderBy('month_key', 'desc')))
  return snapshot.docs.filter((d) => d.id !== GLOBAL_LOG_KEY).map((d) => d.data() as MonthEntry)
}

export async function getMonth(monthKey: string): Promise<MonthEntry | null> {
  const snap = await getDoc(doc(getDb(), COLLECTIONS.months, monthKey))
  return snap.exists() ? (snap.data() as MonthEntry) : null
}

/**
 * Los eventos que no pertenecen a ningún mes vivo (crear o eliminar un mes)
 * se guardan bajo esta clave, porque al eliminar un mes se borran también sus
 * subcolecciones — incluido su propio historial. Se filtra de la lista de
 * meses; el registro de actividad sí lo lee.
 */
export const GLOBAL_LOG_KEY = '_global'

export async function createMonth(monthKey: string, author: ChangeAuthor): Promise<MonthEntry> {
  const db = getDb()
  const ref = doc(db, COLLECTIONS.months, monthKey)
  if ((await getDoc(ref)).exists()) throw new Error(`El mes ${monthKey} ya existe.`)
  const createdBy = author.email
  const entry: MonthEntry = {
    month_key: monthKey,
    status: 'active',
    created_by: createdBy,
    created_at: new Date().toISOString(),
  }
  await setDoc(ref, entry)
  // Todo mes nace con su versión A en estado "maybe".
  await setDoc(doc(db, COLLECTIONS.months, monthKey, COLLECTIONS.versions, 'A'), {
    version_id: 'A',
    letter: 'A',
    status: 'maybe',
    created_by: createdBy,
    created_at: entry.created_at,
    copied_from: null,
  } satisfies VersionEntry)
  await recordChange({
    monthKey: GLOBAL_LOG_KEY,
    entity: 'version',
    docId: monthKey,
    action: 'create',
    whereLabel: monthKey,
    placeKey: 'place.months',
    summaryKey: 'ev.month.create',
    summaryParams: { month: monthKey },
    before: null,
    after: entry as unknown as Record<string, unknown>,
    author,
  })
  return entry
}

export async function setMonthStatus(monthKey: string, status: MonthEntry['status']): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.months, monthKey), { status })
}

export async function deleteMonth(monthKey: string, author: ChangeAuthor): Promise<void> {
  const db = getDb()
  const subCollections = [
    COLLECTIONS.versions,
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
    for (let i = 0; i < snapshot.docs.length; i += 450) {
      const batch = writeBatch(db)
      snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }
  await deleteDoc(doc(db, COLLECTIONS.months, monthKey))
  await recordChange({
    monthKey: GLOBAL_LOG_KEY,
    entity: 'version',
    docId: monthKey,
    action: 'delete',
    whereLabel: monthKey,
    placeKey: 'place.months',
    summaryKey: 'ev.month.delete',
    summaryParams: { month: monthKey },
    before: null,
    after: null,
    author,
  })
}

// ---------------- Versiones de calendario ----------------

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export async function listVersions(monthKey: string): Promise<VersionEntry[]> {
  const snapshot = await getDocs(subCol(getDb(), monthKey, COLLECTIONS.versions))
  const versions = snapshot.docs.map((d) => d.data() as VersionEntry)
  if (versions.length === 0) {
    // Meses creados antes de que existieran las versiones: se les asume la A.
    return [{ version_id: 'A', letter: 'A', status: 'maybe', created_by: '', created_at: '', copied_from: null }]
  }
  return versions.sort((a, b) => (a.letter < b.letter ? -1 : 1))
}

/**
 * Aprueba (o devuelve a "maybe") UN calendario: versión + marca + región.
 * Aprobar OEA/México no toca OEJR/Argentina.
 */
export async function setVersionStatus(
  monthKey: string,
  version: VersionEntry,
  scope: Scope,
  status: VersionStatus,
  author: ChangeAuthor,
): Promise<void> {
  const key = calendarKey(scope.brand, scope.country)
  const next: VersionEntry = {
    ...version,
    scope_status: { ...(version.scope_status ?? {}), [key]: status },
  }
  await setDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.versions, version.version_id), next)
  await recordChange({
    monthKey,
    entity: 'version',
    docId: version.version_id,
    action: 'update',
    whereLabel: scopeLabel(scope, version.letter, status === 'approved' ? 'aprobado' : 'maybe'),
    placeKey: 'place.calendar',
    summaryKey: status === 'approved' ? 'ev.version.approved' : 'ev.version.maybe',
    summaryParams: { version: version.letter },
    before: version as unknown as Record<string, unknown>,
    after: next as unknown as Record<string, unknown>,
    author,
  })
}

/**
 * Estado de aprobación de todos los meses de una vez, para la lista de meses.
 * Una sola consulta de grupo de colección en lugar de una por mes.
 */
export async function listVersionsByMonth(): Promise<Map<string, VersionEntry[]>> {
  const snapshot = await getDocs(collectionGroup(getDb(), COLLECTIONS.versions))
  const byMonth = new Map<string, VersionEntry[]>()
  for (const d of snapshot.docs) {
    // months/{monthKey}/versions/{letter}
    const monthKey = d.ref.parent.parent?.id
    if (!monthKey) continue
    byMonth.set(monthKey, [...(byMonth.get(monthKey) ?? []), d.data() as VersionEntry])
  }
  for (const list of byMonth.values()) list.sort((a, b) => (a.letter < b.letter ? -1 : 1))
  return byMonth
}

/** Cómo se nombra una versión en un texto: su nombre si lo tiene, o la letra. */
export function versionLabel(version: VersionEntry): string {
  return version.name?.trim() ? `${version.letter} · ${version.name.trim()}` : version.letter
}

/** Cambia el nombre y la descripción de una versión, sin tocar nada más. */
export async function updateVersionMeta(
  monthKey: string,
  version: VersionEntry,
  meta: { name: string; description: string },
  author: ChangeAuthor,
): Promise<void> {
  const next: VersionEntry = { ...version, name: meta.name.trim(), description: meta.description.trim() }
  await setDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.versions, version.version_id), next)
  await recordChange({
    monthKey,
    entity: 'version',
    docId: version.version_id,
    action: 'update',
    whereLabel: versionLabel(next),
    placeKey: 'place.calendar',
    summaryKey: 'ev.version.rename',
    summaryParams: { version: versionLabel(next) },
    before: version as unknown as Record<string, unknown>,
    after: next as unknown as Record<string, unknown>,
    author,
  })
}

/**
 * Elimina una versión y TODO su contenido: plan, notas, escenarios,
 * resultados y creativos de todas las marcas y regiones. No se puede borrar
 * la última que queda — un mes sin ninguna versión no tendría dónde planificar.
 */
export async function deleteVersion(
  monthKey: string,
  version: VersionEntry,
  author: ChangeAuthor,
): Promise<void> {
  const db = getDb()
  const existing = await listVersions(monthKey)
  if (existing.length <= 1) throw new Error('No se puede eliminar la única versión del mes.')

  const scoped = [
    COLLECTIONS.plan,
    COLLECTIONS.nota,
    COLLECTIONS.escenario,
    COLLECTIONS.results,
    COLLECTIONS.creative,
    COLLECTIONS.bloqueo,
  ]
  for (const name of scoped) {
    const snapshot = await getDocs(query(subCol(db, monthKey, name), where('version_id', '==', version.version_id)))
    if (snapshot.empty) continue
    for (let i = 0; i < snapshot.docs.length; i += 450) {
      const batch = writeBatch(db)
      snapshot.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref))
      await batch.commit()
    }
  }
  await deleteDoc(doc(db, COLLECTIONS.months, monthKey, COLLECTIONS.versions, version.version_id))

  await recordChange({
    monthKey,
    entity: 'version',
    docId: version.version_id,
    action: 'delete',
    whereLabel: versionLabel(version),
    placeKey: 'place.calendar',
    summaryKey: 'ev.version.delete',
    summaryParams: { version: versionLabel(version) },
    before: version as unknown as Record<string, unknown>,
    after: null,
    author,
  })
}

/**
 * Crea la siguiente versión (A → B → C…) copiando TODO lo de la versión de
 * origen: plan, notas, escenarios, resultados y creativos, de todas las
 * marcas y regiones. La nueva versión arranca siempre en "maybe".
 */
export async function createVersionFrom(
  monthKey: string,
  source: VersionEntry,
  author: ChangeAuthor,
  meta: { name: string; description: string } = { name: '', description: '' },
): Promise<VersionEntry> {
  const db = getDb()
  const existing = await listVersions(monthKey)
  const used = new Set(existing.map((v) => v.letter))
  const letter = LETTERS.split('').find((l) => !used.has(l))
  if (!letter) throw new Error('Se alcanzó el máximo de versiones (Z).')

  const version: VersionEntry = {
    version_id: letter,
    letter,
    name: meta.name.trim(),
    description: meta.description.trim(),
    status: 'maybe',
    created_by: author.email,
    created_at: new Date().toISOString(),
    copied_from: source.letter,
  }
  await setDoc(doc(db, COLLECTIONS.months, monthKey, COLLECTIONS.versions, letter), version)

  // Copiar el contenido de la versión origen a la nueva.
  const copyable = [COLLECTIONS.plan, COLLECTIONS.nota, COLLECTIONS.escenario, COLLECTIONS.results, COLLECTIONS.creative]
  for (const name of copyable) {
    const snapshot = await getDocs(query(subCol(db, monthKey, name), where('version_id', '==', source.version_id)))
    if (snapshot.empty) continue
    for (let i = 0; i < snapshot.docs.length; i += 400) {
      const batch = writeBatch(db)
      for (const d of snapshot.docs.slice(i, i + 400)) {
        const data = { ...(d.data() as Record<string, unknown>), version_id: letter }
        // El id lleva el alcance adelante: se reemplaza la versión de origen.
        const newId = d.id.startsWith(`${source.version_id}_`)
          ? `${letter}_${d.id.slice(source.version_id.length + 1)}`
          : `${letter}_${d.id}`
        batch.set(doc(db, COLLECTIONS.months, monthKey, name, newId), data)
      }
      await batch.commit()
    }
  }

  await recordChange({
    monthKey,
    entity: 'version',
    docId: letter,
    action: 'create',
    whereLabel: `${letter} (copiada de ${source.letter})`,
    placeKey: 'place.calendar',
    summaryKey: 'ev.version.create',
    summaryParams: { version: versionLabel(version), from: source.letter },
    before: null,
    after: version as unknown as Record<string, unknown>,
    author,
  })
  return version
}

// ---------------- Plan ----------------

function planDocId(scope: Scope, date: string, channel: string): string {
  return `${scopeKey(scope)}_${date}_${channel}`
}

export async function savePlanCell(
  monthKey: string,
  scope: Scope,
  versionLetter: string,
  row: PlanRow,
  author: ChangeAuthor,
  locale: string,
): Promise<void> {
  const db = getDb()
  const id = planDocId(scope, row.date, row.channel)
  const ref = doc(db, COLLECTIONS.months, monthKey, COLLECTIONS.plan, id)
  const existing = await getDoc(ref)
  const before = existing.exists() ? (existing.data() as Record<string, unknown>) : null

  const stampedRow = stamped(monthKey, scope, versionLetter, row)
  await setDoc(ref, stampedRow)

  const day = new Date(row.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  await recordChange({
    monthKey,
    entity: 'plan',
    docId: id,
    action: before ? 'update' : 'create',
    whereLabel: scopeLabel(scope, versionLetter, `${day} · ${row.channel}`),
    placeKey: 'place.calendar',
    summaryKey: row.planned_spend > 0 ? 'ev.plan.set' : 'ev.plan.clear',
    summaryParams: { amount: row.planned_spend, channel: row.channel, day },
    before,
    after: stampedRow as unknown as Record<string, unknown>,
    author,
  })
}

// ---------------- Escenarios ----------------

export async function addEscenario(
  monthKey: string,
  scope: Scope,
  versionLetter: string,
  row: EscenarioRow,
  author: ChangeAuthor,
): Promise<void> {
  const id = `${scopeKey(scope)}_${row.scenario_id}`
  await setDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.escenario, id), stamped(monthKey, scope, versionLetter, row))
  await recordChange({
    monthKey,
    entity: 'escenario',
    docId: id,
    action: 'create',
    whereLabel: scopeLabel(scope, versionLetter, `${row.week_start} · ${row.description || '—'}`),
    placeKey: 'place.scenarios',
    summaryKey: 'ev.scenario.create',
    summaryParams: { week: row.week_start, amount: row.weekly_spend },
    before: null,
    after: row as unknown as Record<string, unknown>,
    author,
  })
}

export async function setActiveEscenario(
  monthKey: string,
  scope: Scope,
  versionLetter: string,
  scenario: EscenarioRow,
  author: ChangeAuthor,
): Promise<void> {
  const snapshot = await getDocs(
    query(
      subCol(getDb(), monthKey, COLLECTIONS.escenario),
      where('version_id', '==', scope.versionId),
      where('week_start', '==', scenario.week_start),
      where('brand', '==', scope.brand),
      where('country', '==', scope.country),
    ),
  )
  await Promise.all(snapshot.docs.map((d) => updateDoc(d.ref, { is_active: d.data().scenario_id === scenario.scenario_id })))
  await recordChange({
    monthKey,
    entity: 'escenario',
    docId: scenario.scenario_id,
    action: 'update',
    whereLabel: scopeLabel(scope, versionLetter, `${scenario.week_start} · ${scenario.description || '—'}`),
    placeKey: 'place.scenarios',
    summaryKey: 'ev.scenario.active',
    summaryParams: { week: scenario.week_start, description: scenario.description || '—' },
    before: { ...scenario, is_active: false } as unknown as Record<string, unknown>,
    after: { ...scenario, is_active: true } as unknown as Record<string, unknown>,
    author,
  })
}

// ---------------- Notas ----------------

/** Tolera notas guardadas por versiones anteriores de la app. */
export function normalizeNota(raw: Record<string, unknown>, versionId: string): NotaRow {
  const legacyMap: Record<string, NotaRow['kind']> = {
    promo: 'otro',
    channel_toggle: 'cambio',
    rationale: 'info',
    general: 'info',
  }
  const kind = (raw.kind as NotaRow['kind']) ?? legacyMap[String(raw.category ?? '')] ?? 'otro'
  const content = String(raw.content ?? '')
  const sourceLang = (raw.source_lang as NotaRow['source_lang']) ?? 'es'
  return {
    note_id: String(raw.note_id ?? crypto.randomUUID()),
    version_id: String(raw.version_id ?? versionId),
    brand: (raw.brand as Brand) || 'OEA',
    country: (raw.country as Country) || 'LT_EXCL_MX_AR',
    kind,
    scope: (raw.scope as NotaRow['scope']) === 'week' ? 'week' : 'general',
    week_start: String(raw.week_start ?? ''),
    content,
    source_lang: sourceLang,
    text: (raw.text as NotaRow['text']) ?? { [sourceLang]: content },
    created_at: String(raw.created_at ?? new Date(0).toISOString()),
    created_by: String(raw.created_by ?? ''),
    created_by_role: raw.created_by_role === 'viewer' ? 'viewer' : 'admin',
    updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
    updated_by: raw.updated_by ? String(raw.updated_by) : undefined,
    scope_label: String(raw.scope_label ?? ''),
    month_key: raw.month_key ? String(raw.month_key) : undefined,
    version_letter: raw.version_letter ? String(raw.version_letter) : undefined,
    country_label: raw.country_label ? String(raw.country_label) : undefined,
    week_label: raw.week_label ? String(raw.week_label) : undefined,
  }
}

/** Recorte del texto para que la notificación diga de qué nota se habla. */
function excerpt(text: string, max = 60): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

/** Id del documento de una nota: el alcance va adelante, el uuid al final. */
export function notaDocId(scope: Scope, noteId: string): string {
  return `${scopeKey(scope)}_${noteId}`
}

export async function addNota(
  monthKey: string,
  scope: Scope,
  versionLetter: string,
  row: NotaRow,
  author: ChangeAuthor,
): Promise<void> {
  const id = notaDocId(scope, row.note_id)
  await setDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.nota, id), stamped(monthKey, scope, versionLetter, row))
  await recordChange({
    monthKey,
    entity: 'nota',
    docId: id,
    action: 'create',
    whereLabel: scopeLabel(scope, versionLetter, row.scope === 'week' ? row.week_start : 'general'),
    placeKey: 'place.notes',
    summaryKey: row.scope === 'week' ? 'ev.note.createWeek' : 'ev.note.create',
    summaryParams: { kind: row.kind, week: row.week_start, excerpt: excerpt(row.content) },
    before: null,
    after: row as unknown as Record<string, unknown>,
    author,
  })
}

/**
 * Edita una nota conservando su identidad (mismo `note_id`, mismo documento,
 * misma fecha de creación y mismo autor). Lo que cambia queda en el historial
 * con el estado anterior completo, que es lo que permite ver después qué
 * decía la nota antes de esta edición y quién la tocó.
 */
export async function updateNota(
  monthKey: string,
  scope: Scope,
  versionLetter: string,
  before: NotaRow,
  after: NotaRow,
  author: ChangeAuthor,
): Promise<NotaRow> {
  const id = notaDocId(scope, before.note_id)
  const next: NotaRow = {
    ...after,
    note_id: before.note_id,
    created_at: before.created_at,
    created_by: before.created_by,
    created_by_role: before.created_by_role,
    updated_at: new Date().toISOString(),
    updated_by: author.email,
  }
  const stampedRow = stamped(monthKey, scope, versionLetter, next)
  await setDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.nota, id), stampedRow)
  await recordChange({
    monthKey,
    entity: 'nota',
    docId: id,
    action: 'update',
    whereLabel: scopeLabel(scope, versionLetter, before.scope === 'week' ? before.week_start : 'general'),
    placeKey: 'place.notes',
    summaryKey: before.kind !== next.kind ? 'ev.note.kind' : 'ev.note.update',
    summaryParams: { kind: next.kind, from: before.kind, excerpt: excerpt(next.content) },
    before: before as unknown as Record<string, unknown>,
    after: stampedRow as unknown as Record<string, unknown>,
    author,
  })
  return next
}

export async function deleteNota(
  monthKey: string,
  scope: Scope,
  versionLetter: string,
  row: NotaRow,
  author: ChangeAuthor,
): Promise<void> {
  const id = notaDocId(scope, row.note_id)
  await deleteDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.nota, id))
  await recordChange({
    monthKey,
    entity: 'nota',
    docId: id,
    action: 'delete',
    whereLabel: scopeLabel(scope, versionLetter, row.scope === 'week' ? row.week_start : 'general'),
    placeKey: 'place.notes',
    summaryKey: 'ev.note.delete',
    summaryParams: { kind: row.kind, excerpt: excerpt(row.content) },
    before: row as unknown as Record<string, unknown>,
    after: null,
    author,
  })
}

export async function setNotaTranslations(
  monthKey: string,
  scope: Scope,
  noteId: string,
  row: NotaRow,
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.nota, notaDocId(scope, noteId)), {
    text: row.text,
    source_lang: row.source_lang,
  })
}

// ---------------- Resultados y creativos (una tarjeta por semana) ----------------

type WeekCardKind = typeof COLLECTIONS.results | typeof COLLECTIONS.creative

export async function saveWeekCard(
  monthKey: string,
  kind: WeekCardKind,
  scope: Scope,
  versionLetter: string,
  row: WeekCardRow,
  author: ChangeAuthor,
): Promise<void> {
  const db = getDb()
  const id = `${scopeKey(scope)}_${row.week_start}`
  const ref = doc(db, COLLECTIONS.months, monthKey, kind, id)
  const existing = await getDoc(ref)
  const before = existing.exists() ? (existing.data() as Record<string, unknown>) : null

  if (row.content.trim() === '') {
    if (!before) return
    await deleteDoc(ref)
  } else {
    await setDoc(ref, stamped(monthKey, scope, versionLetter, row))
  }

  await recordChange({
    monthKey,
    entity: kind === COLLECTIONS.results ? 'results' : 'creative',
    docId: id,
    action: row.content.trim() === '' ? 'delete' : before ? 'update' : 'create',
    whereLabel: scopeLabel(scope, versionLetter, row.week_start),
    placeKey: kind === COLLECTIONS.results ? 'place.results' : 'place.creative',
    summaryKey:
      row.content.trim() === ''
        ? kind === COLLECTIONS.results
          ? 'ev.results.clear'
          : 'ev.creative.clear'
        : kind === COLLECTIONS.results
          ? 'ev.results.set'
          : 'ev.creative.set',
    summaryParams: { week: row.week_start, excerpt: excerpt(row.content) },
    before,
    after: row.content.trim() === '' ? null : (row as unknown as Record<string, unknown>),
    author,
  })
}
