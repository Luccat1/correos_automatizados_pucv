---
phase: 1
plan: 2
wave: 1
---

# Plan 1.2: Email Engine & Drive Sharing

## Objective
Build the email sending engine and Drive sharing helper in `Core.gs`. This layer handles the actual GmailApp interactions: sending emails, creating drafts, managing CC/BCC, using sender aliases, and sharing Drive files. Templates will call these functions passing their rendered HTML and config.

## Context
- .gsd/SPEC.md
- .gsd/DECISIONS.md
- src/Core.gs (from Plan 1.1)
- Current scripts for reference: `ConfirmationEmail` (draft mode), `PlacementTest` (quota handling), `Informe` (alias support, BCC)

## Tasks

<task type="auto">
  <name>Add email sending engine to Core.gs</name>
  <files>src/Core.gs</files>
  <action>
    Add the following email functions to `src/Core.gs`:

    1. `sendEmail(options)` — Main email dispatch function. Accepts an options object:
       ```
       {
         to: string,           // recipient
         subject: string,      // subject line
         htmlBody: string,     // rendered HTML
         plainBody: string,    // plain text fallback
         cc: string,           // comma-separated CC list
         bcc: string,          // comma-separated BCC list
         senderName: string,   // display name
         senderAlias: string,  // optional alias email (e.g. cele.dgai@pucv.cl)
         asDraft: boolean      // if true, create draft instead of sending
       }
       ```
       - If `asDraft` is true, uses `GmailApp.createDraft()`, otherwise `GmailApp.sendEmail()`
       - If `senderAlias` is provided and exists in `GmailApp.getAliases()`, sets `from` option
       - Returns object: `{ success: true, mode: 'sent'|'draft', timestamp: string }` or `{ success: false, error: string }`

    2. `_getAliasesCache()` — Private function. Caches `GmailApp.getAliases()` result to avoid repeated API calls. Uses module-level variable.

    3. `sendBatch(rows, processFn, options)` — Orchestrates batch sending:
       - `rows`: array of data rows
       - `processFn(row, index)`: callback that returns `{ to, subject, htmlBody, plainBody, cc, bcc }` or null (skip)
       - `options`: `{ senderName, senderAlias, asDraft, statusColIndex, sheet, sleepEvery, sleepMs, batchLimit }`
       - Iterates rows, calls processFn, calls sendEmail, builds status updates array
       - Respects `sleepEvery` / `sleepMs` throttling
       - Respects `batchLimit`
       - On quota errors, stops immediately and saves progress
       - Returns `{ processed: number, errors: number, statuses: string[][] }`

    All functions with JSDoc. Error handling must be robust — never lose progress on batch errors.
  </action>
  <verify>
    Open `src/Core.gs` and verify:
    - `sendEmail` function handles both send and draft modes
    - `sendBatch` has throttling, batch limit, and quota error handling
    - Alias caching is implemented
    - Return values are structured objects
  </verify>
  <done>Email engine with sendEmail + sendBatch + alias caching added to Core.gs</done>
</task>

<task type="auto">
  <name>Add Drive sharing helper to Core.gs</name>
  <files>src/Core.gs</files>
  <action>
    Add the following Drive function to `src/Core.gs`:

    1. `shareFileAsViewer(fileId, email)` — Shares a Google Drive file with the given email as viewer.
       - Uses `DriveApp.getFileById(fileId).addViewer(email)`
       - Catches and logs errors (does not throw — non-blocking)
       - Returns `{ success: boolean, error?: string }`

    2. `shareFileWithMultiple(fileId, emailList)` — Shares with an array of emails.
       - Calls `shareFileAsViewer` for each
       - Returns array of results

    Both with JSDoc.
  </action>
  <verify>
    Open `src/Core.gs` and verify:
    - Both Drive sharing functions exist
    - Errors are caught and logged, not thrown
    - JSDoc is present
  </verify>
  <done>Drive sharing helpers added to Core.gs</done>
</task>

## Success Criteria
- [ ] `sendEmail()` supports both send and draft modes
- [ ] `sendBatch()` handles throttling, limits, and quota errors
- [ ] Drive sharing is non-blocking (catches errors)
- [ ] Alias caching avoids repeated API calls
