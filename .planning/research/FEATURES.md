# Feature Landscape

**Domain:** Institutional email automation (Google Sheets + GAS, bound spreadsheet)
**Researched:** 2026-03-25
**Confidence:** HIGH for GAS constraints and existing system gaps; MEDIUM for feature prioritization (derived from codebase analysis and domain knowledge, no external search available)

---

## Current System Baseline

Before cataloguing what to add, a precise picture of what already exists:

| Capability | Status | Notes |
|------------|--------|-------|
| Batch send / batch draft | Done | `sendBatch()` with throttle and quota guard |
| 7 template types | Done | certificate, confirmation, payment_reminder, placement_test, code_delivery, report_delivery, survey |
| Status column tracking | Done | Written after batch; marks ENVIADO / BORRADOR CREADO / ERROR / SALTADO |
| Skip already-sent rows | Done | Checks status column text before processing each row |
| Config sheet (key-value) | Done | Drives template selection, sender, CC, extras |
| Pre-send dialog (SendDialog) | Done | Subject, CC/BCC, extra note overrides |
| Template selector dialog | Done | Visual cards, auto-generates Config + data sheets |
| Preview modal | Done | Renders first row HTML in modal, shows row count |
| Test send to self | Done | Sends first data row to current user's Gmail |
| Gmail alias support | Done | Validates alias against GmailApp.getAliases() |
| Drive file sharing | Done | shareFileAsViewer on certificate and report templates |
| Show config summary | Done | Alert dialog with current template settings |
| Email validation utility | Done | isValidEmail() exists in Core.gs but not called during batch |

**Key gaps identified from source code:**

1. `isValidEmail()` exists but is never called in `processFn` or `processRow` — invalid emails silently fail at GmailApp level.
2. Error rows in batch: when `processRow` throws, the error is caught and `null` returned — status column writes nothing for that row (the catch in `processFn` returns `null`, which writes `SALTADO` rather than the actual error message).
3. No per-run log or summary sheet — the only feedback is the final `showResult()` alert and the status column.
4. No way to re-run only failed rows without manually clearing the status column.
5. No row-count guard before batch — a user can fire 500-row send accidentally with no preview step required (SendDialog shows count but doesn't enforce a cap).
6. Preview only renders row 2 — there is no way to browse through recipients before sending.
7. `sendBatch` statuses array is 1:1 with rows but `processFn` exceptions return null (SALTADO), not the error text — error detail is only in `console.error`, not in the sheet.
8. `report_delivery` template uses hard-coded column indexes (0-based: 1,2,3,4) instead of `mapHeaders`, making it fragile to column reordering.
9. No attachment support — GmailApp supports attachments but the system has no path for them.
10. No scheduled / time-triggered sending — everything is manual.

---

## Table Stakes

Features users of this type of system expect. Missing = system feels unreliable or hard to use.

| Feature | Why Expected | Complexity | Feasibility in GAS | Priority |
|---------|--------------|------------|-------------------|----------|
| **Error detail in status column** | When a row fails, staff need to know why without opening the GAS execution log | Low | High — catch block in `processFn` already exists, just needs to return the error message instead of null | P0 |
| **Email validation before send** | Prevent wasted quota and confusing partial failures | Low | High — `isValidEmail()` already exists, needs to be called in `processRow` or `processFn` | P0 |
| **Re-run only failed/skipped rows** | After fixing a data error, staff want to retry without clearing the entire status column | Low-Medium | High — add menu item that reads status column and only processes rows whose status is ERROR or empty | P1 |
| **Row count confirmation with cap warning** | Accidental 500-row sends happen; institutions need a speed bump | Low | High — SendDialog already shows rowCount; add a hard confirm step if rowCount > threshold (e.g. 50) | P1 |
| **Batch progress feedback** | A 200-row batch takes ~3-4 min with throttling; users need to know it's running | Medium | Medium — GAS has no real-time callbacks to UI; best option is a Sheets toast (`SpreadsheetApp.getActiveSpreadsheet().toast()`) per N rows, or a progress tracking row in a log sheet | P1 |
| **Configuration validation on open** | Staff often set up Config incorrectly; catch problems before they hit Send | Low | High — add a `_validateConfig()` that checks template_id exists, data_sheet exists, required headers are present, and show one consolidated error report | P1 |

---

## Differentiators

Features that meaningfully improve the system beyond table stakes. Not expected, but valued.

| Feature | Value Proposition | Complexity | Feasibility in GAS | Priority |
|---------|-------------------|------------|-------------------|----------|
| **Send Log sheet** | Persistent audit trail: every run writes a row with timestamp, template, sent count, error count, operator email. Invaluable for institutional accountability | Medium | High — `PropertiesService` or a dedicated "Log" sheet; sheet is better for visibility | P1 |
| **Per-row preview navigation** | Staff want to spot-check a few rows before sending, not just row 2. A simple "next/previous" in the preview dialog increases confidence | Medium | Medium — modal dialog already exists; add server-side call that accepts a row index and re-renders | P2 |
| **Selective send (checked rows only)** | Some campaigns need to send to a subset of rows without deleting the others (e.g. one class section, or a manual retry list) | Medium | Medium — add a "Seleccionado" checkbox column; `processFn` checks it and skips unmarked rows | P2 |
| **Attachment support** | Occasional need to attach a PDF or file to emails (e.g. invoice, brochure). GmailApp supports `attachments` option | Medium | High — GmailApp.sendEmail accepts `attachments` as Blob array; add optional `attachmentUrl` column to templates that need it | P2 |
| **Scheduled send via time trigger** | Campaign emails for a specific date/time. Staff set it up now, it fires at 8 AM Monday | High | Medium — GAS ScriptApp.newTrigger() supports time-based triggers; requires storing pending job state in PropertiesService or a trigger log sheet | P3 |
| **Plain text body auto-generation** | Currently `plainBody` is passed as empty string to GmailApp. Email clients that don't render HTML (rare but real) show a blank email | Low | High — strip HTML tags from the content string with a regex; or build a parallel text template | P2 |
| **Multi-language template variants** | The confirmation template already has language-aware CC logic (Spanish, German); extend this to header text and body copy for English-language recipients | High | Medium — requires template redesign but no new GAS APIs | P3 |
| **Config sheet descriptions column** | Already partially done (`_generateSheets` writes descriptions). Make all configKeys self-documenting by adding example values and data types to the generated Config sheet | Low | High — pure sheet generation improvement | P2 |
| **Quota forecast before batch** | Show "You have N emails remaining today. This batch needs M. OK?" before committing to a large send | Low | High — `MailApp.getRemainingDailyQuota()` is already called per row; call it once at the start and surface it in the SendDialog | P1 |

---

## Anti-Features

Features to explicitly NOT build. Each has a strong reason.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Open tracking / read receipts via tracking pixel** | Requires a publicly accessible server to serve the pixel image. GAS has no persistent HTTP server. Workarounds (Apps Script web app) add fragile infrastructure. Institutional email open rates are not a current need. | Track delivery success via status column (ENVIADO confirms GmailApp accepted it) |
| **Unsubscribe / opt-out management** | GDPR/CAN-SPAM unsubscribe handling requires persistent state and a public endpoint to receive clicks. Out of scope for a bound-spreadsheet tool. | Institutional transactional emails (certificates, credentials) are not marketing — no unsubscribe requirement applies |
| **Custom HTML email editor inside GAS** | HtmlService modals have severe CSP restrictions. A rich WYSIWYG editor cannot run inside a GAS modal. | Templates are maintained as code in Templates.gs; non-technical users configure via Config sheet, not by editing HTML |
| **Direct database integration (SQL, external API)** | The system is explicitly designed to live inside Google Workspace. External DB adds auth complexity, CORS issues, and a single point of failure | Data preparation happens in the spreadsheet itself; staff paste/import data before running |
| **Email thread replies / conversation tracking** | GmailApp can send but not reliably track threaded replies across recipients. | Replies go to the sender alias naturally; no GAS code needed |
| **Sending from multiple different aliases per row** | GAS alias support is per-account; switching alias per row requires multiple GmailApp calls with different `from` fields. The alias must be pre-registered in Gmail settings. Complexity disproportionate to value. | Use a single alias per template (current architecture); for different sender identities, use different GAS-bound spreadsheets |

---

## Feature Dependencies

```
Email validation (P0) → Cleaner error messages in status column (P0)
                      → Re-run failed rows (P1) [meaningful only when errors are distinguishable]

Config validation on open (P1) → Row count cap warning (P1) [validation runs before SendDialog opens]

Send Log sheet (P1) → Scheduled send (P3) [log sheet provides state storage for triggers]

Quota forecast (P1) → Row count cap warning (P1) [both shown together in SendDialog]

Per-row preview navigation (P2) → Selective send (P2) [both need per-row addressing logic]
```

---

## MVP Recommendation for Next Milestone

These five features address the most common operational pain points with low implementation risk:

1. **Error detail in status column** — single-line change in `processFn`: return the error string instead of null. Highest value per line of code.
2. **Email validation in processFn** — call `isValidEmail()` before `template.processRow()`; write `ERROR: email inválido` to status if check fails.
3. **Re-run failed rows menu item** — new menu entry "Reintentar Filas con Error" that calls `_executeBatch` with a flag that changes the skip condition from `includes('enviado')` to only skip `includes('enviado') || includes('borrador')`.
4. **Quota forecast in SendDialog** — pass `remainingQuota` as a template variable to `SendDialog.html`; display "Cuota disponible: N correos" near the submit button.
5. **Send Log sheet** — after every `_executeBatch` run, append one row to a "Log" sheet: timestamp, template name, operator email, rowCount, sent, errors, asDraft. Creates institutional audit trail.

**Defer for later phases:**
- Per-row preview navigation: medium effort, nice to have
- Scheduled send: high effort, low current demand
- Attachment support: medium effort, occasional need — add when a template explicitly requires it
- Plain text body: low effort but low impact given target audience (university institutional Gmail)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Re-run failed rows | The skip condition logic (`currentStatus.includes('enviado')`) is text-match based. If error messages change format, rows could be re-processed accidentally. | Define a fixed set of terminal statuses as constants in Core.gs |
| Send Log sheet | A Log sheet that grows unbounded will eventually slow down `getDataRange()` if someone reads from it. | Append-only; never read back the full log during batch execution |
| Quota forecast | `MailApp.getRemainingDailyQuota()` is a live API call with its own quota. Calling it multiple times in one execution wastes it. | Call once at batch start, cache the value in a local variable |
| Config validation on open | `onOpen()` runs on every sheet open, including automated access. Heavy validation here will slow down every load. | Validate lazily (when user clicks a menu item) rather than in `onOpen()` |
| Attachment support | `DriveApp.getFileById()` throws if the file is in a different Drive than the runner's account. | Validate file access in processRow before building the email; write error to status if inaccessible |
| Scheduled send | Time-based triggers run as the user who installed them, using their Gmail quota. If the installer changes or revokes access, the trigger silently fails. | Document the trigger owner requirement; add a "Ver Triggers Activos" menu item |

---

## Sources

- Codebase analysis: `src/Core.gs`, `src/Templates.gs`, `src/Main.gs` (read 2026-03-25)
- GAS documentation knowledge: `GmailApp`, `MailApp`, `SpreadsheetApp`, `HtmlService`, `ScriptApp` API capabilities and constraints (HIGH confidence — well-established GAS APIs, training data corroborated by code already using these APIs correctly)
- Institutional email automation domain patterns: MEDIUM confidence — derived from training data on GAS community patterns and university IT workflows; no external search was performed
