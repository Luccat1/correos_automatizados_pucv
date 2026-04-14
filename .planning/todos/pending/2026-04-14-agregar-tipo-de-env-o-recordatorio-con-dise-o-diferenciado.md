---
created: 2026-04-14T21:32:54.879Z
title: Agregar tipo de envío recordatorio con diseño diferenciado
area: general
files:
  - src/Templates.gs
  - src/Main.gs
---

## Problem

El sistema actualmente solo contempla envíos "iniciales" (primer contacto con el destinatario). Sin embargo, en flujos reales de comunicación institucional —como encuestas, certificados o informes— es común necesitar enviar recordatorios a quienes aún no han respondido o completado una acción. Estos recordatorios deben verse visualmente distintos al correo inicial para que el destinatario los reconozca como un seguimiento, no como un duplicado del mismo mensaje.

## Solution

Agregar soporte para un tipo de envío `recordatorio` en el sistema de plantillas:

1. **Configuración**: Añadir un campo `send_type` (o similar) en el Config sheet con valores `inicial` / `recordatorio`.
2. **Plantillas**: En `processRow` o `buildHtml`, detectar el tipo y ajustar:
   - Título del correo (ej. "Recordatorio: [asunto original]" o estilo visual distinto)
   - Cuerpo del correo con tono más urgente / de seguimiento ("Te recordamos que aún no has...")
   - Franja de alerta (`alertBand`) diferente en color o texto para indicar visualmente que es un recordatorio
   - Botón con texto diferente (ej. "Completar ahora" en vez de "Acceder")
3. **UX**: Idealmente el usuario elige el tipo desde el `SendDialog.html` antes del envío, o desde la Config sheet.

Debe ser marcadamente diferente en apariencia y tono al correo inicial para evitar confusión.
