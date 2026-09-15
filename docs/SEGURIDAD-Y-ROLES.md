# Seguridad y roles

## El principio

**La interfaz no protege nada.** Un botón oculto o deshabilitado es una
cortesía visual: cualquiera puede abrir la consola del navegador y escribir en
Firestore directamente. La restricción real vive en `firestore.rules`, que se
evalúa en el servidor de Google en cada lectura y cada escritura.

Todo lo que dice este documento está implementado ahí. Si algo del archivo de
reglas contradice este texto, **manda el archivo**.

## Dos capas independientes

```
1. ¿Quién puede entrar?      → Firebase Authentication + dominio del correo
2. ¿Qué puede hacer dentro?  → Rol (administrador / consulta) en firestore.rules
```

Son independientes: entrar no da permiso a nada, solo identifica.

## Capa 1 — Quién entra

Acceso con Google en un clic (`signInWithGoogle` en
`src/lib/firebaseClient.ts`). Firebase mantiene la sesión entre visitas.

El dominio se valida en dos sitios:

- **En el cliente** (`isAllowedDomainEmail`), para mostrar un mensaje claro si
  alguien entra con una cuenta personal.
- **En las reglas** (`isOeUser()`), que es lo que de verdad bloquea.

```
request.auth.token.email.matches('.*@([a-zA-Z0-9-]+[.])*openenglish[.]com$')
```

Acepta `openenglish.com` **y sus subdominios** — hay cuentas en
`@business.openenglish.com`. Exige el punto separador a propósito, para que
`notopenenglish.com` no cuele.

> Nunca basta con `request.auth != null`: cualquier cuenta de Google del mundo
> puede autenticarse contra un proyecto de Firebase. El dominio se comprueba en
> **cada** regla.

## Capa 2 — Qué puede hacer

### Quién es administrador

**El documento `config/roles`** en Firestore, con un campo `admins` (array de
correos). Es la lista viva: cambiarla no requiere volver a desplegar.

La lista de arranque —las tres cuentas fundadoras— existe **solo en
`firestore.rules`**, que vive en Firebase y nunca se descarga al navegador. No
está en el código por una razón concreta: el JavaScript que sirve GitHub Pages
lo puede leer cualquiera, y tener ahí los correos del equipo era publicar en
internet a qué tres cuentas atacar.

**Arranque en frío, sin pasos manuales.** Si `config/roles` no existe o no
incluye a quien entra, la aplicación intenta añadirlo. Las reglas solo lo
permiten a las cuentas de arranque, así que el sistema se configura solo la
primera vez que entra cada administrador, y para el resto del equipo el intento
se rechaza sin consecuencias.

Si alguien borrase `config/roles`, las tres cuentas de arranque volverían a
registrarse solas al entrar. El respaldo sigue existiendo; ahora vive donde no
se puede leer desde fuera.

### Matriz de permisos

| Acción | Administrador | Consulta |
|---|---|---|
| Ver meses, calendarios, plan, notas, escenarios, resultados, creativos | ✅ | ✅ |
| Crear / eliminar un mes | ✅ | ❌ |
| Crear / renombrar / eliminar una versión | ✅ | ❌ |
| Aprobar o devolver a *maybe* un calendario | ✅ | ❌ |
| Editar la inversión del calendario | ✅ | ❌ |
| Crear escenarios, resultados, creativos | ✅ | ❌ |
| Crear notas de cualquier categoría | ✅ | ❌ |
| Crear notas de *Observaciones a considerar* | ✅ | ✅ (única que puede) |
| Editar una nota escrita por un administrador | ✅ | ❌ |
| Editar una nota de consulta | ❌ | ✅ solo su autor |
| Eliminar una nota | ✅ (cualquiera) | ✅ solo las suyas |
| Ver el historial de una nota | ✅ (cualquiera) | ✅ solo de las suyas |
| Ver la campanita de actividad del equipo | ✅ | ❌ |
| Ver el registro completo (`#/logs`) | ✅ | ❌ |
| Ver su propio historial y deshacer lo suyo | ✅ | ✅ |

Dos asimetrías que parecen raras y son intencionadas:

- **Un administrador no puede editar una nota de consulta.** Puede borrarla,
  pero no reescribir en silencio lo que dijo otra persona. Borrar es visible;
  reescribir, no.
- **El historial es información de quien administra.** Quién hizo qué en el
  plan no es de consulta general. Cada quien ve su propio rastro.

### Cómo se protege la identidad de una nota

Editar una nota **no puede** cambiar `note_id`, `created_by`, `created_at` ni
`created_by_role`. La regla `identityKept()` lo exige. Sin eso, el historial
por nota sería decorativo: bastaría reescribir el autor para falsearlo.

### El registro de cambios es inmutable

`months/{mes}/changes` acepta **crear** (cualquiera del dominio, porque las
observaciones también dejan rastro) pero nunca **editar ni borrar**:

```
allow read: if isAdmin() || (isOeUser() && resource.data.user_email == email());
allow create: if isOeUser();
allow update, delete: if false;
```

Es la memoria de por qué el plan quedó como quedó. Si se pudiera editar, no
serviría para nada.

## La contraseña de borrado

Vive en el documento **`config/secrets`** de Firestore, que las reglas solo
dejan leer a los administradores. **No está en el código**: antes era una
constante, lo que significaba que viajaba dentro del JavaScript y cualquiera en
internet podía leerla.

La primera vez que un administrador intenta borrar algo y no hay contraseña
configurada, el propio modal le deja definirla. No hace falta ir a la consola
de Firebase a crear el documento a mano.

**Sigue sin ser una credencial de acceso ni sustituye a las reglas.** Lo que
impide borrar es el rol, impuesto por el servidor. Esto es fricción deliberada
para que borrar algo grande no sea nunca un clic accidental — pero ahora la
fricción es real para todos, no solo para quien no sepa abrir el código.

Se pide para eliminar un mes, eliminar una versión, y los borrados masivos de
notas. Está en un único componente compartido a propósito: repetir la
comprobación en cada pantalla era la forma segura de que un día dejaran de
coincidir.

## Qué NO protege este sistema

Conviene ser explícito:

- **No hay copias de seguridad.** El plan gratuito de Firebase no las incluye.
  Si un administrador borra un mes, Google no lo puede devolver. Lo contienen
  la restricción de rol, la confirmación con contraseña y el registro en
  `months/_global/changes` — pero ninguna de las tres es un respaldo.
- **No protege de un administrador.** Las tres cuentas pueden borrar
  cualquier cosa. Es una decisión de confianza, no un descuido.
- **La configuración de Firebase es pública.** Viaja dentro del JavaScript que
  descarga el navegador; siempre fue así y está diseñada para eso. Lo que
  protege los datos son las reglas y la lista de dominios autorizados, no
  esconder una clave de API.
- **Todo el JavaScript es legible.** Minificar u ofuscar no es seguridad. Por
  eso el código no contiene ningún dato: solo la forma de pedirlo. Quien lo
  descargue sin sesión encuentra nombres de colecciones y textos de interfaz,
  y nada más.
- **No se puede impedir que alguien vea lo que su propia sesión descarga.** Si
  una persona puede ver las notas en pantalla, puede verlas en las herramientas
  de desarrollo. La protección es por identidad, nunca por pantalla.

## Publicar cambios en las reglas

Las reglas viven en `firestore.rules` dentro del repositorio, pero **el
repositorio no las despliega**. Hay que publicarlas a mano en la consola de
Firebase — ver [PASOS-MANUALES.md](PASOS-MANUALES.md), paso 1.

Un cambio en ese archivo no tiene ningún efecto hasta que alguien lo publica.
Es la causa más probable de un "esto debería funcionar y no funciona".
