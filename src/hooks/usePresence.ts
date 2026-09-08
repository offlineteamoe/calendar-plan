// Presencia en tiempo real: "quién tiene este mes abierto ahora mismo y en
// qué está" (ver plan, sección 3). Vive en Firestore, no en el Sheet — es
// información efímera, no un dato de negocio a conservar.
//
// El control de confidencialidad real está en firestore.rules (solo
// @openenglish.com puede leer/escribir esta colección); este hook asume que
// ya hay una sesión de Firebase Auth activa.

import { useEffect, useRef, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore'
import { getDb } from '../lib/firebaseClient'

const HEARTBEAT_MS = 30_000
// Cualquier doc con lastSeen más viejo que esto se considera "ya no está":
// más margen que el intervalo de heartbeat para tolerar una pestaña en
// segundo plano o una red lenta puntual.
const STALE_AFTER_MS = 45_000

export interface PresenceUser {
  uid: string
  name: string
  email: string
  initials: string
  currentView: string
  lastSeen: number // epoch ms
}

interface RawPresenceDoc {
  name?: string
  email?: string
  initials?: string
  currentView?: string
  lastSeen?: Timestamp
}

export interface PresenceMe {
  uid: string
  name: string
  email: string
  initials: string
}

export function usePresence(monthKey: string | null, me: PresenceMe | null, currentView: string) {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const currentViewRef = useRef(currentView)
  currentViewRef.current = currentView

  // Escuchar a todos los presentes en este mes.
  useEffect(() => {
    if (!monthKey) {
      setUsers([])
      return
    }
    const ref = collection(getDb(), 'presence', monthKey, 'users')
    const unsubscribe = onSnapshot(ref, (snapshot) => {
      const now = Date.now()
      const list: PresenceUser[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as RawPresenceDoc
        const lastSeen = data.lastSeen?.toMillis() ?? 0
        if (now - lastSeen > STALE_AFTER_MS) return
        list.push({
          uid: docSnap.id,
          name: data.name ?? '',
          email: data.email ?? '',
          initials: data.initials ?? '',
          currentView: data.currentView ?? '',
          lastSeen,
        })
      })
      setUsers(list)
    })
    return unsubscribe
  }, [monthKey])

  // Latir mi propia presencia mientras esta pestaña de este mes esté abierta.
  useEffect(() => {
    if (!monthKey || !me) return
    const ref = doc(getDb(), 'presence', monthKey, 'users', me.uid)

    const beat = () =>
      void setDoc(ref, {
        name: me.name,
        email: me.email,
        initials: me.initials,
        currentView: currentViewRef.current,
        lastSeen: serverTimestamp(),
      })

    beat()
    const interval = setInterval(beat, HEARTBEAT_MS)

    const handleBeforeUnload = () => {
      void deleteDoc(ref)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      void deleteDoc(ref)
    }
    // Reintencionalmente sin `currentView` en las deps: cambiarla no debe
    // reiniciar el intervalo, solo se recoge en el próximo latido vía el ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, me?.uid])

  return users
}
