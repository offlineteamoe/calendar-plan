// Lectura en vivo de una subcolección del mes.
//
// Todo lo que otra persona puede cambiar mientras miras la pantalla se lee con
// `onSnapshot`, no con una consulta en caché. Firestore empuja el cambio al
// instante; no hay que preguntarle cada cierto tiempo ni depender de una señal
// intermedia que avise "algo cambió, vuelve a leer".
//
// Antes esto se resolvía justo así —una lectura en caché más un aviso por el
// historial de cambios— y tenía dos fallos: el aviso tardaba, y a las cuentas
// de consulta dejó de llegarles cuando se restringió quién puede leer el
// historial ajeno. El resultado era una nota borrada que seguía en pantalla de
// otra persona hasta que hacía clic en algo.

import { useEffect, useRef, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { getDb } from '../lib/firebaseClient'
import { COLLECTIONS } from '../types'

export interface LiveDocs<T> {
  data: T[]
  isLoading: boolean
  error: Error | null
}

/**
 * Documentos de `months/{monthKey}/{collectionName}` de una versión concreta,
 * en vivo. `transform` convierte el documento crudo; puede cambiar de
 * identidad en cada render sin re-suscribir (se guarda en una ref).
 */
export function useLiveDocs<T>(
  monthKey: string | null,
  collectionName: string,
  versionId: string | null,
  transform: (raw: Record<string, unknown>) => T,
): LiveDocs<T> {
  const [state, setState] = useState<LiveDocs<T>>({ data: [], isLoading: true, error: null })
  const transformRef = useRef(transform)
  transformRef.current = transform

  useEffect(() => {
    if (!monthKey || !versionId) {
      setState({ data: [], isLoading: false, error: null })
      return
    }
    setState({ data: [], isLoading: true, error: null })

    const ref = collection(getDb(), COLLECTIONS.months, monthKey, collectionName)
    return onSnapshot(
      query(ref, where('version_id', '==', versionId)),
      (snapshot) => {
        const rows = snapshot.docs.map((d) => transformRef.current(d.data() as Record<string, unknown>))
        setState({ data: rows, isLoading: false, error: null })
      },
      (err) => {
        console.warn(`No se pudo escuchar ${collectionName}:`, err)
        setState({ data: [], isLoading: false, error: err as Error })
      },
    )
  }, [monthKey, collectionName, versionId])

  return state
}
