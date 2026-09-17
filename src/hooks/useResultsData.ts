import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { config } from '../config'
import { useAuth } from '../context/AuthContext'
import { DriveAuthError, connectDrive, downloadDriveJson, findDriveFile } from '../lib/googleDrive'
import type { ResultsDataset } from '../lib/results'

const QUERY_KEY = ['results-dataset']
const CACHE_KEY = 'offline-planning-results-cache'

interface CachedDataset {
  /** Marca de tiempo del archivo en Drive cuando se guardó esta copia. */
  modifiedTime: string
  fetchedAt: string
  dataset: ResultsDataset
}

function readCache(): CachedDataset | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedDataset
    return parsed?.dataset?.dates?.length ? parsed : null
  } catch {
    return null
  }
}

function writeCache(value: CachedDataset) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value))
  } catch {
    // Sin espacio o sin almacenamiento: se vuelve a descargar la próxima vez.
    // Es una pérdida de comodidad, no de datos.
  }
}

/**
 * Los resultados de Spotfire, traídos de Drive.
 *
 * CÓMO SE MANTIENE AL DÍA, SIN DESCARGAR DE MÁS
 * Al abrir un calendario se le pregunta a Drive una sola cosa: cuándo cambió el
 * archivo. Es una respuesta de unos cientos de bytes. Si coincide con la copia
 * guardada en el navegador, se usa esa y no se descarga nada; si no coincide
 * —el ETL corrió esta madrugada—, se baja la versión nueva.
 *
 * Así el dato siempre es el último publicado, se abra el calendario una vez al
 * día o veinte, y sin depender de acertar cada cuánto conviene refrescar. El
 * botón de actualizar fuerza la descarga para el caso en que el ETL corra
 * mientras la página ya está abierta.
 *
 * `needsConnect` es el caso en que Google no entregó un token sin preguntar
 * (primera vez, o permiso revocado): entonces hace falta un clic de la persona,
 * porque la ventana de Google solo puede abrirse desde uno.
 */
export function useResultsData() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [connecting, setConnecting] = useState(false)

  const query = useQuery<CachedDataset>({
    queryKey: QUERY_KEY,
    enabled: !!user,
    queryFn: async () => {
      const file = await findDriveFile(config.google.resultsFileName, user?.email)
      const cached = readCache()
      if (cached && cached.modifiedTime === file.modifiedTime) return cached

      const dataset = await downloadDriveJson<ResultsDataset>(file, user?.email)
      const fresh: CachedDataset = {
        modifiedTime: file.modifiedTime,
        fetchedAt: new Date().toISOString(),
        dataset,
      }
      writeCache(fresh)
      return fresh
    },
    // Una comprobación por carga de página basta: el origen se regenera una vez
    // al día. El botón de actualizar cubre el resto.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Si lo que falta es el permiso, reintentar solo repite el mismo fallo.
    retry: (count, error) => !(error instanceof DriveAuthError) && count < 2,
  })

  const needsConnect = query.error instanceof DriveAuthError

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const ok = await connectDrive(user?.email)
      if (ok) await queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      return ok
    } finally {
      setConnecting(false)
    }
  }, [queryClient, user?.email])

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    [queryClient],
  )

  return {
    dataset: query.data?.dataset ?? null,
    /** Cuándo se publicó en Drive la versión que se está viendo. */
    publishedAt: query.data?.modifiedTime ?? null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: query.error as Error | null,
    needsConnect,
    connect,
    connecting,
    refresh,
  }
}
