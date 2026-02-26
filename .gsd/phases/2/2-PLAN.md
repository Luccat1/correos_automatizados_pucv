---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: Confirmation & Payment Reminder Templates

## Objective
Add the `confirmation` and `payment_reminder` templates to `Templates.gs`. These are closely related — both deal with course enrollment data and payment information, and share column patterns (nombre, correo, idioma, nivel). Implementing them together ensures consistency.

## Context
- src/Core.gs
- src/Templates.gs (from Plan 2.1 — registry exists)
- Reference scripts: `ConfirmationEmail`, `PaymentReminder.js`

## Tasks

<task type="auto">
  <name>Add confirmation template</name>
  <files>src/Templates.gs</files>
  <action>
    Add the `confirmation` template to `Templates.gs`:

    1. **`processRow(row, headers, rowIndex)`**:
       - Reads: nombre, correo, idioma, nivel, horario, plazo (optional deadline), es_continuacion (optional)
       - Determines CC based on idioma (configurable mapping, not hardcoded)
       - Returns `{ nombre, correo, idioma, nivel, horario, plazo, esContinuacion, firstName, cc }` or null if already sent

    2. **`buildHtml(data)`**:
       - Greeting with first name
       - Congratulations on course opening
       - Info box with course details (idioma, nivel, horario)
       - Payment instructions section with deadline (from `data.plazo` or default)
       - Button to payment portal ("Ir al Portal de Pagos")
       - Optional discount code area (if `data.discountCode` exists)
       - Uses `buildButton()`, `buildInfoBox()` from Core.gs

    3. **Config fields**:
       - `id: 'confirmation'`
       - `name: 'Confirmación de Apertura'`
       - `requiredHeaders: ['nombre', 'correo', 'idioma', 'nivel', 'horario']`
       - `senderName: 'Programa Idiomas PUCV'`
       - `statusColumn: 'Estado'`
       - `headerTitle: 'CONFIRMACIÓN DE APERTURA DE CURSO'`
       - `footerLines: ['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV']`

    Do NOT hardcode discount codes or CC emails — these should be configurable via a `config` object that can be set per-sheet. The template definition should include a `defaults` field where these can be overridden.
  </action>
  <verify>
    Open `src/Templates.gs` and verify:
    - `getTemplate('confirmation')` returns the template
    - `processRow` reads all expected columns
    - `buildHtml` includes course details, payment section, and button
    - No hardcoded discount codes or CC emails
  </verify>
  <done>Confirmation template registered with configurable CC and discount code support</done>
</task>

<task type="auto">
  <name>Add payment_reminder template</name>
  <files>src/Templates.gs</files>
  <action>
    Add the `payment_reminder` template to `Templates.gs`:

    1. **`processRow(row, headers, rowIndex)`**:
       - Reads: nombre, correo, idioma, nivel
       - Returns `{ nombre, correo, idioma, nivel, firstName }` or null if already sent
       - Uses a separate status column ('Estado Recordatorio') to avoid conflicts with confirmation emails

    2. **`buildHtml(data)`**:
       - Greeting with first name
       - **Alert band** with urgency message (uses `alertBand` option in `buildEmailLayout`)
       - Clear deadline message with bold formatting
       - Payment options section:
         - Webpay link (button)
         - In-person payment instructions
         - Instructions to request a new code if needed
       - Contact information
       - Uses `buildButton()`, `buildWarningBox()` from Core.gs

    3. **Config fields**:
       - `id: 'payment_reminder'`
       - `name: 'Recordatorio de Pago'`
       - `requiredHeaders: ['nombre', 'correo']`
       - `senderName: 'Programa Idiomas PUCV'`
       - `statusColumn: 'Estado Recordatorio'`
       - `headerTitle: 'RECORDATORIO DE PAGO'`
       - `footerLines: ['Programa Idiomas PUCV', 'PUCV']`

    Deadline text and payment URL should come from a configurable `defaults` field, not hardcoded.
  </action>
  <verify>
    Open `src/Templates.gs` and verify:
    - `getTemplate('payment_reminder')` returns the template
    - Uses separate status column from confirmation
    - `buildHtml` uses alertBand for urgency
    - Deadline and payment URL are configurable
  </verify>
  <done>Payment reminder template registered with urgency styling and configurable deadline</done>
</task>

## Success Criteria
- [ ] Confirmation template registered with CC/discount support
- [ ] Payment reminder template registered with urgency styling
- [ ] Both use separate status columns
- [ ] No hardcoded values (CCs, discount codes, deadlines, payment URLs)
