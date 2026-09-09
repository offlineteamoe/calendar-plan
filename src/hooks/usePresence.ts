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

// El latido es la escritura más frecuente de toda la app, y por lejos: con
// 10 personas y jornada de 8 horas, un latido cada 30 s son ~9.600
// escrituras diarias solo para pintar avatares — la mitad del cupo gratuito
// diario. Dos decisiones lo bajan a una fracción de eso:
//
//   · un minuto entre latidos en vez de medio,
//   · y ninguno mientras la pestaña esté en segundo plano, que es donde se
//     iba la mayor parte (una pestaña olvidada toda la tarde latía igual que
//     alguien trabajando).
//
// El precio es que alguien puede tardar hasta ~2,5 minutos en desaparecer de
// la lista. Para saber quién está trabajando en el mes es de sobra.
const HEARTBEAT_MS = 60_000
// Margen generoso sobre el latido: tolera una red lenta puntual y el momento
// en que una pestaña vuelve a primer plano.
const STALE_AFTER_MS = 150_000

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

    // Solo late si la pestaña está visible. Al volver a primer plano se late
    // de inmediato para no aparecer como ausente mientras llega el siguiente
    // ciclo.
    let interval: ReturnType<typeof setInterval> | null = null

    const start = () => {
      if (interval) return
      beat()
      interval = setInterval(beat, HEARTBEAT_MS)
    }
    const stop = () => {
      if (!interval) return
      clearInterval(interval)
      interval = null
    }

    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop())

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)

    const handleBeforeUnload = () => {
      void deleteDoc(ref)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      void deleteDoc(ref)
    }
    // Reintencionalmente sin `currentView` en las deps: cambiarla no debe
    // reiniciar el intervalo, solo se recoge en el próximo latido vía el ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, me?.uid])

  return users
}
