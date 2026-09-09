// Actividad en vivo para la campanita del encabezado.
//
// Escucha dos sitios, los dos como subcolección (nunca como consulta de grupo
// de colección): el historial del mes abierto, y el historial "global" donde
// quedan los eventos que no pertenecen a un mes vivo — crear y eliminar meses.
// Hacerlo así evita depender de índices que haya que crear a mano en la
// consola de Firebase: la campanita tiene que funcionar sí o sí.

import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getDb } from '../lib/firebaseClient'
import { GLOBAL_LOG_KEY } from '../lib/store'
import { COLLECTIONS, type ChangeRecord } from '../types'

const FEED_LIMIT = 80

function useChangesOf(monthKey: string | null): ChangeRecord[] {
  const [changes, setChanges] = useState<ChangeRecord[]>([])

  useEffect(() => {
    if (!monthKey) {
      setChanges([])
      return
    }
    const ref = query(
      collection(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.changes),
      orderBy('at', 'desc'),
      limit(FEED_LIMIT),
    )
    return onSnapshot(
      ref,
      (snapshot) => setChanges(snapshot.docs.map((d) => d.data() as ChangeRecord)),
      (err) => console.warn('No se pudo escuchar la actividad:', err),
    )
  }, [monthKey])

  return changes
}

/** Actividad del mes abierto (si hay) más los eventos de meses creados o eliminados. */
export function useActivityFeed(monthKey: string | null): ChangeRecord[] {
  const monthChanges = useChangesOf(monthKey)
  const globalChanges = useChangesOf(GLOBAL_LOG_KEY)

  return useMemo(
    () => [...monthChanges, ...globalChanges].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, FEED_LIMIT),
    [monthChanges, globalChanges],
  )
}
