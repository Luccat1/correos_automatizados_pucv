# Preferencias del Proyecto

Convenciones de código, estilo, y preferencias de trabajo acordadas para este repositorio.

---

## Idioma y Nomenclatura

- El código (variables, funciones) está en **inglés**
- Los mensajes al usuario (alerts, menú, UI) están en **español**
- Los comentarios JSDoc están en **inglés**
- Las columnas de datos en hojas de cálculo usan **snake_case en minúsculas** (ej: `estado_envio`, `sender_name`)

## Estilo de Código (Google Apps Script)

- Usar `const` para objetos y arrays que no se reasignan
- Usar `let` solo cuando la variable cambia de valor
- Funciones privadas llevan prefijo `_` (ej: `_getConfig()`)
- Funciones de registro en `_REGISTRY` son privadas al módulo de plantillas

## Plantillas

- Toda nueva plantilla va en `src/Templates.gs` y se registra con `registerTemplate()`
- `processRow` debe retornar `null` (no lanzar excepción) para filas que deben saltarse silenciosamente
- `buildHtml` puede retornar string puro o `{ content, alertBand, extraNote }` si necesita bandas de alerta

<!-- Añadir preferencias adicionales aquí -->
