# Arquitectura

## El mapa en una imagen

```
   Navegador (única pieza que ejecuta código propio)
   ┌───────────────────────────────────────────────┐
   │  React 19 + TypeScript, compilado con Vite    │
   │                                               │
   │   pages/      pantallas con URL propia        │
   │   features/   bloques de negocio              │
   │   hooks/      suscripciones en vivo           │
   │   lib/        acceso a datos y utilidades     │
   └───────────────┬───────────────────────────────┘
                   │ SDK de Firebase (web)
       ┌───────────┴────────────┐
       ▼                        ▼
  Firebase Auth            Cloud Firestore
  (Google, 1 clic)      (datos + reglas de seguridad)
                               │
                               └── Cloud Translation API (opcional)

   Sitio servido por GitHub Pages — HTML, CSS y JS estáticos
```

No hay backend propio. Todo el código corre en el navegador con la sesión de
Firebase Auth de quien lo abre. **Si una solución parece necesitar un
servidor, es señal de que se está resolviendo mal para esta arquitectura.**

## Stack

| Pieza | Versión | Por qué |
|---|---|---|
| React | 19 | Componentes y estado local |
| TypeScript | 6.0 | El modelo de datos tiene muchas dimensiones (versión × marca × región); los tipos evitan cruzarlas |
| Vite | 8 | Build rápido; `base: './'` para que el sitio funcione bajo cualquier subcarpeta de Pages |
| react-router-dom | 7 | Rutas con `HashRouter` |
| TanStack Query | 5 | Estado de servidor para lo que **no** es en vivo (rol, mes, registro global) |
| Firebase JS SDK | 12 | Auth + Firestore |
| oxlint | 1.79 | Linter |

Sin Redux ni Zustand: el estado de datos lo lleva Firestore en vivo y el de
interfaz cabe en `useState`.

## Rutas

`HashRouter`, no `BrowserRouter`. GitHub Pages sirve archivos estáticos y no
puede reescribir rutas al `index.html`, así que una URL profunda daría 404.

| URL | Pantalla | Quién entra |
|---|---|---|
| `#/login` | Acceso con Google | Sin sesión |
| `#/` | Lista de meses | Cualquier cuenta del dominio |
| `#/calendar/2026-09` | Calendario de ese mes | Cualquier cuenta del dominio |
| `#/logs` | Registro de actividad completo | Solo administradores |

El control está en `src/App.tsx`: sin sesión iniciada, **cualquier** ruta
renderiza la pantalla de acceso.

## Las tres dimensiones del alcance

Es el concepto central de todo el proyecto. Cualquier dato de planificación
pertenece a exactamente un **calendario**, y un calendario son tres cosas:

```
   mes (2026-09)
     └── versión (A, B, C…)     ← cada calendario tiene las suyas
           └── marca (OEA | OEJR)
                 └── región (LT_EXCL_MX_AR | MX | AR | BR)
```

El id de cada documento editable empieza por ese alcance:
`{version}_{brand}_{country}_…`. No es una convención estética: es lo que
garantiza que dos calendarios **no puedan** compartir datos, sin depender de
que la interfaz filtre bien.

> Si alguna vez dos calendarios comparten un documento, el bug es de modelo,
> no de interfaz. Ver [DATA-MODEL.md](DATA-MODEL.md).

## Tiempo real: qué se escucha

Todo lo que otra persona puede cambiar mientras miras la pantalla es un
**listener** de Firestore (`onSnapshot`), no una consulta en caché.

| Hook | Escucha | Alimenta |
|---|---|---|
| `useLiveDocs` | Una subcolección del mes, filtrada por versión | Plan, notas, escenarios, resultados, creativos |
| `useVersions` | `months/{mes}/versions` | Menú de versiones y estado de aprobación |
| `useChanges` | `months/{mes}/changes` | Historial del encabezado, deshacer/rehacer |
| `useActivityFeed` | Mes abierto + `months/_global` | Campanita (solo administradores) |
| `usePresence` | `presence/{mes}/users` | Quién está conectado |

`useLiveDocs` es la primitiva: recibe mes, nombre de subcolección, versión y
una función de transformación, y devuelve `{ data, isLoading, error }`.

**No leas datos del calendario con `useQuery`.** TanStack Query se reserva para
lo que no cambia sola: la configuración de roles, el documento del mes y el
registro global de la página de administradores.

## Reglas de consulta a Firestore

Dos restricciones que condicionan cómo se escribe cualquier lectura nueva:

**1. Nada de índices compuestos.** Combinar `where` y `orderBy` sobre campos
distintos obliga a crear un índice a mano en la consola de Firebase. Si nadie
lo crea, la pantalla falla en producción con un error que el usuario final no
puede resolver. Se ordena en el cliente. La única excepción es
`listAllChanges`, que ordena en el servidor y vive solo en la pantalla de
administradores — por eso es el único punto de la app que puede pedir un
índice, y está documentado en [PASOS-MANUALES.md](PASOS-MANUALES.md).

**2. Firestore rechaza la consulta entera, no la filtra.** Si una consulta
*podría* devolver documentos que no puedes leer, se deniega completa. Por eso
cualquier lectura de `changes` hecha por una cuenta que no administra debe
incluir explícitamente `where('user_email', '==', <su correo>)`.

**3. Firestore rechaza `undefined`.** Un objeto leído y vuelto a escribir
arrastra campos opcionales sin valor y la escritura entera lanza.
`src/lib/firestoreSafe.ts` (`pruneUndefined`) los limpia antes de escribir, y
se aplica en `stamped()` y en el registro de cambios.

## El registro de cambios

Cada escritura deja un `ChangeRecord` en `months/{mes}/changes` con:

- el estado **completo** anterior (`before`) y posterior (`after`),
- quién y cuándo,
- `where_label` — dónde ocurrió, legible,
- `summary_key` + `summary_params` — la frase que lo describe, como clave de
  idioma y sus valores.

De ese único dato salen cinco funciones: historial personal, deshacer/rehacer,
volver a un punto anterior, la campanita y el registro de actividad.

Guardar la frase como clave (no como texto) permite que cada persona la lea en
su idioma. `src/lib/changeText.ts` la arma. **Una escritura nueva sin
`summaryKey` produce una notificación genérica: eso cuenta como bug.**

## Organización del código

```
src/
  App.tsx              rutas y control de acceso
  main.tsx             arranque y proveedores
  config.ts            configuración de Firebase (valores por defecto en código)
  types.ts             modelo de datos y constantes de negocio

  components/          transversales: AppHeader, Modal, ConfirmModal,
                       PasswordConfirmModal, NotificationBell, PresenceCell,
                       HistoryMenu, AnimatedBackground, Logo
  context/             AuthContext (sesión), ThemeContext (claro/oscuro)
  features/
    calendar/          CalendarGrid, CalendarScopeBar, FiltersPanel, SidePanel,
                       ScenarioEditor, WeekCardsPanel, VersionMetaModal,
                       WeekGrid (primitiva de alineación semanal)
    months/            NewMonthModal, DeleteMonthModal
    notes/             NotesPanel, WeeklyNotes, WeekNoteComposer,
                       NoteEditorModal, NoteHistoryModal
  hooks/               useLiveDocs, useVersions, useChanges, useActivityFeed,
                       usePresence, useRole, useUndoRedo
  i18n/                I18nContext + translations.ts (es/en/pt)
  lib/                 store.ts (acceso a datos), changelog.ts, changeText.ts,
                       roles.ts, translate.ts, dateUtils.ts, firestoreSafe.ts,
                       firebaseClient.ts
  pages/               LoginPage, MonthsPage, CalendarPage, ActivityLogPage
  styles/              tokens, base, layout, components, pages
```

**`lib/store.ts` es la única puerta a Firestore para escribir.** Ningún
componente escribe directamente: así toda escritura pasa por el mismo sitio
donde se estampa el alcance y se registra el cambio.

## Estilos

CSS plano con variables, repartido en cinco archivos por responsabilidad:

| Archivo | Contiene |
|---|---|
| `tokens.css` | Colores, tipografías, sombras, radios. Modo claro y oscuro |
| `base.css` | Reset y elementos HTML |
| `layout.css` | Estructura de pantalla (shell, columnas, paneles) |
| `components.css` | Piezas reutilizables (botones, modales, avatares, menús) |
| `pages.css` | Lo específico de cada pantalla |

El tema responde a tres estados: elección explícita (`[data-theme]`), o el
sistema operativo (`prefers-color-scheme`) cuando no la hay.

## Protección del build

`npm run build` ejecuta antes `scripts/check-no-debug.mjs`, que falla si
encuentra en `src/` un parche de prueba sin revertir (`if (false && …)`,
`if (true) return`). Existe porque uno de esos parches llegó a producción y
desactivó el control de acceso — ver [BITACORA.md](BITACORA.md), 2026-09-09.
