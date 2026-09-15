import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { getRolesConfig, resolveRole, trySelfRegisterAdmin, type Role } from '../lib/roles'

export interface RoleState {
  role: Role
  /** Puede crear/editar/eliminar planificación. */
  canEdit: boolean
  /** Solo puede dejar notas de la categoría "observaciones a considerar". */
  isViewer: boolean
  isLoading: boolean
}

/**
 * Rol del usuario actual, leído de `config/roles` en Firestore.
 *
 * Mientras carga asumimos "solo consulta": es preferible mostrar un botón
 * deshabilitado medio segundo de más que ofrecer una acción que el servidor va
 * a rechazar.
 *
 * Si quien entra no está en la lista, se intenta registrarlo una vez. Las
 * reglas solo lo permiten a las cuentas de arranque, así que esto configura el
 * sistema solo —sin ningún paso manual— la primera vez que entra cada
 * administrador, y no hace nada para el resto del equipo.
 */
export function useRole(): RoleState {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const triedRef = useRef<string | null>(null)

  const query = useQuery({
    queryKey: ['roles'],
    queryFn: getRolesConfig,
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  const config = query.data ?? { admins: [] }
  const role = resolveRole(user?.email, config)

  useEffect(() => {
    const email = user?.email
    if (!email || !query.isSuccess || role === 'admin') return
    // Una sola vez por sesión y por cuenta: si el servidor dice que no, no
    // tiene sentido insistir en cada render.
    if (triedRef.current === email) return
    triedRef.current = email

    void trySelfRegisterAdmin(email).then((registered) => {
      if (registered) void queryClient.invalidateQueries({ queryKey: ['roles'] })
    })
  }, [user?.email, query.isSuccess, role, queryClient])

  return { role, canEdit: role === 'admin', isViewer: role !== 'admin', isLoading: query.isLoading }
}
