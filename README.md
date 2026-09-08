# Plan de Pauta

Calendario web de planificación de pauta offline (Open English), pensado para
reemplazar el Excel mensual manual. Sin servidor propio: se publica como
sitio estático en GitHub Pages y guarda todo (Plan, Escenarios, Notas,
presencia en tiempo real) en **Firestore** — gratis, confidencial (solo
`@openenglish.com`), y sincronizado al instante entre todos los que tengan el
mes abierto.

Repo: [github.com/offlineteamoe/calendar-plan](https://github.com/offlineteamoe/calendar-plan)
· Publicado en: `https://offlineteamoe.github.io/calendar-plan/`

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

Ninguno de estos pasos es código — requieren acceso a Firebase Console,
Google Cloud Console y GitHub. El orden importa.

### 1. Terminar de publicar el workflow de deploy
El repo ya está creado y con GitHub Pages activado, pero en modo clásico
("Deploy from a branch"). Para que el build de Vite se genere solo en cada
push:
1. En GitHub, entra al repo → **Add file → Create new file** → nombra el
   archivo `.github/workflows/deploy.yml` → pega el contenido que ya está en
   ese mismo archivo dentro de este proyecto local → commit directo a `main`.
   (El token usado para el primer push no tenía permiso `workflow`, por eso
   quedó pendiente este único archivo.)
2. **Settings → Pages → Build and deployment → Source** → cambiar de "Deploy
   from a branch" a **GitHub Actions**.

### 2. Proyecto de Firebase (reutilizando el de PPT HTML)
El proyecto de Google Cloud detrás del dashboard `PPT HTML` (número de
proyecto `832432252141`) ya tiene el OAuth consent screen en modo **Internal**,
restringido a `openenglish.com` — no hace falta configurarlo de nuevo. En
[console.firebase.google.com](https://console.firebase.google.com):
1. **Agregar proyecto** → elegir **"usar un proyecto de Google Cloud
   existente"** → seleccionar ese mismo proyecto (identifícalo por el número
   `832432252141` si hay varios con nombres parecidos).
2. **Authentication → Sign-in method → Google**: activar.
3. **Authentication → Settings → Authorized domains**: agregar
   `offlineteamoe.github.io`.
4. **Firestore Database → Crear base de datos**, modo producción, la región
   que uses normalmente.
5. **Configuración del proyecto → General → Tus apps → Agregar app web**:
   copiar los valores resultantes a `VITE_FIREBASE_*` (en `.env.local` para
   desarrollo, y en GitHub como se explica en el paso 4 de abajo).

### 3. Un solo paso manual en Google Cloud Console
**APIs y servicios → Credenciales** (mismo proyecto de arriba) → abrir el
OAuth Client ID que Firebase generó para el login de Google → agregar a
"Authorized JavaScript origins":
- `https://offlineteamoe.github.io`
- `http://localhost:5173` (para desarrollo local)

Esto no se puede hacer por API — requiere clics en la consola.

### 4. Reglas de Firestore
Publicar `firestore.rules` (ya está en este repo) desde **Firestore
Database → Reglas** en la consola de Firebase, pegando el contenido del
archivo. O, si tienes la Firebase CLI:
```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 5. Variables en GitHub Actions
**Settings → Secrets and variables → Actions → Variables**: cargar ahí los
mismos valores `VITE_FIREBASE_*` y `VITE_ALLOWED_DOMAIN` que en `.env.local`
(el workflow los lee como `vars.*`, ver `.github/workflows/deploy.yml`).

---

Con estos 5 puntos completos, `npm run dev` local y el deploy automático a
GitHub Pages deberían funcionar de punta a punta (login → crear/abrir un
mes → editar el Plan → ver presencia y actividad de otra persona en tiempo
real). Los datos reales de gasto (`BDD PAUTA & SPOTFIRE`) todavía no están
conectados — ver "Fase actual" en `CLAUDE.md`.
