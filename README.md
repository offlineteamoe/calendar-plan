# Plan de Pauta

Calendario web de planificación de pauta offline (Open English), pensado para
reemplazar el Excel mensual manual. Sin servidor propio: se publica como
sitio estático en GitHub Pages, guarda los datos en Google Sheets (un Sheet
por mes, clonado automáticamente del mes anterior) y muestra colaboración en
tiempo real (quién está viendo qué, cambios recientes) vía Firebase —
confidencial, solo para cuentas `@openenglish.com`.

Ver `CLAUDE.md` para el contexto técnico completo y las convenciones del
proyecto.

## Portabilidad

Este proyecto es autocontenido a propósito: sin rutas absolutas, sin
dependencia de dónde vive en disco, con `base: './'` en `vite.config.ts` para
que el build funcione sin importar el nombre del repo o subcarpeta de GitHub
Pages. Para moverlo (a otra carpeta, a otro repo) simplemente copia la
carpeta completa (o `git clone`) y crea tu propio `.env.local` — nada más
que ajustar.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar con los valores de la sección siguiente
npm run dev
```

## Configuración inicial (pasos manuales, una sola vez)

Ninguno de estos pasos es código — requieren acceso a la consola de Google
Cloud, Firebase y GitHub. El orden importa.

### 1. Repositorio en GitHub
Crear el repo, luego **Settings → Pages → Build and deployment → Source =
GitHub Actions** (el workflow ya está en `.github/workflows/deploy.yml`).

### 2. Proyecto de Google Cloud
En [console.cloud.google.com](https://console.cloud.google.com): crear un
proyecto nuevo (no reutilizar uno de otro sitio — los permisos que pide esta
app son más amplios: lee y **escribe** Sheets/Drive). Habilitar, en **APIs y
servicios → Biblioteca**:
- Google Drive API
- Google Sheets API

### 3. OAuth consent screen
**APIs y servicios → Pantalla de consentimiento de OAuth**:
- Tipo de usuario: **Interno** (solo disponible si el proyecto pertenece a la
  organización de Google Workspace `openenglish.com` — esto es lo que hace
  que una cuenta externa no pueda ni completar el login).
- Nombre de la app, correo de soporte: los que correspondan.
- Scopes a agregar: `.../auth/drive`, `.../auth/spreadsheets`, `email`,
  `openid`.

### 4. OAuth Client ID
**APIs y servicios → Credenciales → Crear credenciales → ID de cliente de
OAuth → Aplicación web**:
- Orígenes de JavaScript autorizados: la URL de GitHub Pages (ej.
  `https://tu-org.github.io`) **y** `http://localhost:5173` (para desarrollo
  local).
- Copiar el **Client ID** resultante → `VITE_GOOGLE_CLIENT_ID`.

### 5. Proyecto de Firebase
En [console.firebase.google.com](https://console.firebase.google.com):
crear proyecto (puede enlazarse al mismo proyecto de Google Cloud del paso
2). Luego:
- **Authentication → Sign-in method → Google**: activar.
- **Authentication → Settings → Authorized domains**: agregar el dominio de
  GitHub Pages.
- **Firestore Database → Crear base de datos**, modo producción.
- **Configuración del proyecto → General → Tus apps → Agregar app web**:
  copiar los valores a `VITE_FIREBASE_*`.

### 6. Reglas de Firestore
Publicar `firestore.rules` (ya está en este repo) desde **Firestore
Database → Reglas** en la consola, pegando el contenido del archivo. O, si
tienes la Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 7. Sheet plantilla
Crear a mano un Google Sheet con una pestaña por cada una listada en
`src/types.ts` (`TAB_HEADERS`): `Plan`, `Escenario`, `Real`, `Bloqueo`,
`Nota`, `Results`, `Creative`, `_Meta` — cada una con **solo la fila de
encabezados**, en el mismo orden que en `TAB_HEADERS`. Compartir el archivo
al dominio `openenglish.com` (o a un Grupo de Google que incluya a todo el
equipo). Copiar su ID (el valor entre `/d/` y `/edit` en la URL) →
`VITE_TEMPLATE_SPREADSHEET_ID`.

### 8. Sheet Index
Crear otro Google Sheet, con una sola pestaña llamada `Months` y encabezados:
`month_key | spreadsheet_id | drive_folder_id | status | created_by |
created_at`. Compartirlo igual que el anterior. Copiar su ID →
`VITE_INDEX_SPREADSHEET_ID`.

### 9. Carpeta compartida "Media Plans"
Crear (o designar) una carpeta en una Unidad Compartida de Google Drive,
compartida al dominio — ahí se van a crear los Sheets de cada mes nuevo, así
todos heredan el mismo permiso sin compartir archivo por archivo. Copiar el
ID de la carpeta (en la URL, después de `/folders/`) →
`VITE_MEDIA_PLANS_FOLDER_ID`.

### 10. Variables en GitHub Actions
**Settings → Secrets and variables → Actions → Variables**: cargar ahí los
mismos valores que en `.env.local` (el workflow los lee como `vars.*`, ver
`.github/workflows/deploy.yml`).

---

Con estos 10 puntos completos, `npm run dev` local y el deploy automático a
GitHub Pages deberían funcionar de punta a punta (login → crear/abrir un
mes → editar el Plan → ver presencia y actividad de otra persona en tiempo
real). Los datos reales de gasto (`BDD PAUTA & SPOTFIRE`) todavía no están
conectados — ver "Fase actual" en `CLAUDE.md`.
