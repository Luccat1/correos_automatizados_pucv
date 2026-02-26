---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Pre-Send HTML Dialog

## Objective
Create an HTML sidebar/modal dialog that appears before sending emails or creating drafts.
This dialog lets the user review and edit: **subject**, **extra note**, and **CC/BCC** — all pre-filled from Config but editable in real time.

## Context
- `.gsd/SPEC.md`
- `src/Main.gs` — `menuSendEmails`, `menuCreateDrafts`, `_executeBatch`
- `src/Core.gs` — `buildEmailLayout`, `showAlert`

## Tasks

<task type="auto">
  <name>Create SendDialog.html</name>
  <files>src/SendDialog.html</files>
  <action>
    Create a new HTML file `src/SendDialog.html` that:
    1. Renders a clean form with fields:
       - **Asunto** (text input, pre-filled with `template.headerTitle`)
       - **Nota adicional** (textarea, pre-filled from `config.extras.extra_note` or empty)
       - **CC** (text input, pre-filled from `config.cc`)
       - **BCC** (text input, pre-filled from `config.bcc`)
    2. Has two buttons: "Enviar Correos" / "Crear Borradores" (primary, label depends on mode) and "Cancelar"
    3. On submit calls `google.script.run.executeBatchFromDialog(formData)` passing the edited values
    4. On cancel calls `google.script.host.close()`
    5. Style it cleanly using the PUCV color palette (primary: #24588d, accent colors)
    6. Include a summary line showing template name and row count
    
    Use Google Apps Script's `HtmlService.createTemplateFromFile()` pattern for serving the dialog.
  </action>
  <verify>File `src/SendDialog.html` exists and contains a valid HTML form with the specified fields</verify>
  <done>SendDialog.html renders a form with subject, extra_note, CC, BCC fields and submit/cancel buttons</done>
</task>

<task type="auto">
  <name>Wire dialog into Main.gs send flow</name>
  <files>src/Main.gs</files>
  <action>
    1. Modify `menuSendEmails()` to call `_showSendDialog(false)` instead of `_executeBatch(false)`
    2. Modify `menuCreateDrafts()` to call `_showSendDialog(true)` instead of `_executeBatch(true)`
    3. Create `_showSendDialog(asDraft)`:
       - Reads config and template (same as current flow)
       - Validates required headers exist
       - Counts data rows
       - Creates HTML template from `SendDialog.html`
       - Passes initial values (subject, extraNote, cc, bcc, templateName, rowCount, asDraft) to the template
       - Shows as modal dialog (500x450)
    4. Create `executeBatchFromDialog(formData)`:
       - This is the server-side function called by the dialog
       - Receives `{ subject, extraNote, cc, bcc, asDraft }` from the dialog
       - Merges these overrides into the config/template defaults
       - Calls `_executeBatch(asDraft, overrides)` with the user's edits
    5. Update `_executeBatch` signature to accept optional `overrides` parameter:
       - If `overrides.subject`, use it instead of `template.headerTitle`
       - If `overrides.extraNote`, pass it through the pipeline
       - If `overrides.cc` / `overrides.bcc`, use them instead of config values
    
    AVOID: Breaking the existing direct-call flow. If `_executeBatch` is called without overrides, it must work exactly as before.
  </action>
  <verify>Functions `_showSendDialog`, `executeBatchFromDialog` exist in Main.gs. `menuSendEmails` calls `_showSendDialog(false)`.</verify>
  <done>Pre-send dialog appears when user clicks "Enviar Correos" or "Crear Borradores", with editable fields that feed into the batch pipeline</done>
</task>

## Success Criteria
- [ ] Clicking "📧 Enviar Correos" opens an HTML dialog instead of immediately sending
- [ ] Dialog shows pre-filled subject, extra note, CC, BCC
- [ ] User can edit values and submit, which triggers the actual batch send
- [ ] Cancelling the dialog aborts the send
- [ ] Direct batch flow still works for programmatic callers
