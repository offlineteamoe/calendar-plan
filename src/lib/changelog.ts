// Registro de cambios: cada escritura sobre los datos de un mes deja un
// ChangeRecord con `before`/`after`. De eso viven tres cosas:
//   1. el historial del encabezado (solo mis cambios) y poder volver a un punto,
//   2. deshacer/rehacer (Ctrl+Z / Ctrl+Y),
//   3. el registro de actividad de todos los usuarios (página /logs).
//
// Se guarda en months/{monthKey}/changes/{change_id}; las reglas de Firestore
// lo cubren con la regla de subcolecciones del mes (ver firestore.rules).

import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  limit as fbLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { getDb } from './firebaseClient'
import { pruneUndefined } from './firestoreSafe'
import { COLLECTIONS, type ChangeRecord } from '../types'

export interface ChangeAuthor {
  email: string
  initials: string
}

interface RecordInput {
  monthKey: string
  entity: ChangeRecord['entity']
  docId: string
  action: ChangeRecord['action']
  whereLabel: string
  /** Clave i18n de la frase natural que describe el cambio. */
  summaryKey?: string
  summaryParams?: Record<string, string | number>
  /** Zona de la app: 'place.calendar', 'place.notes', … */
  placeKey?: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  author: ChangeAuthor
}

/**
 * Deja constancia de un cambio. Nunca debe tumbar la operación principal:
 * si falla el registro (permisos, red), se avisa por consola y seguimos —
 * perder una línea de historial es mucho menos grave que perder el dato.
 */
export async function recordChange(input: RecordInput): Promise<ChangeRecord | null> {
  const change: ChangeRecord = {
    change_id: crypto.randomUUID(),
    month_key: input.monthKey,
    at: new Date().toISOString(),
    user_email: input.author.email,
    user_initials: input.author.initials,
    entity: input.entity,
    doc_id: input.docId,
    action: input.action,
    where_label: input.whereLabel,
    before: pruneUndefined(input.before),
    after: pruneUndefined(input.after),
    reverted: false,
    // Firestore rechaza `undefined`, así que estos campos solo se incluyen
    // cuando existen (los cambios viejos no los tienen y hay que tolerarlo).
    ...(input.summaryKey ? { summary_key: input.summaryKey } : {}),
    ...(input.summaryParams ? { summary_params: input.summaryParams } : {}),
    ...(input.placeKey ? { place_key: input.placeKey } : {}),
  }
  try {
    await setDoc(doc(getDb(), COLLECTIONS.months, input.monthKey, COLLECTIONS.changes, change.change_id), change)
    return change
  } catch (err) {
    console.warn('No se pudo registrar el cambio en el historial:', err)
    return null
  }
}

/** Cambios de un mes, más recientes primero. */
export async function listChanges(monthKey: string, max = 100): Promise<ChangeRecord[]> {
  const ref = collection(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.changes)
  const snap = await getDocs(query(ref, orderBy('at', 'desc'), fbLimit(max)))
  return snap.docs.map((d) => d.data() as ChangeRecord)
}

/** Cambios de todos los meses (registro de actividad global). */
export async function listAllChanges(max = 250): Promise<ChangeRecord[]> {
  const ref = collectionGroup(getDb(), COLLECTIONS.changes)
  const snap = await getDocs(query(ref, orderBy('at', 'desc'), fbLimit(max)))
  return snap.docs.map((d) => d.data() as ChangeRecord)
}

/**
 * Historial de UN documento concreto — el que se muestra al pulsar el botón
 * de historial de una nota.
 *
 * Se consulta solo por `doc_id` y se ordena en el cliente a propósito:
 * combinar `where` con `orderBy` sobre campos distintos obligaría a crear un
 * índice compuesto a mano en la consola de Firebase, y un historial de una
 * nota son unas pocas entradas.
 */
export async function listChangesForDoc(
  monthKey: string,
  docId: string,
  /** Si se pasa, solo los cambios de esa persona (lo que ve un usuario de consulta). */
  onlyEmail?: string,
): Promise<ChangeRecord[]> {
  const ref = collection(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.changes)
  // Solo filtros de igualdad: no hacen falta índices compuestos.
  const q = onlyEmail
    ? query(ref, where('doc_id', '==', docId), where('user_email', '==', onlyEmail))
    : query(ref, where('doc_id', '==', docId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => d.data() as ChangeRecord).sort((a, b) => (a.at < b.at ? 1 : -1))
}

/**
 * Aplica el estado `before` de un cambio (volver a ese punto) o el `after`
 * (rehacer). Devuelve el ChangeRecord nuevo que deja constancia de la vuelta
 * atrás, para que el historial no pierda el rastro.
 */
export async function applyChangeState(
  change: ChangeRecord,
  direction: 'undo' | 'redo',
  author: ChangeAuthor,
): Promise<void> {
  const db = getDb()
  const target = doc(db, COLLECTIONS.months, change.month_key, change.entity, change.doc_id)
  const desired = direction === 'undo' ? change.before : change.after
  const previous = direction === 'undo' ? change.after : change.before

  if (desired === null) {
    await deleteDoc(target)
  } else {
    await setDoc(target, desired)
  }

  await recordChange({
    monthKey: change.month_key,
    entity: change.entity,
    docId: change.doc_id,
    action: desired === null ? 'delete' : previous === null ? 'create' : 'update',
    whereLabel: change.where_label,
    before: previous,
    after: desired,
    author,
  })

  try {
    await updateDoc(doc(db, COLLECTIONS.months, change.month_key, COLLECTIONS.changes, change.change_id), {
      reverted: direction === 'undo',
    })
  } catch (err) {
    console.warn('No se pudo marcar el cambio como revertido:', err)
  }
}
