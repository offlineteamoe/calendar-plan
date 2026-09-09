// Toda la data del plan (Plan/Escenario/Nota/Bloqueo/Real/Results/Creative)
// vive en Firestore, bajo months/{monthKey}/<colección>/<docId> — ver plan de
// arquitectura (pivote de Google Sheets a Firestore) y firestore.rules.
//
// "Crear un mes" es solo registrar el documento months/{monthKey}: a
// diferencia de un Sheet, una colección de Firestore no necesita nada
// "clonado" ni "limpiado" — simplemente no tiene documentos hasta que algo
// se guarda ahí. Eso reemplaza todo el flujo de copiar/limpiar un Sheet.

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
import { COLLECTIONS, type EscenarioRow, type MonthEntry, type NotaRow, type PlanRow } from '../types'

function monthsCol(db: Firestore) {
  return collection(db, COLLECTIONS.months)
}

function subCol(db: Firestore, monthKey: string, name: string) {
  return collection(db, COLLECTIONS.months, monthKey, name)
}

// ---------- Meses ----------

export async function listMonths(): Promise<MonthEntry[]> {
  const snapshot = await getDocs(query(monthsCol(getDb()), orderBy('month_key', 'desc')))
  return snapshot.docs.map((d) => d.data() as MonthEntry)
}

export async function createMonth(monthKey: string, createdBy: string): Promise<MonthEntry> {
  const db = getDb()
  const ref = doc(db, COLLECTIONS.months, monthKey)
  const existing = await getDoc(ref)
  if (existing.exists()) {
    throw new Error(`El mes ${monthKey} ya existe.`)
  }
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

/** Borra un mes completo: sus subcolecciones de datos y el documento del mes. */
export async function deleteMonth(monthKey: string): Promise<void> {
  const db = getDb()
  const dataCollections = [
    COLLECTIONS.plan,
    COLLECTIONS.escenario,
    COLLECTIONS.nota,
    COLLECTIONS.bloqueo,
    COLLECTIONS.real,
    COLLECTIONS.results,
    COLLECTIONS.creative,
  ]
  for (const name of dataCollections) {
    const snapshot = await getDocs(subCol(db, monthKey, name))
    if (snapshot.empty) continue
    const batch = writeBatch(db)
    snapshot.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, COLLECTIONS.months, monthKey))
}

// ---------- Plan ----------

function planDocId(row: Pick<PlanRow, 'date' | 'brand' | 'country' | 'channel'>): string {
  return `${row.date}_${row.brand}_${row.country}_${row.channel}`
}

export async function getPlanRows(monthKey: string): Promise<PlanRow[]> {
  const snapshot = await getDocs(subCol(getDb(), monthKey, COLLECTIONS.plan))
  return snapshot.docs.map((d) => d.data() as PlanRow)
}

/** Crea o reemplaza (por date+brand+country+channel) una fila de Plan. */
export async function upsertPlanRow(monthKey: string, row: PlanRow): Promise<void> {
  const ref = doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.plan, planDocId(row))
  await setDoc(ref, row)
}

// ---------- Escenario ----------

export async function getEscenarios(monthKey: string): Promise<EscenarioRow[]> {
  const snapshot = await getDocs(subCol(getDb(), monthKey, COLLECTIONS.escenario))
  return snapshot.docs.map((d) => d.data() as EscenarioRow)
}

export async function addEscenario(monthKey: string, row: EscenarioRow): Promise<void> {
  const ref = doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.escenario, row.scenario_id)
  await setDoc(ref, row)
}

/** Marca un escenario como el activo de su semana+marca; desactiva los demás. */
export async function setActiveEscenario(monthKey: string, scenarioId: string, weekStart: string, brand: string): Promise<void> {
  const col = subCol(getDb(), monthKey, COLLECTIONS.escenario)
  const snapshot = await getDocs(query(col, where('week_start', '==', weekStart), where('brand', '==', brand)))
  await Promise.all(snapshot.docs.map((d) => updateDoc(d.ref, { is_active: d.id === scenarioId })))
}

// ---------- Nota ----------

export async function getNotas(monthKey: string): Promise<NotaRow[]> {
  const snapshot = await getDocs(subCol(getDb(), monthKey, COLLECTIONS.nota))
  return snapshot.docs.map((d) => d.data() as NotaRow)
}

export async function addNota(monthKey: string, row: NotaRow): Promise<void> {
  const ref = doc(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.nota, row.note_id)
  await setDoc(ref, row)
}
