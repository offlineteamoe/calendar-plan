# Offline Planning — contexto para Claude Code

Herramienta web de planificación de medios del equipo Offline de Open English.
Reemplaza el Excel mensual manual (`Plan Sep 2026 - Proyecto Atribución.xlsm`).

**Sin servidor propio.** Se publica como sitio estático en GitHub Pages y usa
Firebase (Auth + Firestore) para los datos, la presencia y la actividad en
tiempo real. Si algo parece necesitar un backend, es señal de que se está
resolviendo mal para esta arquitectura.

- Repo: `github.com/offlineteamoe/calendar-plan` (rama `main`)
- Publicado: `https://offlineteamoe.github.io/calendar-plan/`
- Proyecto Firebase: `oe-search-alert` (se muestra como "Open English Auth
  Services"). Es el único que se usa; `calendar-plan-c36b5` se creó por error
  al principio, está vacío, y **no** hay que apuntar nada ahí. La fuente de
  verdad es `VITE_FIREBASE_PROJECT_ID` en `.env.local` y en las Variables del
  repositorio, nunca lo que diga un documento.
- Carpeta de trabajo: `C:\Users\william.fonseca\Projects\media-plan-calendar`
  (**no** en la unidad G: — `npm install` falla ahí por bloqueo de archivos de
  Google Drive)

Documentos hermanos, léelos antes de tocar datos o pedirle pasos al usuario:
- `docs/DATA-MODEL.md` — el esquema completo de Firestore, campo por campo.
- `docs/PASOS-MANUALES.md` — lo que solo puede hacer el usuario en las
  consolas de Google/GitHub, con links exactos.
- `docs/DECISIONES.md` — por qué la app es como es (y qué se descartó).

## Quién es el usuario

William Fonseca lidera la planificación offline. Revisa el diseño con criterio
de usuario final y es directo cuando algo no sirve. Lo que ha pedido de forma
repetida y **no** hay que volver a discutir:

- Usar **toda** la pantalla; nada de islas centradas.
- Nada redundante (dos botones que hacen lo mismo en la misma vista).
- Estados con significado de negocio, no etiquetas técnicas.
- Toda acción visible y con nombre; que no haya que deducirla de un icono.
- Para pasos manuales: link exacto + texto listo para pegar. **Nunca** teclear
  dentro de un editor de código de una consola web (autocompleta llaves y
  corrompe el contenido; ya pasó con las reglas de Firestore).

Verifica visualmente con captura de pantalla antes de dar algo por entregado.

## Reglas de negocio que no se pueden romper

**Roles.** Tres cuentas administran (`src/lib/roles.ts` → `BOOTSTRAP_ADMINS`,
duplicadas a propósito en `firestore.rules`; la lista viva está en
`config/roles`). El resto del dominio **solo consulta**: no crea meses, no
edita el plan, no aprueba. Lo único que puede escribir es una nota de
categoría `observacion`.

**El dominio incluye subdominios.** Hay cuentas en `@openenglish.com` y en
`@business.openenglish.com`. La comprobación exige el punto separador para que
`notopenenglish.com` no cuele (`isAllowedDomainEmail`).

**Alcance de todo lo editable: versión + marca + región.** Los ids de
documento empiezan por `{version}_{brand}_{country}_`. Nunca filtres solo en la
interfaz: si dos calendarios comparten documento, el bug es de modelo.

**La aprobación es por calendario, no por versión.** `scope_status` en el
documento de la versión, con clave `{brand}_{country}`.

**Toda escritura deja un `ChangeRecord`** con `before`/`after` completos y con
`summary_key` + `summary_params` (frase en lenguaje natural, localizable). De
ahí salen el historial personal, deshacer/rehacer, la campanita y el registro
de actividad. Si agregas una escritura nueva y no le pones `summaryKey`, la
notificación saldrá con un texto genérico: eso cuenta como bug.

**El historial es información del equipo que administra.** Un administrador ve
todo; el resto solo su propio rastro: la campanita no existe para ellos, la
página `/logs` tampoco, y el botón de historial de una nota solo aparece en las
notas propias. Está en `firestore.rules`. Al programar: Firestore rechaza la
consulta entera —no la filtra— si pudiera devolver documentos que no puedes
leer, así que cualquier lectura de `changes` que no haga un administrador debe
incluir `where('user_email', '==', <su correo>)`.

**Nada destructivo sin confirmación** (`src/components/ConfirmModal.tsx`), y la
confirmación muestra el contenido afectado.

**Editar una nota conserva su identidad.** Mismo `note_id`, mismo
`created_by`, mismo `created_at` — las reglas de Firestore lo exigen, para que
el historial por nota no se pueda falsear.

## Tiempo real: qué se escucha y qué no

Lo que otra persona puede cambiar mientras miras la pantalla **tiene que ser un
listener**, no una consulta en caché. Ya pasó una vez: el estado
maybe/aprobado se leía una sola vez y los demás seguían viendo "aprobado".

- `useVersions` — versiones y su estado de aprobación (`onSnapshot`).
- `useChanges` — historial del mes.
- `useActivityFeed` — campanita: mes abierto + eventos globales (`_global`).
- `usePresence` — quién está conectado.
- `CalendarPage` refresca las consultas de datos cuando aparece un cambio de
  **otra** persona.

**Nunca uses `where` + `orderBy` sobre campos distintos**: obliga a crear un
índice compuesto a mano en la consola de Firebase y la pantalla se rompe en
producción con un error que el usuario no puede arreglar. Ordena en cliente.
La única consulta de grupo de colección con `orderBy` es `listAllChanges`, y
está solo en la página de administradores.

## Estructura

```
src/
  components/    AppHeader, Modal, ConfirmModal, NotificationBell, Logo…
  context/       AuthContext, ThemeContext
  features/
    calendar/    CalendarGrid, CalendarScopeBar, FiltersPanel, SidePanel,
                 WeekGrid (primitiva de alineación), WeekCardsPanel
    months/      NewMonthModal, DeleteMonthModal
    notes/       NotesPanel, WeeklyNotes, NoteEditorModal, NoteHistoryModal
  hooks/         useRole, useVersions, useChanges, useActivityFeed,
                 usePresence, useUndoRedo
  i18n/          translations.ts (es/en/pt, arranca en inglés)
  lib/           store.ts (acceso a datos), changelog.ts, changeText.ts,
                 roles.ts, translate.ts, dateUtils.ts, firebaseClient.ts
  pages/         LoginPage, MonthsPage, CalendarPage, ActivityLogPage
  styles/        tokens, base, layout, components, pages
```

Cada pantalla es una URL propia con **HashRouter** (GitHub Pages no reescribe
rutas): `#/login`, `#/`, `#/calendar/2026-09`, `#/logs`.

## Alineación semanal

El calendario y los paneles de la derecha comparten el mismo ritmo vertical
para que las semanas queden a la misma altura: encabezado `--h-head` +
subencabezado `--h-sub` + fila de días `--h-weekhead` + N filas con `flex: 1` y
el mismo `--week-gap`. Si algo se desalinea, es que un panel se saltó uno de
esos bloques — **no** lo compenses con píxeles a ojo.

## Convenciones

- Fechas `YYYY-MM-DD`; `month_key` = `YYYY-MM` y es el id del documento del mes.
- Todo texto visible pasa por `t()` en los tres idiomas. La app arranca en
  **inglés** siempre.
- Los errores se muestran en pantalla. Un fallo silencioso es peor que un
  error feo: ya costó una sesión entera depurar un "eliminar no hace nada" que
  eran las reglas de Firestore sin publicar.
- Firestore rechaza `undefined`: nunca escribas un campo opcional sin
  comprobarlo antes.
- Estado de datos con TanStack Query; nada de Redux/Zustand.

## Cómo trabajar aquí

```bash
npm install
npm run dev
npm run build   # tsc -b && vite build — tiene que pasar antes de subir
npm run lint
```

Para revisar diseño sin sesión de Google: parchea temporalmente `App.tsx` con
un harness que renderice el componente con datos falsos, toma la captura, y
**restaura el archivo** antes de compilar y subir.

Restaurar **archivo por archivo**: `git checkout -- <una ruta>`. Con varias
rutas, si una no está en git el comando falla entero y **no restaura ninguna**,
sin que se note. Así se publicó una vez `if (false && status !== 'signed-in')`
y la app quedó sin pedir login en producción. `npm run build` ahora lo detecta
(`scripts/check-no-debug.mjs`), pero comprueba con `git diff` antes de subir.

El token de GitHub del usuario **no tiene permiso `workflow`**: cualquier
cambio a `.github/workflows/deploy.yml` hay que pedírselo por la interfaz web
de GitHub, no intentar subirlo.

Si en Windows aparece el selector de cuenta de GitHub en cada `push`, es que el
Credential Manager tiene varias cuentas guardadas y el repositorio no tiene
ninguna asignada. Se fija una vez, por repositorio:

```bash
git config --local credential.https://github.com.username offlineteamoe
```

## Fase actual

Funcionando: acceso, roles, meses con fases y resumen de aprobación,
calendario editable por versión/marca/región, vista agregada de LATAM, notas
generales y semanales con edición e historial por nota, resultados y creativos
por semana, presencia, campanita de actividad y registro completo para
administradores.

Pendiente de fase 2: poblar `real` con el gasto ejecutado
(`BDD PAUTA & SPOTFIRE`) usando `source_ref` como enganche, y conectar un MCP
de consulta sobre Firestore — por eso cada documento se guarda auto-explicativo
(mes, versión y región legibles dentro del propio documento).
