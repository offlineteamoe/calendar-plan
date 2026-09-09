// Versiones del calendario abierto, en vivo.
//
// Una versión pertenece a UN calendario: mes + marca + región. Cambiar de
// marca o de región cambia el juego de versiones, igual que cambia el plan y
// las notas. Compartirlas entre calendarios era un error de modelo: la B de
// OEA/México no tiene nada que ver con Argentina.
//
// Y tiene que ser un listener: el estado de aprobación es justo el dato que
// una persona cambia para que las demás lo vean.

import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { getDb } from '../lib/firebaseClient'
import { fallbackVersion } from '../lib/store'
import { COLLECTIONS, type Brand, type Country, type VersionEntry } from '../types'

export interface VersionsState {
  versions: VersionEntry[]
  isLoading: boolean
}

export function useVersions(monthKey: string | null, brand: Brand, country: Country): VersionsState {
  const [all, setAll] = useState<{ rows: VersionEntry[]; loading: boolean }>({ rows: [], loading: true })

  useEffect(() => {
    if (!monthKey) {
      setAll({ rows: [], loading: false })
      return
    }
    setAll({ rows: [], loading: true })
    const ref = collection(getDb(), COLLECTIONS.months, monthKey, COLLECTIONS.versions)
    return onSnapshot(
      ref,
      (snapshot) => setAll({ rows: snapshot.docs.map((d) => d.data() as VersionEntry), loading: false }),
      (err) => {
        console.warn('No se pudieron escuchar las versiones del mes:', err)
        setAll({ rows: [], loading: false })
      },
    )
  }, [monthKey])

  // Se escucha la colección entera y se filtra aquí: son pocos documentos y
  // así cambiar de marca o región no abre una suscripción nueva cada vez.
  return useMemo(() => {
    const mine = all.rows
      .filter((v) => v.brand === brand && v.country === country)
      .sort((a, b) => (a.letter < b.letter ? -1 : 1))
    return {
      versions: mine.length > 0 ? mine : [fallbackVersion(brand, country)],
      isLoading: all.loading,
    }
  }, [all, brand, country])
}
