---
phase: 3
plan: 2
wave: 1
---

# Plan 3.2: Menu Handler Functions (Send, Test, Preview, Draft)

## Objective
Implement the 5 menu handler functions that wire the template system to user actions: mass send, test email, HTML preview, draft creation, and config display.

## Context
- src/Core.gs — `sendBatch`, `sendEmail`, `buildEmailLayout`, `confirmAction`, `showAlert`, `showResult`, `mapHeaders`, `ensureColumn`, `batchUpdateColumn`, `getActiveSheet`
- src/Templates.gs — `getTemplate`, `listTemplates`
- src/Main.gs (from Plan 3.1 — `_getConfig`, `_getSelectedTemplate`, stubs exist)

## Tasks

<task type="auto">
  <name>Implement menuSendEmails and menuCreateDrafts</name>
  <files>src/Main.gs</files>
  <action>
    Replace the stubs for `menuSendEmails` and `menuCreateDrafts` with full implementations:

    1. **`_executeBatch(asDraft)`** — Shared internal function that handles both sending and drafting:
       - Gets template and config via `_getSelectedTemplate()`
       - Gets active sheet and maps headers with `mapHeaders()`
       - Validates required headers from template definition
       - Confirms action with user via `confirmAction()`
       - Ensures status column exists with `ensureColumn()`
       - Reads all data rows
       - Uses `sendBatch()` from Core.gs with a `processFn` that:
         - Skips rows already marked as sent/drafted (checks status column)
         - Calls `template.processRow(row, headers, rowIndex)` to get data
         - Calls `template.buildHtml(data)` to get inner HTML content
         - Wraps content with `buildEmailLayout()` using template's headerTitle, footerLines, etc.
         - Handles special case where `buildHtml` returns an object with `{content, alertBand}` (payment_reminder)
         - Returns the email options for `sendBatch`
       - After batch: writes statuses with `batchUpdateColumn()`
       - Shows results with `showResult()`
       - Options: `{ senderName, senderAlias, asDraft, cc, bcc, sleepEvery: 20, sleepMs: 1000 }`

    2. **`menuSendEmails()`** — Calls `_executeBatch(false)`.
    3. **`menuCreateDrafts()`** — Calls `_executeBatch(true)`.

    Critical: The `processFn` must handle `report_delivery` template's special case where `processRow` returns `to` and `cc` overrides from directory lookup (not from row headers).
  </action>
  <verify>
    Open `src/Main.gs` and verify:
    - `_executeBatch` uses `sendBatch` with correct processFn
    - Status column is ensured before processing
    - Rows are skipped if already processed
    - `menuSendEmails` and `menuCreateDrafts` correctly delegate
    - Payment reminder alertBand is handled
  </verify>
  <done>Mass send and draft creation fully functional via menu</done>
</task>

<task type="auto">
  <name>Implement menuSendTest, menuPreview, and menuShowConfig</name>
  <files>src/Main.gs</files>
  <action>
    Replace the stubs for `menuSendTest`, `menuPreview`, and `menuShowConfig`:

    1. **`menuSendTest()`**:
       - Gets template and config
       - Gets first non-header row from active sheet
       - Processes that row with `template.processRow()`
       - Builds HTML with `template.buildHtml(data)` and wraps with `buildEmailLayout()`
       - Sends a single test email to the active user's email (`Session.getActiveUser().getEmail()`)
       - Uses `sendEmail()` with the active user's address as recipient
       - Shows success/error alert

    2. **`menuPreview()`**:
       - Gets template and config
       - Gets first non-header row from active sheet
       - Processes that row with `template.processRow()`
       - Builds full HTML with `buildEmailLayout()`
       - Uses `SpreadsheetApp.getUi().showModalDialog()` to display the rendered HTML in a dialog window (800x600)
       - This gives a real visual preview of the email

    3. **`menuShowConfig()`**:
       - Calls `_getConfig()`
       - Gets the resolved template via `_getSelectedTemplate()`
       - Displays a summary dialog:
         - Template ID and name
         - Sender name and alias (if set)
         - CC/BCC (if set)
         - Required headers from template
         - Extra config values
       - Uses `showAlert()` from Core.gs
  </action>
  <verify>
    Open `src/Main.gs` and verify:
    - `menuSendTest` sends to the active user's email
    - `menuPreview` opens a modal dialog with rendered HTML
    - `menuShowConfig` displays human-readable config summary
    - All functions handle errors gracefully (try/catch with showAlert)
  </verify>
  <done>Test, preview, and config display functions fully implemented</done>
</task>

## Success Criteria
- [ ] `menuSendEmails` and `menuCreateDrafts` use shared `_executeBatch`
- [ ] `menuSendTest` sends to active user's email
- [ ] `menuPreview` renders HTML in a modal dialog
- [ ] `menuShowConfig` shows human-readable config
- [ ] All 5 menu actions are fully implemented (no more stubs)
