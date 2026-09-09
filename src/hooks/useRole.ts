import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { getRolesConfig, resolveRole, type Role } from '../lib/roles'

export interface RoleState {
  role: Role
  /** Puede crear/editar/eliminar planificación. */
  canEdit: boolean
  /** Solo puede dejar notas de la categoría "observaciones a considerar". */
  isViewer: boolean
  isLoading: boolean
}

/**
 * Rol del usuario actual. Mientras carga asumimos "viewer": es preferible
 * mostrar un botón deshabilitado medio segundo de más que ofrecer una acción
 * que el backend va a rechazar.
 */
export function useRole(): RoleState {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['roles'],
    queryFn: getRolesConfig,
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  })

  const role = query.data ? resolveRole(user?.email, query.data) : resolveRole(user?.email, { admins: [] })
  return { role, canEdit: role === 'admin', isViewer: role !== 'admin', isLoading: query.isLoading }
}
