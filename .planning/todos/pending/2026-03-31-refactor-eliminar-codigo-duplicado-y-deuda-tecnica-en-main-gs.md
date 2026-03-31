---
created: 2026-03-31T21:55:06.356Z
title: Refactor eliminar codigo duplicado y deuda tecnica en Main.gs
area: general
files:
  - src/Main.gs:102-300
  - src/Main.gs:360-366
  - src/Templates.gs:20-25
  - src/Core.gs:154-160
---

## Problem

Hay cuatro focos de deuda técnica acumulada en el codebase:

1. **Código duplicado crítico — `menuPreview` vs `menuSendTest` (`Main.gs:102-300`):**
   Ambas funciones tienen ~30 líneas idénticas: cargar rows, llamar `prepareExtraData`, escanear el primer row procesable, construir el HTML. Si se cambia la lógica en una, hay que recordar cambiarla en la otra — fuente probable de bugs futuros. Solución: extraer a `_buildPreviewHtml(template, config)` o similar.

2. **Legacy hardcodeado en `_executeBatch` (`Main.gs:360-366`):**
   Existe un bloque especial `if (template.id === 'report_delivery')` que carga la hoja "Directorio" y la pasa como `extraData.directoryRows`. El propio comentario en el código reconoce que esto es un workaround pre-`prepareExtraData`. Rompe la abstracción: `_executeBatch` no debería conocer IDs de plantillas específicas. Solución: migrar `report_delivery` para implementar el hook `prepareExtraData` y eliminar el bloque especial.

3. **Validación incompleta en `registerTemplate` (`Templates.gs:20-25`):**
   La función valida `id`, `name`, `buildHtml`, `processRow` pero no `requiredHeaders`. Una plantilla que omita ese campo no falla al registrarse — falla más tarde en `_executeBatch` con un error confuso. Solución: agregar `requiredHeaders` (o al menos array vacío default) a la validación.

4. **`parseEmailList` inconsistente con `isValidEmail` (`Core.gs:154-160`):**
   `parseEmailList` filtra con `e.includes("@")` — validación débil que acepta strings inválidos. `isValidEmail` usa una regex más robusta. Deberían ser coherentes: `parseEmailList` debería usar `isValidEmail` para filtrar.

## Solution

Fase A — Refactor Core Quality:
- Extraer helper `_buildFirstProcessableRow(template, config, sheet)` que encapsule: mapHeaders + validación + prepareExtraData + scan de primer row procesable + buildHtml
- Usar ese helper en `menuPreview`, `menuSendTest`
- Agregar `prepareExtraData` al objeto `report_delivery` template que cargue la hoja Directorio
- Eliminar el bloque `if (template.id === 'report_delivery')` de `_executeBatch`
- Agregar `requiredHeaders` a `registerTemplate` — lanzar error si no es array
- Cambiar filtro en `parseEmailList` de `e.includes("@")` a `isValidEmail(e)`
