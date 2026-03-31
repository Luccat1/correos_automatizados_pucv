---
created: 2026-03-31T21:55:06.356Z
title: Mejorar manejo de errores en batch y UX de confirmacion
area: general
files:
  - src/Main.gs:418-422
  - src/Main.gs:343-348
  - src/Main.gs:306-315
---

## Problem

Dos problemas relacionados con feedback al usuario durante el batch:

1. **Error silenciado en `processFn` (`Main.gs:418-422`):**
   Cuando `processRow` lanza una excepción, el `catch` retorna `null`. Al retornar `null`, `sendBatch` registra la fila como `"SALTADO"`. El usuario en la hoja no puede distinguir "esta fila fue omitida intencionalmente por la plantilla" (ej: fila ya enviada, datos incompletos decididos por la plantilla) de "esta fila falló con un error inesperado". Esto dificulta el debugging. Solución: `processFn` debería retornar un objeto especial `{ _error: true, message: e.message }` que `sendBatch` (o el propio `processFn`) registre como `"ERROR: ..."` en la columna de estado.

2. **Sin indicación de cuántas filas se procesarán en flujo de menú directo (`Main.gs:343-348`):**
   Cuando el usuario llama `menuSendEmails` sin pasar por el `SendDialog`, la confirmación dice "¿Está seguro que desea enviar correos masivos usando la plantilla X?" pero no dice cuántas filas pendientes hay. El dialog ya muestra este dato (`rowCount`), pero el flujo directo no. Solución: calcular filas pendientes (con el mismo filtro de status que usa `processFn`) antes de mostrar la confirmación e incluirlo en el mensaje.

3. **No hay "reintentar solo errores":**
   Para reenviar filas con `ERROR:` en la columna de estado, el usuario debe borrar manualmente esas celdas o el estado completo. Solución: agregar opción `🔁 Reintentar Errores` en el submenú de Envío, que limpia únicamente las celdas con status `ERROR:` antes de ejecutar el batch.

## Solution

- Modificar `processFn` en `_executeBatch`: en el catch, distinguir el error lanzando un status explícito en lugar de retornar null
- Alternativamente: que `processFn` pueda retornar `{ _skip: true }` vs `{ _error: true, message }` para que `sendBatch` los trate diferente
- En `_executeBatch` sin overrides: contar filas con status vacío/error antes del confirm y agregar "(~N filas pendientes)" al mensaje
- Agregar `menuRetryErrors()` que filtre y limpie statuses `ERROR:*` de la columna de estado antes de llamar `_executeBatch`
- Agregar `{ label: '🔁 Reintentar Errores', functionName: 'menuRetryErrors' }` en el submenú Envío de `onOpen`
