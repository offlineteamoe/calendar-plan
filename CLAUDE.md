# Plan de Pauta — contexto para Claude Code

Calendario web que reemplaza el Excel manual de planificación de pauta offline
(`Plan Sep 2026 - Proyecto Atribución.xlsm`). Sin servidor propio: vive en
GitHub Pages, lee/escribe en Google Sheets con el token OAuth del propio
usuario, y usa Firebase (Firestore) solo para presencia/actividad en tiempo
real. Ver el plan de arquitectura original en
`C:\Users\william.fonseca\.claude\plans\magical-popping-turtle.md` para el
razonamiento completo detrás de cada decisión.

## Regla de oro: dónde vive cada dato

- **Google Sheets** = fuente de verdad de todo lo que hay que conservar (Plan,
  Escenario, Nota, Bloqueo, Real, Results, Creative). Ver `src/types.ts` para
  el esquema exacto de cada pestaña y `src/lib/planningSheet.ts` para cómo se
  lee/escribe.
- **Firestore** (`/presence`, `/activity`) = solo información efímera de
  colaboración en vivo. Nunca guardar ahí un dato que deba sobrevivir más allá
  de la sesión — si hace falta conservarlo, va a un Sheet.
- **No hay backend propio.** Todo el código corre en el navegador con el
  access token del usuario (`src/lib/googleAuth.ts`, `src/lib/sheetsApi.ts`) o
  con su sesión de Firebase Auth. Si algo parece necesitar un servidor, es
  señal de que se está resolviendo mal para esta arquitectura.

## Autenticación

Dos pasos encadenados en un solo click (`src/context/AuthContext.tsx`):
1. `signInInteractive()` (Google Identity Services) → access token para
   Drive/Sheets, con renovación silenciosa (`src/lib/googleAuth.ts`).
2. `signInWithGoogleFirebase()` → sesión de Firebase Auth para Firestore.

El control de dominio real (`@openenglish.com`) pasa por dos lugares
distintos, no por chequeos en el código:
- Sheets/Drive: el OAuth consent screen del proyecto de Google Cloud debe
  estar en modo **Internal**.
- Firestore: las reglas en `firestore.rules` (deben desplegarse manualmente o
  vía `firebase deploy --only firestore:rules`).

## Configuración

Todo lo que depende del proyecto de Google Cloud/Firebase/Sheets vive en
variables de entorno (`src/config.ts`, `.env.example`). Nunca hardcodear un
Client ID, spreadsheetId o config de Firebase directamente en el código —
así el proyecto se puede reapuntar a otro proyecto de Firebase/GCP, o mover
de repo, sin tocar una línea.

## Convenciones al tocar código

- Toda fecha en formato `YYYY-MM-DD` (ver `src/lib/dateUtils.ts`).
- `month_key` de un plan mensual = `YYYY-MM` (ej. `2026-09`).
- Cada pestaña del Sheet tiene sus headers listados en `TAB_HEADERS`
  (`src/types.ts`) — si se agrega una columna, actualizar ahí primero, después
  el tipo TypeScript correspondiente y por último la plantilla real en Drive.
- Después de cualquier escritura exitosa a un Sheet desde la UI, llamar a
  `logActivity(...)` (`src/hooks/useActivityFeed.ts`) para que los demás
  usuarios con ese mes abierto se enteren — es el reemplazo sin servidor del
  patrón SSE que usaba `BrandformanceOS`.
- No agregar React Router ni un gestor de estado global (Redux/Zustand) sin
  buena razón: la app tiene 3 pantallas y el estado de datos ya lo maneja
  TanStack Query — es deliberado mantenerlo así de simple.

## Fase actual

**Fase 1 (en progreso):** login, creación/clonado de mes, calendario de Plan
editable, Escenarios, Notas, presencia y feed de actividad — todo con datos
ingresados a mano. Las pestañas `Real`, `Results` y `Creative` existen en el
esquema pero se muestran vacías a propósito ("llega en fase 2").

**Fase 2 (no empezada):** conectar `Real` a los datos reales de gasto que hoy
vienen de `BDD PAUTA & SPOTFIRE`/Spotfire, poblar `Results`/`Creative`, y
revisar si el modelo de país agregado (`LT_EXCL_MX_AR`) necesita
desagregarse con % de atribución reales.

## Setup local

Ver `README.md` para la lista completa de pasos manuales (Google Cloud,
Firebase, Sheets) — sin esos, la app corre pero muestra "Falta
configuración" en el login.
