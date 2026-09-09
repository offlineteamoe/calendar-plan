// Historial del mes, en vivo. De aquí salen el historial del encabezado
// (deshacer, volver a un punto) y la señal para refrescar lo que otra
// persona tocó.
//
// Qué se puede leer depende del rol, y no es solo cosmético: las reglas de
// Firestore solo dejan leer un cambio ajeno a un administrador. Por eso un
// usuario de consulta pide explícitamente sus propios cambios — una consulta
// sin ese filtro sería rechazada entera por el servidor, no filtrada.
//
// Ojo con el orden: filtrar por `user_email` y ordenar por `at` a la vez
// obligaría a crear un índice compuesto a mano en la consola de Firebase. Se
// ordena en el cliente, que para el historial propio de un mes son pocas
// entradas.

import { useEffect, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getDb } from '../lib/firebaseClient'
import { COLLECTIONS, type ChangeRecord } from '../types'

const FEED_LIMIT = 80

interface Options {
  email: string
  /** Un administrador ve el historial de todo el equipo; el resto, el suyo. */
  isAdmin: boolean
}

export function useChanges(monthKey: string | null, { email, isAdmin }: Options): ChangeRecord[] {
  const [changes, setChanges] = useState<ChangeRecord[]>([])

  useEffect(() => {
    if (!monthKey || (!isAdmin && !email)) {
      setChanges([])
      return
    }
    const ref = collection(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.changes)
    const q = isAdmin
      ? query(ref, orderBy('at', 'desc'), limit(FEED_LIMIT))
      : query(ref, where('user_email', '==', email))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => d.data() as ChangeRecord)
        if (!isAdmin) rows.sort((a, b) => (a.at < b.at ? 1 : -1))
        setChanges(rows.slice(0, FEED_LIMIT))
      },
      (err) => console.warn('No se pudo escuchar el historial de cambios:', err),
    )
    return unsubscribe
  }, [monthKey, email, isAdmin])

  return changes
}
