// Quién puede editar y quién solo consultar.
//
// La lista de administradores vive en Firestore (`config/roles`), NO en el
// código. Es deliberado: el JavaScript que sirve GitHub Pages lo puede
// descargar y leer cualquiera, así que tener ahí los correos del equipo era
// publicar en internet a qué tres cuentas atacar.
//
// La única lista que existe en texto está en `firestore.rules`, que vive en
// Firebase y nunca se descarga al navegador. Esa es la que manda: aunque la
// interfaz no muestre un botón, es la regla del servidor la que decide si una
// escritura se acepta.
//
// Arranque en frío: si `config/roles` todavía no existe o no incluye a quien
// entra, el cliente INTENTA registrarse. Las reglas solo dejan hacerlo a las
// cuentas de arranque, así que para cualquier otra persona el intento se
// rechaza sin consecuencias y el sistema se configura solo la primera vez que
// entra un administrador.

import { arrayUnion, doc, getDoc, setDoc } from 'firebase/firestore'
import { getDb } from './firebaseClient'

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
    // más: se asume el rol más restrictivo.
    console.warn('No se pudo leer config/roles; se asume solo consulta.', err)
    return { admins: [] }
  }
}

/**
 * Intenta añadirse a la lista de administradores. Solo prospera si las reglas
 * reconocen a quien lo pide como cuenta de arranque; en cualquier otro caso
 * el servidor lo rechaza y no pasa nada.
 *
 * Devuelve `true` si el registro se guardó.
 */
export async function trySelfRegisterAdmin(email: string): Promise<boolean> {
  try {
    await setDoc(doc(getDb(), 'config', 'roles'), { admins: arrayUnion(normalize(email)) }, { merge: true })
    return true
  } catch {
    // Esperado para cualquiera que no sea cuenta de arranque.
    return false
  }
}

export function resolveRole(email: string | null | undefined, config: RolesConfig): Role {
  if (!email) return 'viewer'
  return config.admins.includes(normalize(email)) ? 'admin' : 'viewer'
}
