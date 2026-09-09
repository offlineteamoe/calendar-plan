// Escucha en tiempo real los cambios de un mes. De acá salen:
//   - las notificaciones flotantes (cambios de OTROS usuarios),
//   - el historial del encabezado (solo MIS cambios),
//   - la señal para refrescar los datos que otro usuario tocó.

import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getDb } from '../lib/firebaseClient'
import { COLLECTIONS, type ChangeRecord } from '../types'

const FEED_LIMIT = 80

export function useChanges(monthKey: string | null): ChangeRecord[] {
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
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => setChanges(snapshot.docs.map((d) => d.data() as ChangeRecord)),
      (err) => console.warn('No se pudo escuchar el historial de cambios:', err),
    )
    return unsubscribe
  }, [monthKey])

  return changes
}
