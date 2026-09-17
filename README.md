# Offline Planning

Herramienta web de planificación de medios offline del equipo de Open English.
Reemplaza el Excel mensual manual (`Plan Sep 2026 - Proyecto Atribución.xlsm`).

Sin servidor propio: se publica como sitio estático en GitHub Pages y guarda
todo —plan, escenarios, notas, resultados, creativos, presencia y registro de
cambios— en **Firestore**. Gratuito, restringido al dominio `openenglish.com`
y sus subdominios, y sincronizado al instante entre todas las personas que
tengan el mes abierto.

- **Aplicación:** https://offlineteamoe.github.io/calendar-plan/
- **Repositorio:** https://github.com/offlineteamoe/calendar-plan
- **Firebase:** proyecto `offline-planning`

## Documentación

Toda en [`docs/`](docs/) — empieza por [`docs/README.md`](docs/README.md), que
es el índice.

| Documento | Para qué |
|---|---|
| [VISION-Y-ALCANCE](docs/VISION-Y-ALCANCE.md) | Qué problema resuelve y para quién |
| [ARQUITECTURA](docs/ARQUITECTURA.md) | Cómo está construido |
| [DATA-MODEL](docs/DATA-MODEL.md) | Dónde vive cada dato |
| [DATOS-DE-RESULTADOS](docs/DATOS-DE-RESULTADOS.md) | Las cifras reales de la pestaña Resultados |
| [SEGURIDAD-Y-ROLES](docs/SEGURIDAD-Y-ROLES.md) | Quién puede hacer qué |
| [INTERFAZ](docs/INTERFAZ.md) | Qué ve y hace cada persona |
| [OPERACION](docs/OPERACION.md) | Rutas, cuentas, despliegue, cuotas |
| [PASOS-MANUALES](docs/PASOS-MANUALES.md) | Lo que solo se hace a mano |
| [DECISIONES](docs/DECISIONES.md) | Por qué es así, y qué se descartó |
| [BITACORA](docs/BITACORA.md) | Qué pasó durante la construcción |
| [PENDIENTES](docs/PENDIENTES.md) | Qué falta |
| [GLOSARIO](docs/GLOSARIO.md) | Siglas del negocio y del código |

Para trabajar con Claude Code sobre este proyecto: [`CLAUDE.md`](CLAUDE.md).

## Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # comprobación + tsc + vite build
npm run lint
```

La configuración de Firebase está en `src/config.ts` como valores por defecto,
así que el proyecto compila recién clonado, sin configurar nada. Un `.env.local`
la sobreescribe si hace falta apuntar a otro proyecto (ver `.env.example`).

> **No lo pongas en la unidad `G:`** (Google Drive): `npm install` falla ahí
> por bloqueo de archivos.

## Portabilidad

Autocontenido a propósito: sin rutas absolutas, sin depender de dónde vive en
disco, y con `base: './'` en `vite.config.ts` para que el build funcione sea
cual sea el nombre del repositorio o la subcarpeta de GitHub Pages. Moverlo es
copiar la carpeta o hacer `git clone`.
