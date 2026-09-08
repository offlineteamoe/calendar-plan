# Plan de Pauta — contexto para Claude Code

Calendario web que reemplaza el Excel manual de planificación de pauta offline
(`Plan Sep 2026 - Proyecto Atribución.xlsm`). Sin servidor propio: vive en
GitHub Pages y usa Firebase (Firestore) tanto para los datos del plan como
para presencia/actividad en tiempo real. Ver el plan de arquitectura original
en `C:\Users\william.fonseca\.claude\plans\magical-popping-turtle.md` para el
razonamiento detrás de la primera versión (basada en Google Sheets) — esa
versión se reemplazó por Firestore antes de terminar la Fase 1: más simple de
configurar (nada de Sheets que crear/compartir), tiempo real de verdad
(`onSnapshot` en vez de "algo cambió, vuelve a leer"), y login en un solo
paso. Lo único que se perdió con el cambio: ya no hay una hoja de cálculo
cruda que alguien pueda abrir fuera de la app para mirar/editar filas a mano.

## Regla de oro: dónde vive cada dato

Todo vive en **Firestore**, bajo `months/{monthKey}/<colección>/<docId>` (ver
`src/types.ts` → `COLLECTIONS` y `src/lib/store.ts`):
- `plan`, `escenario`, `nota`, `bloqueo` — datos activos en Fase 1.
- `real`, `results`, `creative` — el esquema existe pero se dejan vacíos a
  propósito hasta la fase 2 (ver más abajo).

Presencia y actividad (`presence/{monthKey}/users/{uid}`,
`activity/{monthKey}/events/{id}`) son colecciones aparte, deliberadamente
top-level en vez de anidadas bajo `months/` — son efímeras, nunca hay que
tratarlas como un dato de negocio a conservar.

**No hay backend propio.** Todo el código corre en el navegador con la
sesión de Firebase Auth del usuario (`src/lib/firebaseClient.ts`,
`src/lib/store.ts`, `src/hooks/*`). Si algo parece necesitar un servidor, es
señal de que se está resolviendo mal para esta arquitectura.

## Autenticación

Un solo paso (`src/context/AuthContext.tsx` → `signInWithGoogle()` en
`src/lib/firebaseClient.ts`): popup de Firebase Auth con Google, y
`onAuthStateChanged` avisa el resultado — incluida la restauración de sesión
en visitas siguientes, sin lógica propia de renovación de tokens.

El control de dominio real (`@openenglish.com`) pasa por dos lugares
distintos, no por chequeos en el código:
- El OAuth consent screen del proyecto de Google Cloud detrás de Firebase
  debe estar en modo **Internal** (ver README — reutiliza el mismo proyecto
  que ya usa `PPT HTML`).
- Las reglas en `firestore.rules` (deben desplegarse manualmente o vía
  `firebase deploy --only firestore:rules`) — `isOeUser()` se chequea en
  cada regla, nunca alcanza con `request.auth != null`.

## Configuración

Todo lo que depende del proyecto de Firebase vive en variables de entorno
(`src/config.ts`, `.env.example`). Nunca hardcodear la config de Firebase
directamente en el código — así el proyecto se puede reapuntar a otro
proyecto de Firebase, o mover de repo, sin tocar una línea.

## Convenciones al tocar código

- Toda fecha en formato `YYYY-MM-DD` (ver `src/lib/dateUtils.ts`).
- `month_key` de un plan mensual = `YYYY-MM` (ej. `2026-09`), y es también el
  id del documento `months/{monthKey}`.
- IDs de documento determinísticos donde tiene sentido (evita tener que
  buscar antes de escribir): `Plan` usa `${date}_${brand}_${country}_${channel}`
  (ver `planDocId` en `store.ts`); `Escenario` y `Nota` usan su propio
  `scenario_id`/`note_id` (`crypto.randomUUID()` generado en el cliente).
- "Crear un mes" es solo registrar `months/{monthKey}` — a diferencia de un
  Sheet, una colección de Firestore no tiene "encabezados" que preservar ni
  filas que limpiar; simplemente no tiene documentos hasta que algo se
  guarda ahí. No hay flujo de "clonado" que mantener.
- Después de cualquier escritura exitosa desde la UI, llamar a
  `logActivity(...)` (`src/hooks/useActivityFeed.ts`) para que los demás
  usuarios con ese mes abierto se enteren.
- No agregar React Router ni un gestor de estado global (Redux/Zustand) sin
  buena razón: la app tiene 3 pantallas y el estado de datos ya lo maneja
  TanStack Query — es deliberado mantenerlo así de simple.

## Fase actual

**Fase 1 (en progreso):** login, creación de mes, calendario de Plan
editable, Escenarios, Notas, presencia y feed de actividad — todo con datos
ingresados a mano. Las colecciones `real`, `results` y `creative` existen en
el esquema pero se muestran vacías a propósito ("llega en fase 2").

**Fase 2 (no empezada):** conectar `real` a los datos reales de gasto que hoy
vienen de `BDD PAUTA & SPOTFIRE`/Spotfire, poblar `results`/`creative`, y
revisar si el modelo de país agregado (`LT_EXCL_MX_AR`) necesita
desagregarse con % de atribución reales.

## Setup local

Ver `README.md` para la lista completa de pasos manuales (Firebase, Google
Cloud, GitHub) — sin esos, la app corre pero muestra "Falta configuración"
en el login.
