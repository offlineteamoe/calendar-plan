// Quién puede editar y quién solo consultar.
//
// La lista de administradores vive en Firestore (config/roles), no en el
// código, para poder cambiarla sin volver a desplegar. Las reglas de seguridad
// leen ESE MISMO documento, así que la restricción es real: un usuario de
// consulta que intente escribir desde la consola del navegador recibe
// "permission-denied" del servidor, no solo un botón deshabilitado.
//
// BOOTSTRAP_ADMINS existe para el arranque en frío: si el documento todavía no
// existe (o quedó vacío por error), estas cuentas siguen pudiendo administrar
// y arreglarlo. Está duplicado en firestore.rules a propósito — es la única
// duplicación, y es la que impide quedarse sin ningún administrador.

import { doc, getDoc } from 'firebase/firestore'
import { getDb } from './firebaseClient'

export const BOOTSTRAP_ADMINS = [
  'william.fonseca@openenglish.com',
  'cesar.hernandez@openenglish.com',
  'dolores.yanes@business.openenglish.com',
]

export type Role = 'admin' | 'viewer'

export interface RolesConfig {
  admins: string[]
}

function normalize(email: string): string {
  return email.trim().toLowerCase()
}

export async function getRolesConfig(): Promise<RolesConfig> {
  try {
    const snap = await getDoc(doc(getDb(), 'config', 'roles'))
    const admins = (snap.data()?.admins as string[] | undefined) ?? []
    return { admins: admins.map(normalize).filter(Boolean) }
  } catch (err) {
    // Sin el documento (o sin permiso de lectura) nadie queda bloqueado de
    // más: se cae a la lista de arranque, que es la más restrictiva posible.
    console.warn('No se pudo leer config/roles; usando la lista de arranque.', err)
    return { admins: [] }
  }
}

export function resolveRole(email: string | null | undefined, config: RolesConfig): Role {
  if (!email) return 'viewer'
  const mail = normalize(email)
  if (BOOTSTRAP_ADMINS.map(normalize).includes(mail)) return 'admin'
  return config.admins.includes(mail) ? 'admin' : 'viewer'
}
