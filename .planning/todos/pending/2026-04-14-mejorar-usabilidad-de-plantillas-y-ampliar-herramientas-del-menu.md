---
created: 2026-04-14T16:40:23.281Z
title: Mejorar usabilidad de plantillas y ampliar herramientas del menu
area: general
files:
  - src/Templates.gs
  - src/Main.gs
---

## Problem

El sistema actualmente requiere conocimiento técnico para operar correctamente. Los usuarios no-técnicos (administrativos del Centro de Idiomas) pueden cometer errores al configurar la hoja Config, al interpretar los configKeys, o al no saber qué valores son válidos. Además, el menú `📧 Correos PUCV` ofrece un abanico limitado de acciones, sin recursos adicionales de apoyo (vista de configuración activa, validación previa, guías de uso, etc.).

## Solution

Dos líneas de mejora:

**1. Helpers de usabilidad para plantillas (code-friendly por defecto, no-code friendly en la práctica):**
- Validación descriptiva antes de envío: mostrar un resumen de la configuración activa (template, program_name, survey_type, etc.) en un modal de confirmación antes de ejecutar el batch
- Mensajes de error más claros cuando faltan columnas requeridas o config keys
- Posible función de "diagnóstico": leer la hoja activa y reportar qué está bien/mal antes de enviar
- Documentación in-sheet: agregar una hoja "Instrucciones" generada por el wizard con explicaciones de cada columna y config key

**2. Ampliar el menú con más herramientas:**
- Ver configuración activa (muestra los valores de la Config sheet en un modal)
- Diagnóstico de hoja (valida headers, config keys, y URLs antes de enviar)
- Guía de uso / ayuda contextual
- Previsualización masiva (renderizar N filas sin enviar)
- Posiblemente: exportar log de envíos, limpiar columna de estado
