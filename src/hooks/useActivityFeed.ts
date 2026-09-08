// "Alguien cambió algo, vuelve a pedir los datos" — el reemplazo sin
// servidor del Server-Sent Events que usaba BrandformanceOS (ver plan,
// sección 3). Cada escritura exitosa a Sheets llama a logActivity(); todos
// los demás clientes con este mes abierto reciben el evento acá y pueden
// invalidar solo el rango afectado en vez de releer todo el mes.

import { useEffect, useState } from 'react'
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore'
import { getDb } from '../lib/firebaseClient'

export interface ActivityEvent {
  id: string
  type: 'plan_cell' | 'note' | 'scenario' | 'blackout'
  sheetTab: string
  range: string
  userEmail: string
  userInitials: string
  at: number
}

interface RawActivityDoc {
  type?: ActivityEvent['type']
  sheetTab?: string
  range?: string
  userEmail?: string
  userInitials?: string
  at?: Timestamp
}

const FEED_LIMIT = 20

export async function logActivity(
  monthKey: string,
  event: Pick<ActivityEvent, 'type' | 'sheetTab' | 'range' | 'userEmail' | 'userInitials'>,
): Promise<void> {
  await addDoc(collection(getDb(), 'activity', monthKey, 'events'), {
    ...event,
    at: serverTimestamp(),
  })
}

/** Últimos eventos de actividad de un mes, más recientes primero. */
export function useActivityFeed(monthKey: string | null): ActivityEvent[] {
  const [events, setEvents] = useState<ActivityEvent[]>([])

  useEffect(() => {
    if (!monthKey) {
      setEvents([])
      return
    }
    const ref = query(collection(getDb(), 'activity', monthKey, 'events'), orderBy('at', 'desc'), limit(FEED_LIMIT))
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const list: ActivityEvent[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as RawActivityDoc
        list.push({
          id: docSnap.id,
          type: data.type ?? 'plan_cell',
          sheetTab: data.sheetTab ?? '',
          range: data.range ?? '',
          userEmail: data.userEmail ?? '',
          userInitials: data.userInitials ?? '',
          at: data.at?.toMillis() ?? Date.now(),
        })
      })
      setEvents(list)
    })
    return unsubscribe
  }, [monthKey])

  return events
}
