---
created: 2026-04-14T16:42:22.887Z
title: Alinear flujo de prueba con envio real incluyendo SendDialog
area: general
files:
  - src/Main.gs
  - src/SendDialog.html
---

## Problem

El flujo de prueba (`menuSendTest` / "🧪 Enviar Prueba") no abre el `SendDialog.html` antes de enviar. Ese diálogo es donde el usuario configura asunto, CC, BCC y notas adicionales para el envío real. Al saltarse ese paso en las pruebas, el test no refleja el comportamiento real: puede pasar un test con valores por defecto pero fallar en producción porque el usuario introduce un asunto, CC o extra_note distintos.

Esto genera una falsa sensación de seguridad: el test "pasó" pero no ejercitó el mismo código path que el envío real.

## Solution

Hacer que el flujo de prueba pase por el mismo `SendDialog` que el envío real, con una indicación visual clara de que es un test (ej. banner "MODO PRUEBA — solo se enviará a tu correo"). Las opciones de diseño:

1. **Opción A (recomendada):** Reutilizar `SendDialog` tal cual, añadir un campo oculto `is_test: true` que `executeBatchFromDialog` interpreta para enviar solo a la fila 1 y al correo del remitente.
2. **Opción B:** Crear un `TestDialog` simplificado que replica los mismos campos pero con el banner de modo prueba.

El objetivo es que el test sea un subconjunto del envío real, no un camino distinto.
