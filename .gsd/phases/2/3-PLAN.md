---
phase: 2
plan: 3
wave: 2
---

# Plan 2.3: Placement Test & Code Delivery Templates

## Objective
Add the `placement_test` and `code_delivery` templates to `Templates.gs`. The placement test handles credential delivery (user/password), while code delivery is a generic template for sending unique codes (books, tests, etc.).

## Context
- src/Core.gs
- src/Templates.gs (from Plans 2.1-2.2 — registry + 3 templates exist)
- Reference scripts: `PlacementTest`, `script_envio`

## Tasks

<task type="auto">
  <name>Add placement_test template</name>
  <files>src/Templates.gs</files>
  <action>
    Add the `placement_test` template to `Templates.gs`:

    1. **`processRow(row, headers, rowIndex)`**:
       - Reads: nombre, correo, user id, password, institutional id (optional)
       - Returns `{ nombre, correo, userId, password, institutionId, firstName }` or null if already sent

    2. **`buildHtml(data)`**:
       - Greeting with first name
       - Instructions for accessing the placement test portal
       - Info box with credentials:
         - Platform URL (from config)
         - User ID
         - Password
         - Institution ID (if applicable)
       - Step-by-step instructions (numbered list)
       - Button to platform ("Acceder a la Plataforma")
       - Warning box about test deadline (if configured)
       - Uses `buildButton()`, `buildInfoBox()`, `buildWarningBox()` from Core.gs

    3. **Config fields**:
       - `id: 'placement_test'`
       - `name: 'Placement Test'`
       - `requiredHeaders: ['nombre', 'correo', 'user id', 'password']`
       - `senderName: 'Programa Idiomas PUCV'`
       - `statusColumn: 'Reminder Status'`
       - `headerTitle: 'PLACEMENT TEST - PROGRAMA IDIOMAS'`
       - `footerLines: ['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV']`

    Platform URL and deadline text should be in a configurable `defaults` field.
  </action>
  <verify>
    Open `src/Templates.gs` and verify:
    - `getTemplate('placement_test')` returns the template
    - `processRow` reads user id, password, institutional id
    - `buildHtml` shows credentials in an info box
    - Platform URL is configurable
  </verify>
  <done>Placement test template registered with credential display and configurable platform URL</done>
</task>

<task type="auto">
  <name>Add code_delivery template</name>
  <files>src/Templates.gs</files>
  <action>
    Add the `code_delivery` template to `Templates.gs`:

    1. **`processRow(row, headers, rowIndex)`**:
       - Reads: nombre, correo, codigo, tipo_opcional (optional — e.g. 'libro', 'prueba')
       - Returns `{ nombre, correo, codigo, tipo, firstName }` or null if already sent

    2. **`buildHtml(data)`**:
       - Greeting with first name
       - Message about the code delivery
       - Large, prominent code display (styled with background color and large font)
       - Info box with usage instructions (configurable per type)
       - Contact information for support
       - Uses `buildInfoBox()` from Core.gs

    3. **Config fields**:
       - `id: 'code_delivery'`
       - `name: 'Envío de Códigos'`
       - `requiredHeaders: ['nombre', 'correo', 'codigo']`
       - `senderName: 'Centro de Idiomas PUCV'`
       - `statusColumn: 'enviado'`
       - `headerTitle: 'ENTREGA DE CÓDIGO'`
       - `footerLines: ['Centro de Idiomas PUCV', 'PUCV']`

    The code display should be visually prominent — centered, large font, with a colored background box.
  </action>
  <verify>
    Open `src/Templates.gs` and verify:
    - `getTemplate('code_delivery')` returns the template
    - `processRow` reads codigo column
    - `buildHtml` displays code prominently
    - Handles optional tipo field
  </verify>
  <done>Code delivery template registered with prominent code display</done>
</task>

## Success Criteria
- [ ] Placement test template with credential info box
- [ ] Code delivery template with prominent code display
- [ ] Both templates are configurable (platform URL, code type)
- [ ] Both registered and retrievable via `getTemplate()`
