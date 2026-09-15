# Operación

Todo lo que hace falta para desplegar, configurar y mantener la herramienta.

## Rutas y direcciones

### Producción

| Qué | Dónde |
|---|---|
| Aplicación publicada | https://offlineteamoe.github.io/calendar-plan/ |
| Repositorio | https://github.com/offlineteamoe/calendar-plan (rama `main`) |
| Consola de Firebase | https://console.firebase.google.com/project/offline-planning |
| Base de datos | https://console.firebase.google.com/project/offline-planning/firestore/databases/-default-/data |
| Reglas de seguridad | https://console.firebase.google.com/project/offline-planning/firestore/databases/-default-/security/rules |
| Acceso (proveedores) | https://console.firebase.google.com/project/offline-planning/authentication/providers |
| Miembros del proyecto | https://console.firebase.google.com/project/offline-planning/settings/iam |
| Despliegues | https://github.com/offlineteamoe/calendar-plan/actions |

### Desarrollo local

| Qué | Dónde |
|---|---|
| Carpeta de trabajo | `C:\Users\william.fonseca\Projects\media-plan-calendar` |
| Variables locales | `.env.local` (no se versiona) |
| Servidor de desarrollo | `http://localhost:5173` |

> **La carpeta de trabajo no puede estar en la unidad `G:`** (Google Drive).
> `npm install` falla ahí por bloqueo de archivos (`EBADF`,
> `TAR_ENTRY_ERROR`).

### Fuentes de origen

| Qué | Dónde |
|---|---|
| Excel que reemplaza | `Plan Sep 2026 - Proyecto Atribución.xlsm` |
| Proyecto anterior (interfaz de referencia) | `C:\BrandformanceOS` |
| Dashboard de referencia (patrón de publicación) | `G:\Unidades compartidas\Marketing Team\Offline Marketing\02. Reports and results\01. KPIS\PPT HTML` |
| Origen futuro del gasto real | `BDD PAUTA & SPOTFIRE` |

## Cuentas y accesos

| Cuenta | Papel |
|---|---|
| `am@openenglish.com` | Propietaria del proyecto de Firebase. Lo creó |
| `william.fonseca@openenglish.com` | Propietario del proyecto · administrador de la herramienta |
| `cesar.hernandez@openenglish.com` | Propietario del proyecto · administrador de la herramienta |
| `dolores.yanes@business.openenglish.com` | Administradora de la herramienta |
| `offlineteamoe` | Cuenta de GitHub dueña del repositorio |

Ser miembro del proyecto de Firebase (tocar reglas, ver la base de datos) y ser
administrador de la herramienta (editar el plan) son **cosas distintas**. Ver
[SEGURIDAD-Y-ROLES.md](SEGURIDAD-Y-ROLES.md).

## Configuración

La configuración de Firebase vive **en el código**, en `src/config.ts`
(`FIREBASE_DEFAULTS`):

```
apiKey             AIzaSyBpMlbfENSFGZZW-VrBXDX5V_vPeztcHMA
authDomain         offline-planning.firebaseapp.com
projectId          offline-planning
storageBucket      offline-planning.firebasestorage.app
messagingSenderId  655635528612
appId              1:655635528612:web:7240675c4826da2ae59f31
```

No es secreta: viaja dentro del JavaScript que descarga el navegador, siempre,
por diseño. Lo que protege los datos son las reglas de Firestore y la lista de
dominios autorizados. Tenerla en el código permite clonar el repositorio y
compilar sin ir a buscar nada.

**Cualquier variable de entorno la sobreescribe**, por si hay que reapuntar la
aplicación a otro proyecto:

| Variable | Uso |
|---|---|
| `VITE_ALLOWED_DOMAIN` | Dominio permitido (por defecto `openenglish.com`) |
| `VITE_FIREBASE_*` | Sobreescriben la configuración de arriba |
| `VITE_GOOGLE_TRANSLATE_KEY` | Llave de Cloud Translation. Sin ella, las notas no se traducen solas |

En producción se leen de las *Variables* del repositorio en GitHub; en local,
de `.env.local`.

## Desarrollo

```bash
npm install
npm run dev      # servidor local
npm run build    # comprobación + tsc + vite build — debe pasar antes de subir
npm run lint
```

`npm run build` ejecuta antes `scripts/check-no-debug.mjs`, que falla si queda
en `src/` un parche de prueba sin revertir.

### Revisar diseño sin sesión de Google

Se parchea temporalmente `App.tsx` con un harness que renderiza el componente
con datos falsos, se toma la captura, y **se restaura el archivo** antes de
compilar.

Restaurar **archivo por archivo**: `git checkout -- <una ruta>`. Con varias
rutas, si una no está en git el comando falla entero y no restaura ninguna, sin
avisar. Esa es exactamente la forma en que un parche llegó a producción.

## Despliegue

Automático: cada `push` a `main` dispara el workflow
`.github/workflows/deploy.yml`, que instala, compila y publica en GitHub Pages.
Tarda 2–3 minutos.

Para verificar qué está publicado de verdad, sin fiarse de la caché del
navegador:

```bash
curl -s https://offlineteamoe.github.io/calendar-plan/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'
curl -s https://offlineteamoe.github.io/calendar-plan/assets/<archivo>.js | grep -o 'offline-planning'
```

> **El token de GitHub disponible no tiene permiso `workflow`.** Cualquier
> cambio a `.github/workflows/deploy.yml` hay que hacerlo desde la interfaz web
> de GitHub.

### Selector de cuenta de GitHub en cada push

Si el Credential Manager de Windows pregunta qué cuenta usar en cada `push`, es
que tiene varias guardadas y el repositorio no tiene ninguna asignada. Se fija
una vez:

```bash
git config --local credential.https://github.com.username offlineteamoe
```

## Las reglas de seguridad NO se despliegan solas

`firestore.rules` está en el repositorio, pero el despliegue no lo publica. Hay
que pegarlo a mano en la consola de Firebase — ver
[PASOS-MANUALES.md](PASOS-MANUALES.md), paso 1.

**Un cambio en ese archivo no tiene ningún efecto hasta que alguien lo
publica.** Es la causa más habitual de "esto debería funcionar y no funciona".

## Cuotas y coste

Plan **Spark** (sin coste, sin tarjeta asociada). Límites aproximados:

| Recurso | Límite diario |
|---|---|
| Lecturas de documentos | ~50.000 |
| Escrituras | ~20.000 |
| Almacenamiento | ~1 GB total |

Si se agotara un cupo, las operaciones fallan hasta medianoche y se restablecen
solas. **Nunca se factura.**

El almacenamiento no es preocupación: todo son textos y números; años de
planificación con historial completo no se acercan a 1 GB.

**Lo que sí consume es el latido de presencia.** Cada persona escribe un
documento por latido. El latido es de un minuto y **solo mientras la pestaña
está visible**, precisamente para que una pestaña olvidada no gaste. Si algún
día se añade otra señal periódica, este es el presupuesto contra el que hay que
medirla: con 10 personas y jornada completa, la presencia debe quedarse muy por
debajo de las 5.000 escrituras diarias.

Consumo en vivo:
https://console.firebase.google.com/project/offline-planning/firestore/usage

## Copias de seguridad

**No hay.** El plan gratuito no incluye copias automáticas ni recuperación a un
punto en el tiempo. Si se elimina un mes, Google no puede devolverlo.

Lo que hoy lo contiene:

1. Solo los administradores pueden borrar.
2. Borrar exige contraseña y muestra qué se pierde.
3. El borrado queda registrado en `months/_global/changes`.

Ninguna de las tres es un respaldo. Ver [PENDIENTES.md](PENDIENTES.md).

## Diagnóstico rápido

| Síntoma | Causa más probable |
|---|---|
| "Missing or insufficient permissions" | No hay sesión iniciada, o las reglas publicadas no son las del repositorio |
| Una acción no hace nada y no da error | Reglas desactualizadas; comprobar la consola del navegador |
| Otra persona no ve un cambio en vivo | Ese dato se está leyendo con `useQuery` en vez de un listener |
| "The query requires an index" | Solo puede venir de `#/logs`; el mensaje trae el enlace para crearlo |
| Una nota se guarda pero su historial queda vacío | Un campo `undefined` en la escritura del registro; revisar `pruneUndefined` |
| La aplicación no pide iniciar sesión | Un parche de prueba llegó a producción; `npm run build` debería haberlo detectado |
| Cambios que no aparecen tras desplegar | Caché del navegador; comprobar con `curl` qué JS está publicado |
