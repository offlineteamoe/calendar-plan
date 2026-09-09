// Versiones del mes, en vivo.
//
// Esto NO puede ser una consulta normal en caché: el estado de aprobación
// (maybe / aprobado) es justo el dato que una persona cambia para que las
// demás lo vean. Con una lectura puntual, el resto del equipo seguía viendo
// "aprobado" hasta recargar la página.

import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { getDb } from '../lib/firebaseClient'
import { COLLECTIONS, type VersionEntry } from '../types'

export interface VersionsState {
  versions: VersionEntry[]
  isLoading: boolean
}

/** Versión sintética para meses creados antes de que existieran las versiones. */
const LEGACY_A: VersionEntry = {
  version_id: 'A',
  letter: 'A',
  status: 'maybe',
  created_by: '',
  created_at: '',
  copied_from: null,
}

export function useVersions(monthKey: string | null): VersionsState {
  const [state, setState] = useState<VersionsState>({ versions: [], isLoading: true })

  useEffect(() => {
    if (!monthKey) {
      setState({ versions: [], isLoading: false })
      return
    }
    setState({ versions: [], isLoading: true })
    const ref = collection(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.versions)
    return onSnapshot(
      ref,
      (snapshot) => {
        const versions = snapshot.docs.map((d) => d.data() as VersionEntry).sort((a, b) => (a.letter < b.letter ? -1 : 1))
        setState({ versions: versions.length > 0 ? versions : [LEGACY_A], isLoading: false })
      },
      (err) => {
        console.warn('No se pudieron escuchar las versiones del mes:', err)
        setState({ versions: [LEGACY_A], isLoading: false })
      },
    )
  }, [monthKey])

  return state
}
