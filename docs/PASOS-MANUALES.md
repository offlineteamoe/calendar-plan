# Lo que falta hacer a mano

Cosas que no se pueden automatizar desde el repositorio: permisos y llaves que
solo se tocan en una consola con tu cuenta.

Datos que vas a necesitar:

- **Proyecto de Firebase:** `offline-planning`
- **Repositorio:** `offlineteamoe/calendar-plan`
- **Sitio publicado:** https://offlineteamoe.github.io/calendar-plan/

> ⚠️ **Hay que republicar las reglas (paso 1).** La contraseña de borrado y la
> lista de administradores salieron del código y viven ahora en Firestore, y
> eso necesita reglas nuevas. Sin republicar, borrar cualquier cosa dará error.

---

## Paso 1 — Publicar las reglas de seguridad

**Hay que repetirlo cada vez que cambie `firestore.rules`.** El despliegue del
repositorio **no** publica las reglas: un cambio en ese archivo no tiene ningún
efecto hasta que alguien hace esto.

**1.** Abre el archivo de reglas en texto plano:

```
https://raw.githubusercontent.com/offlineteamoe/calendar-plan/main/firestore.rules
```

**2.** Sobre ese texto: `Ctrl + A` y `Ctrl + C`.

**3.** Abre el editor de reglas:

```
https://console.firebase.google.com/project/offline-planning/firestore/databases/-default-/security/rules
```

**4.** Clic dentro del editor, `Ctrl + A`, `Ctrl + V`.

**5.** Pulsa **Publicar**.

> ⚠️ **Nunca escribas a mano dentro de ese editor.** Autocompleta llaves y
> sangría, y termina duplicando bloques enteros. Pegar el archivo completo,
> siempre.

**Cómo verificar:** entra con una cuenta que no sea de los tres
administradores. Debe aparecer la etiqueta `SOLO CONSULTA`, no debe verse el
botón "+ Nuevo mes", y las casillas de inversión deben mostrarse como texto.

---

## Paso 2 — Lista de administradores *(ya no hace falta)*

**Se configura sola.** La primera vez que entra cada uno de ustedes tres, la
aplicación se registra en `config/roles`. Las reglas solo se lo permiten a esas
tres cuentas, así que para el resto del equipo el intento se rechaza sin
consecuencias.

Solo necesitas tocar ese documento para **añadir un cuarto administrador**:

**Ir a:** https://console.firebase.google.com/project/offline-planning/firestore/databases/-default-/data

Abre `config` → `roles` → añade el correo al array `admins`.

> Si alguien borrase el documento, ustedes tres volverían a registrarse solos
> al entrar. El respaldo vive en las reglas, donde no se puede leer desde
> fuera.

## Paso 2b — La contraseña de borrado *(automático)*

Tampoco requiere consola. La primera vez que un administrador intente eliminar
algo, el propio modal le pedirá definirla. Queda guardada en `config/secrets`,
que solo pueden leer los administradores.

---

## Paso 3 — Traducción automática de notas *(opcional)*

Sin esto todo funciona; las notas se muestran en el idioma en que se
escribieron. Son tres partes.

### 3a. Crear y restringir la llave

**Ir a:** https://console.cloud.google.com/apis/library/translate.googleapis.com?project=offline-planning

1. Pulsa **Habilitar**.
2. Ve a las credenciales:
   https://console.cloud.google.com/apis/credentials?project=offline-planning
3. **Crear credenciales → Clave de API**. Copia la clave.
4. **Editar clave de API**:
   - **Nombre:** `translate-offline-planning`
   - **Restricciones de aplicación → Sitios web:** agrega
     `https://offlineteamoe.github.io/*`
   - **Restricciones de API → Restringir clave:** marca solo
     **Cloud Translation API**
5. **Guardar**.

La restricción por sitio importa: sin ella, la llave sirve desde cualquier
lado y el consumo se factura contra el proyecto.

### 3b. Guardarla en GitHub

**Ir a:** https://github.com/offlineteamoe/calendar-plan/settings/variables/actions

**New repository variable** → Name: `VITE_GOOGLE_TRANSLATE_KEY` → Value: la
clave → **Add variable**.

### 3c. Añadir una línea al archivo de despliegue

El token disponible no tiene permiso para modificar workflows, así que esto se
hace desde la web.

**Ir a:** https://github.com/offlineteamoe/calendar-plan/edit/main/.github/workflows/deploy.yml

Debajo de la última línea `VITE_FIREBASE_APP_ID: …`, con la misma sangría:

```yaml
          VITE_GOOGLE_TRANSLATE_KEY: ${{ vars.VITE_GOOGLE_TRANSLATE_KEY }}
```

**Commit directly to the main branch.** Ese commit dispara el despliegue solo.

---

## Paso 4 — Miembros del proyecto *(mantenimiento)*

Para que la herramienta no dependa de una sola cuenta.

**Ir a:** https://console.firebase.google.com/project/offline-planning/settings/iam

Estado actual: `am@openenglish.com`, `william.fonseca@openenglish.com` y
`cesar.hernandez@openenglish.com` son propietarios.

> Ser miembro del proyecto (tocar reglas, ver la base) y ser administrador de
> la herramienta (editar el plan) son cosas distintas.

---

## Paso 5 — Autorizar el sitio para leer Drive *(pestaña Resultados)*

**Hace falta una sola vez.** Sin esto, la pestaña Resultados dirá que no puede
conectar con Drive; el resto de la aplicación no se ve afectada.

Los resultados reales viven en una carpeta compartida de Drive, no en Firestore
(ver [`DATOS-DE-RESULTADOS.md`](DATOS-DE-RESULTADOS.md)). Para leerlos, el
navegador pide un permiso a Google en nombre de quien entra, y Google solo
entrega ese permiso a sitios declarados de antemano.

**1.** Abre las credenciales del proyecto de Google Cloud donde vive el cliente
de OAuth que usa el equipo:

```
https://console.cloud.google.com/apis/credentials
```

**2.** Entra en el cliente de tipo *ID de cliente de OAuth 2.0* que termina en
`...dcs35ujfvbqg42lotiln2ndmouq53r9n`.

**3.** En **Orígenes autorizados de JavaScript**, pulsa *Añadir URI* y pega:

```
https://offlineteamoe.github.io
```

Si vas a probar en tu equipo, añade también `http://localhost:5173`.

**4.** **Guardar.** Google tarda unos minutos en propagarlo.

> **Alternativa:** si prefieres no tocar ese cliente, crea uno nuevo en el
> proyecto `offline-planning` (tipo *Aplicación web*, con esos mismos orígenes)
> y pon su ID en la variable `VITE_GOOGLE_CLIENT_ID`. El código funciona igual
> con cualquiera de los dos.

**5.** La primera vez que alguien abra la pestaña Resultados, Google le pedirá
permiso para leer Drive. Es una vez por persona.

**6.** Esa persona necesita tener **compartida la carpeta** donde está
`calendar-results.json`. Ese permiso de Drive es el control real: quien no lo
tenga verá un error de acceso aunque haya iniciado sesión.

---

## Paso 6 — Si el registro de actividad pide un índice

La pantalla `#/logs` es la **única** de toda la aplicación que puede pedir un
índice de Firestore, porque lee los cambios de todos los meses de una vez.

Si al abrirla aparece un error que menciona *"The query requires an index"*,
ese mismo mensaje trae un enlace directo: ábrelo, pulsa **Crear índice** y
espera un par de minutos. No hay nada que escribir.

El resto de la aplicación está escrito a propósito para no necesitar ningún
índice.

---

## Comprobación final

| Qué probar | Qué debería pasar |
|---|---|
| Entrar con tu cuenta | Ves "+ Nuevo mes" y puedes editar las casillas |
| Entrar con otra cuenta del dominio | Etiqueta `SOLO CONSULTA`, sin botón de nuevo mes, casillas de solo lectura |
| Esa cuenta, pestaña Notas | Solo puede elegir "Observaciones a considerar" (fucsia) |
| Tu cuenta, pestaña Notas | Ves esa observación junto a las demás |
| Cambiar un calendario de aprobado a maybe | La otra persona lo ve cambiar **sin recargar** |
| Crear o borrar una nota | Aparece o desaparece al instante en la otra sesión |
| Cambiar de marca o de región | Cambia el juego de versiones |
| La campanita del encabezado | Solo la ven los administradores; explica cada acción en palabras |
| Perfil → Registro de actividad | Solo aparece si tu cuenta es administradora |
| Escribir una nota en español y pasar a inglés | Con el paso 3 hecho, aparece traducida a los pocos segundos |
| Dos personas en el mismo mes | Cada una ve el avatar de la otra |
| Pestaña Resultados, subpestaña WOW | Cada semana muestra leads, Media Spend, CPL, conversión, %MNCC y Full CM % Short con su variación |
| Apagar días en `L M M J V S D` | Las cifras cambian en **los dos** periodos comparados |
| Semana en curso | Avisa "Semana parcial: N de 7 días cerrados" |
| Semana futura del mes | Dice "Sin datos", no ceros |
| Botón Actualizar | Vuelve a comprobar Drive; si no hay nada nuevo, no descarga nada |
