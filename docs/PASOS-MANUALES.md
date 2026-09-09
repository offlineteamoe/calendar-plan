# Lo que falta hacer a mano

Son cinco cosas (la última solo si aparece un aviso). Ninguna es código: son permisos y llaves que solo se pueden
tocar desde una consola con tu cuenta. Están en orden de importancia — si solo
haces las dos primeras, la herramienta ya funciona bien y de forma segura.

Datos que vas a necesitar en varios pasos:

- Proyecto de Firebase: **`calendar-plan-c36b5`**
- Repositorio: **`offlineteamoe/calendar-plan`**
- Sitio publicado: **https://offlineteamoe.github.io/calendar-plan/**

---

## Paso 1 — Publicar las reglas de seguridad (imprescindible)

Sin esto, cualquier persona del dominio puede editar la planificación: la
separación entre administradores y consulta **no existe** hasta que publiques
estas reglas. Es el paso que más importa.

**Ir a:** https://console.firebase.google.com/project/calendar-plan-c36b5/firestore/rules

1. Vas a ver un editor con las reglas actuales.
2. Selecciona **todo** el contenido (clic dentro del editor y `Ctrl + A`) y
   bórralo.
3. Abre el archivo `firestore.rules` de este proyecto —
   https://github.com/offlineteamoe/calendar-plan/blob/main/firestore.rules —
   pulsa el botón **Copy raw file** (el icono de copiar, arriba a la derecha
   del archivo).
4. Vuelve al editor de Firebase y pega (`Ctrl + V`).
5. Pulsa **Publicar** (botón azul, arriba a la derecha).

> No escribas las reglas a mano en ese editor: autocompleta llaves y termina
> duplicando bloques. Copiar y pegar entero, siempre.

> **Las reglas cambiaron después de la primera versión de este documento.** Si
> ya las publicaste antes, vuelve a hacerlo: ahora incluyen quién puede editar
> cada nota y el registro de actividad.

**Cómo verificar que quedó:** entra a la herramienta con una cuenta que **no**
sea de los tres administradores. En la cabecera debe aparecer la etiqueta
`SOLO CONSULTA`, no debe verse el botón "+ Nuevo mes", y dentro de un
calendario las casillas de inversión deben verse como texto, no como campos
editables.

---

## Paso 2 — Crear la lista de administradores

Los tres correos que me diste ya están escritos dentro de las reglas y del
código como lista de arranque, así que **la herramienta ya funciona sin este
paso**. Este documento sirve para agregar o quitar administradores más adelante
**sin tener que volver a desplegar nada**.

**Ir a:** https://console.firebase.google.com/project/calendar-plan-c36b5/firestore/data

1. Pulsa **Iniciar colección**.
2. ID de la colección: `config` → **Siguiente**.
3. ID del documento: escribe `roles` (no uses el botón "ID automático").
4. Campo:
   - **Campo:** `admins`
   - **Tipo:** `array`
   - Dentro del array, agrega un elemento por cada correo, tipo `string`:
     - `william.fonseca@openenglish.com`
     - `cesar.hernandez@openenglish.com`
     - `dolores.yanes@business.openenglish.com`
5. **Guardar**.

Desde ahí, agregar un administrador es sumar un elemento al array. El cambio
aplica en cuanto la persona recarga la página.

> Las tres cuentas de arriba siguen siendo administradoras aunque este
> documento se borre. Es a propósito: es lo que impide quedarse sin ningún
> administrador por un error de edición.

---

## Paso 3 — Permitir la traducción automática de notas (opcional)

Sin esto todo funciona; las notas simplemente se guardan y se muestran en el
idioma en que se escribieron, sin traducirse solas. Son dos partes: crear la
llave en Google Cloud y decirle al despliegue que la use.

### 3a. Crear y restringir la llave

**Ir a:** https://console.cloud.google.com/apis/library/translate.googleapis.com?project=calendar-plan-c36b5

1. Pulsa **Habilitar** (si ya está habilitada, sigue de largo).
2. Ve a las credenciales:
   https://console.cloud.google.com/apis/credentials?project=calendar-plan-c36b5
3. **Crear credenciales → Clave de API**. Copia la clave que aparece.
4. Pulsa **Editar clave de API** (o el lápiz junto a la clave nueva) y
   configura:
   - **Nombre:** `translate-calendar-plan`
   - **Restricciones de aplicación → Sitios web**, y agrega:
     - `https://offlineteamoe.github.io/*`
   - **Restricciones de API → Restringir clave**, y marca solo
     **Cloud Translation API**.
5. **Guardar**.

La restricción por sitio web es importante: sin ella, la llave sirve desde
cualquier lado y la traducción se puede facturar contra el proyecto por
terceros.

### 3b. Guardar la llave en GitHub

**Ir a:** https://github.com/offlineteamoe/calendar-plan/settings/variables/actions

1. **New repository variable**.
2. **Name:** `VITE_GOOGLE_TRANSLATE_KEY`
3. **Value:** la clave que copiaste.
4. **Add variable**.

### 3c. Agregar una línea al archivo de despliegue

Esta línea no la puedo subir yo: el token que me diste no tiene permiso para
modificar archivos de GitHub Actions. Son 30 segundos.

**Ir a:** https://github.com/offlineteamoe/calendar-plan/edit/main/.github/workflows/deploy.yml

1. Busca el bloque que empieza en `env:` (dentro de `- run: npm run build`).
2. Debajo de la última línea `VITE_FIREBASE_APP_ID: ${{ vars.VITE_FIREBASE_APP_ID }}`,
   agrega una línea **con la misma sangría**:

   ```yaml
          VITE_GOOGLE_TRANSLATE_KEY: ${{ vars.VITE_GOOGLE_TRANSLATE_KEY }}
   ```

3. **Commit changes** → **Commit directly to the main branch** → **Commit
   changes**.

Ese commit dispara el despliegue solo. En dos o tres minutos la traducción
automática está activa.

---

## Paso 4 — Confirmar que las cuentas del subdominio pueden entrar

`dolores.yanes@business.openenglish.com` está en un subdominio distinto. El
código ya lo acepta, pero Firebase tiene su propia lista de dominios
autorizados para el acceso.

**Ir a:** https://console.firebase.google.com/project/calendar-plan-c36b5/authentication/settings

1. Sección **Dominios autorizados**.
2. Confirma que aparece `offlineteamoe.github.io`. Si no está, agrégalo con
   **Agregar dominio**.

Esa lista es de **dominios del sitio web**, no de correos, así que no hay que
agregar `business.openenglish.com` ahí. Si aun así Dolores no puede entrar, es
que el OAuth consent screen del proyecto está en modo *Internal* y su cuenta
cuelga de otra organización de Google Workspace — avísame y lo miramos, la
solución es del lado de Google Cloud, no del código.

---

## Paso 5 — Si el registro de actividad pide un índice

La pantalla de **Registro de actividad** (solo administradores) lee los
cambios de todos los meses de una vez. Es la única consulta de la app que
puede pedir un índice de Firestore.

Si al abrirla ves un error que menciona *"The query requires an index"*, ese
mismo mensaje trae un enlace directo: ábrelo, pulsa **Crear índice** y espera
uno o dos minutos. No hay nada que escribir.

El resto de la aplicación —campanita, historial de notas, calendario— está
escrito a propósito para no necesitar ningún índice, así que si algo más falla
no es por esto.

---

## Cómo saber que todo quedó bien

| Qué probar | Qué debería pasar |
|---|---|
| Entrar con tu cuenta | Ves "+ Nuevo mes" y puedes editar las casillas |
| Entrar con una cuenta cualquiera del dominio | Etiqueta `SOLO CONSULTA`, sin botón de nuevo mes, casillas de solo lectura |
| Esa misma cuenta, pestaña Notas | Solo puede elegir "Observaciones a considerar" (fucsia) |
| Tu cuenta, pestaña Notas | Ves esa observación junto a las demás notas |
| Escribir una nota en español y cambiar el idioma a inglés | Con el paso 3 hecho, la nota aparece traducida a los pocos segundos |
| Dos personas en el mismo mes | Cada una ve el avatar de la otra en la cabecera |
| Cambiar un calendario de aprobado a maybe | La otra persona lo ve cambiar **sin recargar** |
| La campanita del encabezado | Cuenta lo que hicieron los demás y lo explica en palabras |
| Perfil → Registro de actividad | Solo aparece si tu cuenta es administradora |
| La campanita, con una cuenta de consulta | No aparece: la actividad del equipo es de administradores |
| Historial de una nota ajena, con una cuenta de consulta | No hay botón; solo lo ve en sus propias notas |
