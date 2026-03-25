---
created: 2026-03-25T21:03:22.045Z
title: Añadir template anuncio inicio de clases con correos diferenciados
area: general
files: []
---

## Problem

Se necesita un nuevo template `class_start_announcement` que envíe correos de anuncio de inicio de clases. El mismo conjunto de datos (una sola hoja con estudiantes y el profesor) debe producir dos tipos de correo distintos según el destinatario:

**Correo a estudiantes:** confirmación de idioma, nivel, horario, sala y nombre + correo del profesor.

**Correo al profesor:** los mismos datos del curso (idioma, nivel, horario, sala) más una lista completa de los estudiantes inscritos.

La clave del diseño es que ambos envíos sean **independientes** — se puede elegir cuándo informar a cada grupo por separado (primero a profesores, luego a estudiantes, o viceversa).

## Solution

1. Definir un template en `src/Templates.gs` con `id: "class_start_announcement"`.
2. La hoja de datos tendrá columnas mixtas: una fila por estudiante con columnas de datos de curso, y una fila especial (o sección separada) para el profesor. Alternativamente, agregar una columna `tipo` (`estudiante` / `profesor`) para diferenciar.
3. `processRow()` filtra por `tipo` y retorna el objeto de datos correcto (o `null` para saltarse filas que no correspondan al envío actual).
4. `buildHtml()` renderiza el layout apropiado según el tipo de destinatario.
5. Registrar el template con `registerTemplate()`.
6. Considerar agregar dos entradas en el selector (una para enviar a estudiantes, otra para enviar al profesor) o usar un campo de configuración `target_group` en la hoja Config.
