---
created: 2026-03-31T21:55:06.356Z
title: Sanitizar HTML en email builders para prevenir XSS
area: general
files:
  - src/Core.gs:437-472
  - src/Core.gs:372-428
---

## Problem

**XSS potencial en builders de HTML (`Core.gs:437-472`):**

`buildButton(text, url)`, `buildInfoBox(content)`, `buildWarningBox(content)` y `buildEmailLayout(options)` interpolan valores directamente en el HTML sin escapar caracteres especiales. Ejemplos:

```js
// Core.gs:441
`<a href="${url}" ...>${text}</a>`

// Core.gs:414
`<h1 ...>${headerTitle}</h1>`
```

Si `url`, `text`, `headerTitle` u otras opciones contienen caracteres como `<`, `>`, `"`, `&`, o scripts, el HTML del correo se verá corrupto o podría ejecutar scripts en clientes de correo que rendericen HTML sin sanitizar.

Los valores vienen de:
- La hoja "Config" (controlada por el usuario)
- El `SendDialog` (input del usuario)
- La hoja de datos (potencialmente importada de fuentes externas)

En contexto de correo institucional el riesgo principal es **corrupción de formato** (un `<` en un nombre rompe el HTML) más que ejecución de scripts. Pero es una buena práctica sanitizar.

## Solution

- Agregar función `escapeHtml(str)` en `Core.gs`:
  ```js
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  ```
- Aplicar `escapeHtml()` a todos los valores de texto interpolados en:
  - `buildButton(text, url)` — escapar `text`; para `url` validar que empiece con `https?://`
  - `buildInfoBox(content)` — escapar `content` (o documentar que acepta HTML seguro)
  - `buildWarningBox(content)` — ídem
  - `buildEmailLayout`: escapar `headerTitle`, `footerLines`, `alertBand`, `extraNote`
- Nota: `content` en `buildEmailLayout` es HTML construido por `buildHtml` de cada template — esos ya construyen HTML deliberadamente, no deben escaparse a nivel de layout. Solo escapar los metadatos de branding.
