# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sistema de Memoria Persistente

Al **inicio de cada sesión**, lee los siguientes archivos para recuperar el contexto acumulado:

- `memory/user.md` — perfil y contexto del usuario
- `memory/preferences.md` — convenciones de código y preferencias acordadas
- `memory/decisions.md` — decisiones de arquitectura tomadas
- `memory/people.md` — personas y roles relevantes

Al **final de cada sesión** (o cuando se aprenda algo relevante), actualiza los archivos correspondientes:

- Si el usuario corrige tu enfoque → actualiza `memory/preferences.md`
- Si se toma una decisión de diseño → actualiza `memory/decisions.md`
- Si aprendes algo nuevo sobre el usuario → actualiza `memory/user.md`
- Si se menciona a alguien nuevo → actualiza `memory/people.md`

## What This Project Is

A Google Apps Script (GAS) system for sending institutional emails at PUCV (Pontificia Universidad Católica de Valparaíso). It runs **bound to a Google Spreadsheet** — there is no build, compile, or local test step. All code executes inside Google's cloud runtime.

## Deployment

This project has no package manager or build tool. To deploy:

1. Open a Google Spreadsheet → **Extensiones > Apps Script**
2. Create three `.gs` files and one `.html` file, copying the source from `src/`:
   - `Core.gs`, `Templates.gs`, `Main.gs`, `TemplateSelector.html`, `SendDialog.html`
3. Reload the spreadsheet — the `onOpen()` trigger creates the `📧 Correos PUCV` menu automatically

To test a change, copy the modified file content into the Apps Script editor and use the menu options:

- **🧪 Enviar Prueba** — sends the first data row to your own email
- **👁 Vista Previa** — renders the HTML in a modal without sending

## Architecture

The system has three layers:

### `Core.gs` — Engine

Generic, template-agnostic utilities. Key functions:

- `sendEmail(options)` / `sendBatch(rows, processFn, options)` — email dispatch with quota protection and throttling (sleeps every 20 emails)
- `buildEmailLayout(options)` — master HTML renderer with PUCV institutional branding
- `buildButton()`, `buildInfoBox()`, `buildWarningBox()` — reusable HTML component builders
- `mapHeaders(sheet)` — returns `{ lowercase_header: 0-based-index }` map used throughout
- `requiredCell()` / `safeCell()` — row data extractors; `requiredCell` throws a localized error if the cell is empty
- `shareFileAsViewer(fileId, email)` — Google Drive sharing used by certificate/report templates

### `Templates.gs` — Template Registry

Defines email templates and registers them into `_REGISTRY`. Each template is a plain object with:

- `id`, `name`, `description` — metadata
- `requiredHeaders` — column names the data sheet must have (lowercased for `mapHeaders`)
- `statusColumn` — name of the tracking column (auto-created if missing via `ensureColumn`)
- `configKeys` — extra keys users can set in the Config sheet under `extras`
- `senderName`, `senderAlias`, `headerTitle`, `footerLines` — branding defaults
- `processRow(row, headers, rowIndex, extraData)` — extracts data from a sheet row; returns a data object or `null` to skip the row
- `buildHtml(data)` — returns either a raw HTML string or `{ content, alertBand, extraNote }` for special layouts

Registry API: `registerTemplate(obj)`, `getTemplate(id)`, `listTemplates()`.

### `Main.gs` — UI & Orchestration

Handles the spreadsheet menu, modal dialogs, and batch execution. Key flow:

1. `_getConfig()` reads the **"Config"** sheet (key-value pairs) into a config object
2. `_getSelectedTemplate()` resolves the `template_id` config key to a registered template
3. `_executeBatch(asDraft, overrides)` iterates data rows, calls `template.processRow()` + `template.buildHtml()` + `buildEmailLayout()`, then dispatches via `sendBatch()`
4. Status column is batch-written after the run with `batchUpdateColumn()`

The `report_delivery` template has a special code path in `_executeBatch` that pre-loads a "Directorio" sheet and passes it as `extraData.directoryRows`.

### HTML Dialogs

- `TemplateSelector.html` — GAS templated HTML (`<?= ?>`) that renders template cards; calls `setupTemplateFromDialog(templateId)` server-side to generate Config + data sheets
- `SendDialog.html` — pre-send form that collects subject, CC/BCC, and extra note overrides; calls `executeBatchFromDialog(formData)` server-side

## Adding a New Template

1. Define an object in `src/Templates.gs` with at minimum: `id`, `name`, `requiredHeaders`, `processRow`, `buildHtml`
2. Call `registerTemplate(myTemplate)` at the bottom of the file
3. The template automatically appears in the selector dialog and all menu operations

## Google Apps Script Constraints

- No `import`/`require` — all `.gs` files share a single global scope
- No `let` at module level for variables that persist across calls (use `const` or `var`); GAS re-executes all files per request
- `_ALIASES_CACHE` in Core.gs is a module-level `let` used as a per-execution cache (valid within one trigger call)
- Gmail daily quota: `MailApp.getRemainingDailyQuota()` is checked before each send; batch stops if < 5 remaining
- `Utilities.sleep()` is used for throttling — do not replace with `setTimeout`
