# Architecture Patterns

**Domain:** Google Apps Script institutional email automation (bound to Google Sheets)
**Researched:** 2026-03-25
**Confidence:** HIGH — based on direct code analysis of all four source files and well-established GAS constraints

---

## Existing Architecture Assessment

The current 3-file structure is a genuine strength worth preserving and extending, not replacing.

### What Is Already Well-Designed

**Template registry pattern (`_REGISTRY` + `registerTemplate`)**
Using a plain object as a registry and a validation function at registration time is the correct GAS approach. It mirrors a service locator without requiring any module system. The validation in `registerTemplate` (checking for `id`, `name`, `buildHtml`, `processRow`) acts as a compile-time-equivalent contract.

**`mapHeaders()` with lowercase normalization**
Tolerating case variation in column names is exactly right for an end-user-facing spreadsheet system. This is a small decision that prevents a large class of runtime errors.

**`batchUpdateColumn()` at end of run**
Writing all status updates in one Sheets API call after the batch completes — rather than one call per row — is the correct performance pattern for GAS. The Sheets API is the primary bottleneck; reducing calls is always the right move.

**`safeCell` / `requiredCell` pair**
The distinction between "read or return empty string" and "read or throw a localized error" maps precisely to optional vs. mandatory columns. This is the right abstraction and should not be changed.

**`sendBatch` with quota guard and throttle**
Checking `MailApp.getRemainingDailyQuota() < 5` before each send, and sleeping every 20 emails, correctly addresses both hard quota limits and soft rate limits. The sleep interval of 1000ms every 20 emails is conservative and appropriate.

**`extraData` injection pattern**
Passing `{ configExtras, directoryRows }` into `processRow` as a context object rather than expanding parameters individually is forward-compatible. Adding a new cross-sheet dependency to any template requires only adding a key to `extraData` in `_executeBatch`, with no change to the `processRow` signature.

---

## Recommended Architecture

The system should remain a **3-file architecture** (Core / Templates / Main) bound to Google Sheets. No additional files are needed unless a fourth concern emerges that cannot be cleanly absorbed into one of the existing three layers. The goal is targeted improvements within the current structure.

```
┌─────────────────────────────────────────────────┐
│  Google Sheets UI (Menus + Modal Dialogs)        │
│  Main.gs — orchestration, config, dialog logic   │
└────────────────────┬────────────────────────────┘
                     │  calls
┌────────────────────▼────────────────────────────┐
│  Templates.gs — registry + template objects      │
│  processRow(row, headers, rowIndex, extraData)   │
│  buildHtml(data) → string | {content, ...}       │
└────────────────────┬────────────────────────────┘
                     │  calls
┌────────────────────▼────────────────────────────┐
│  Core.gs — engine (pure utilities)               │
│  sendEmail / sendBatch / buildEmailLayout        │
│  mapHeaders / safeCell / requiredCell / etc.     │
└─────────────────────────────────────────────────┘
```

Dependency direction is strictly top-down: Main calls Templates and Core; Templates calls Core; Core calls nothing in the system. This constraint must be maintained when adding features.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `Core.gs` | GAS API wrappers, HTML builder, email dispatch, sheet utilities | GAS built-ins only (GmailApp, SpreadsheetApp, etc.) |
| `Templates.gs` | Template definitions and registry; per-template data extraction and HTML building | Core.gs (calls `safeCell`, `requiredCell`, `buildButton`, etc.) |
| `Main.gs` | Spreadsheet menu, dialog display, config reading, batch orchestration | Core.gs and Templates.gs |
| `*.html` | Client-side UI for dialogs; calls server-side functions via `google.script.run` | Main.gs only |

**Invariant:** Templates must never call Main.gs functions. Core must never call Templates or Main functions.

---

## Patterns to Follow

### Pattern 1: Structured Row Processing with Early Return

**What:** `processRow` returns `null` to signal "skip this row" rather than throwing or returning a partial object.

**Why it works in GAS:** GAS has no `Promise.all` or parallel iteration. The batch loop is synchronous. A `null` return is the cleanest signal for "this row is intentionally not processable" without stopping the entire batch.

**Current implementation:** Already in place. The pattern should be consistently applied in every template — if a required lookup fails (like `directoryLookup` returning null), return `null` from `processRow`, not a partial data object.

**What to avoid:** Returning a data object with empty/null fields and letting `buildHtml` silently produce malformed output. Any state that would produce a broken email should be caught in `processRow`.

### Pattern 2: `buildHtml` Return Value Union

**What:** `buildHtml` can return either a plain string (content only) or an object `{ content, alertBand, extraNote }`.

**Why it works:** Templates with special layout requirements (alert band, extra note) can express that without Main.gs needing template-specific dispatch logic. Main.gs uses `typeof innerHtml === 'object'` to detect which form was returned.

**Guideline:** When `buildHtml` returns an object, the object should use explicit named keys, not positional values. All keys should be documented on the template object in a JSDoc comment.

**Formal keys to standardize:**
- `content` — required string of inner HTML
- `alertBand` — optional string; becomes the red banner above body
- `extraNote` — optional string; becomes the yellow note box below body

### Pattern 3: Config Extras as Template-Specific Namespace

**What:** The Config sheet has a "catch-all" namespace: any key not recognized as a system key (`template_id`, `data_sheet`, `sender_name`, etc.) is stored in `config.extras`. Templates receive this via `extraData.configExtras`.

**Why it works:** Operators can configure template-specific values (payment URL, deadline text, program name) in the same Config sheet without code changes.

**Guideline:** All template `configKeys` should use snake_case. Document each key's type, default, and effect in the template object's `configKeys` array. Prefer parallel naming: if the template uses `data.platformUrl`, the config key should be `platform_url`.

### Pattern 4: Status Column as Idempotency Guard

**What:** `_executeBatch` skips rows whose status column already contains "enviado", "borrador", or "saltado".

**Why this is critical:** GAS executions can be interrupted by timeouts or quota exhaustion mid-batch. Without idempotency, a retry would double-send to already-processed rows. The status column is the idempotency token.

**Guideline:** The status check must remain case-insensitive (`toLowerCase()`). Status values written must be consistent Spanish strings that will match the `.includes()` checks on re-run. Do not add new status values without also updating the skip logic.

### Pattern 5: Test Function Pattern for GAS Validation

**What:** Standalone named functions (e.g., `testCertificateTemplate()`) that exercise a template's `processRow` and `buildHtml` with hardcoded mock row data and log results.

**Why needed:** GAS has no local test runner. The only way to validate template logic without sending real email is to run a named function in the GAS editor and read the Execution Log output.

**Implementation approach:**

```javascript
// In a test helper at the bottom of Templates.gs or a separate Test.gs
function testCertificateTemplate() {
  const mockRow = ["Juan Pérez", "juan@example.com", "https://drive.google.com/d/ABC123/view"];
  const mockHeaders = { nombre: 0, correo: 1, enlace: 2 };
  const mockExtraData = { configExtras: { program_name: "Inglés Avanzado" } };

  const data = certificateTemplate.processRow(mockRow, mockHeaders, 2, mockExtraData);
  console.log("processRow output:", JSON.stringify(data));

  const html = certificateTemplate.buildHtml(data);
  console.log("buildHtml type:", typeof html);
  console.log("buildHtml output snippet:", typeof html === 'string' ? html.substring(0, 200) : JSON.stringify(Object.keys(html)));
}
```

**Confidence:** HIGH — this is the established GAS testing approach. There is no alternative that avoids the copy-paste deployment model.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Template-Specific Dispatch in `_executeBatch`

**What goes wrong:** The `report_delivery` special-case in `_executeBatch` uses `if (template.id === 'report_delivery')` to pre-load the Directorio sheet.

**Why bad:** Every new template that needs cross-sheet data will require a new `if (template.id === '...')` block in Main.gs. This couples Main.gs to template internals, defeats the purpose of the registry pattern, and makes adding templates riskier.

**Instead:** Introduce a `prepareExtraData(config, ss)` optional hook on the template object. Main.gs calls `template.prepareExtraData` if it exists, passing `config` and the active spreadsheet, and merges the returned object into `extraData`. The `report_delivery` template's current Directorio lookup moves into its own `prepareExtraData` method.

```javascript
// Template object gains an optional hook:
prepareExtraData: function(config, ss) {
  const dirSheet = ss.getSheets().find(s => s.getName().toLowerCase() === 'directorio');
  return dirSheet ? { directoryRows: dirSheet.getDataRange().getValues() } : {};
}

// _executeBatch becomes template-agnostic:
if (typeof template.prepareExtraData === 'function') {
  const extra = template.prepareExtraData(config, SpreadsheetApp.getActiveSpreadsheet());
  Object.assign(extraData, extra);
}
```

### Anti-Pattern 2: Silent Row Errors Becoming `null` Without Logging

**What goes wrong:** In `_executeBatch`, the `catch` block logs `console.error` but returns `null`, which causes `sendBatch` to write "SALTADO" as the status. This is indistinguishable from a legitimately skipped row (e.g., status already "ENVIADO").

**Why bad:** Operators see "SALTADO" in the status column with no way to distinguish intentional skips from processing errors. Errors go unreported.

**Instead:** Propagate the error message into the status column. In the `catch(e)` block of `processFn`, do not return `null` — instead throw, and let `sendBatch` catch it and write an `ERROR:` prefixed status. Alternatively, return a sentinel object `{ __error: e.message }` and handle it in the dispatch loop to write `ERROR: [message]` to the status column.

### Anti-Pattern 3: Growing `buildEmailLayout` with Template-Specific Layout Zones

**What goes wrong:** Adding more conditional sections to `buildEmailLayout` (beyond `alertBand` and `extraNote`) as templates need increasingly custom layouts.

**Why bad:** Core becomes aware of template concerns. The HTML master layout becomes hard to predict from the template author's perspective.

**Instead:** The `content` field passed to `buildEmailLayout` is already an unconstrained HTML string. Templates can compose whatever internal structure they need within `content` using the existing component builders (`buildInfoBox`, `buildWarningBox`, `buildButton`). If a new component is needed, add it to Core as a reusable builder function — not as a new conditional zone in `buildEmailLayout`.

### Anti-Pattern 4: Hardcoded Column Indexes in Templates

**What goes wrong:** `reportDeliveryTemplate.processRow` uses `safeCell(row, 1)`, `safeCell(row, 2)`, etc. with a comment explaining these are "Indexes based on Informe script (0-based)".

**Why bad:** If the source sheet's column order changes, the template silently reads wrong data with no error. This breaks the `mapHeaders`-based contract that all other templates follow.

**Instead:** Either enforce that the Directorio/Informe sheet has named headers that can be mapped, or document the column order as a hard constraint in `requiredHeaders` for this template specifically, and add a validator that checks the first-row headers match expected values before processing.

### Anti-Pattern 5: Confirmation Dialogs Inside `_executeBatch`

**What goes wrong:** `_executeBatch` calls `confirmAction()` when `overrides` is null (direct menu trigger). This mixes UI interaction into batch logic.

**Why bad:** Any caller of `_executeBatch` must remember to either pass `overrides` or know that a dialog will be triggered. Testing batch logic requires mocking UI.

**Instead:** Move confirmation to the menu handler (`menuSendEmails`, `menuCreateDrafts`) before calling `_executeBatch`. `_executeBatch` should be a pure data-processing function with no UI side effects.

---

## Error Handling Strategy

GAS has no global exception handler, no async error boundaries, and no retry mechanism. Error handling must be layered explicitly.

### Layer 1: Row-level isolation (already present)

Each row in `sendBatch` is wrapped in `processFn`, which is called inside a `try/catch` in `_executeBatch`. This prevents a single bad row from aborting the batch. This is correct and must be maintained.

### Layer 2: Error status propagation (needs improvement)

Currently errors in `processFn` return `null`, which writes "SALTADO". Errors should write `ERROR: [message]` to the status column so operators can identify and fix them.

**Implementation:** Change the `catch(e)` in `processFn` to return `{ __skip: false, __error: e.message }` or extend `sendBatch` to accept an error status format.

### Layer 3: Pre-flight validation (partially present)

`_showSendDialog` validates required headers before showing the dialog. This is correct. The same validation should also run at the start of `_executeBatch` as a defensive check, since `_executeBatch` can be called directly via `executeBatchFromDialog` without going through `_showSendDialog`.

### Layer 4: Batch summary reporting (already present)

`showResult(processed, errors)` shows a count summary after the batch. This is the right UX for a non-technical operator. The summary should include how many rows were skipped with errors vs. intentionally skipped, if those can be distinguished.

---

## Logging Strategy

GAS provides `console.log`, `console.warn`, `console.error` which write to the Executions panel in the GAS editor. There is no persistent log outside the editor session.

**Recommendation: Write a structured `log()` wrapper in Core.gs**

```javascript
function log(level, context, message, data) {
  const entry = `[${level}] [${context}] ${message}`;
  if (data) {
    if (level === 'ERROR') console.error(entry, JSON.stringify(data));
    else if (level === 'WARN') console.warn(entry, JSON.stringify(data));
    else console.log(entry, JSON.stringify(data));
  } else {
    if (level === 'ERROR') console.error(entry);
    else if (level === 'WARN') console.warn(entry);
    else console.log(entry);
  }
}
```

**Why context labels matter:** When a batch runs 50+ rows, raw `console.error` messages from different templates are difficult to correlate in the Executions panel. Prefixing with `[processRow:certificate]` or `[sendBatch:row:15]` makes log scanning faster.

**What to log:**
- `INFO` — batch start/end with row count, template id, asDraft flag
- `INFO` — each successful send with row index and recipient (truncated email)
- `WARN` — alias not found, skipped row (with reason), quota warnings
- `ERROR` — row processing failure with row index and exception message, quota exhausted

**What not to log:** Full email content, full HTML, or sensitive personal data. The GAS Executions panel is accessible to all editors of the spreadsheet.

---

## State Management in GAS

GAS has no persistent state between executions beyond Sheets/Drive/Properties Service. Three tiers are relevant:

### Tier 1: Per-execution in-memory state (module-level variables)

`_ALIASES_CACHE` is the current example. Valid for caching within a single trigger call. Reset automatically on next execution. Do not expand this pattern beyond per-execution caches — it is not persistence.

### Tier 2: PropertiesService (for lightweight persistent state)

`PropertiesService.getScriptProperties()` and `.getDocumentProperties()` provide a key-value store that persists across executions. Use cases:
- Storing last batch timestamp for rate-limiting guard
- Storing last-used template ID so the system can pre-select it
- Storing a "batch in progress" flag to prevent concurrent executions

**Guideline:** PropertiesService values are strings only. Serialize objects with `JSON.stringify`. Values survive script deployment and spreadsheet sharing. Do not store sensitive data.

### Tier 3: Sheet data as authoritative state

The status column is the canonical persistent state for batch execution. This is the current and correct approach. The status column is visible, editable, and auditable by non-technical operators — a significant advantage over hidden PropertiesService state.

**Invariant:** The status column is always the source of truth for whether a row has been processed. PropertiesService should never shadow or replace it.

---

## Scalability Considerations

| Concern | At 50 rows | At 500 rows | At 5,000 rows |
|---------|-----------|------------|--------------|
| Sheets API calls | Single range read + single write — fine | Same pattern — fine | `getDataRange()` returns large array — watch memory |
| Gmail quota | ~50 sends — far under daily limit | Approaches limit for free accounts (~100/day) | Requires multi-day runs; status column idempotency becomes critical |
| Execution timeout | Well under 6-minute GAS limit | May approach timeout; test with real data | Will exceed 6-minute limit; requires chunked batch strategy |
| Drive sharing calls | One per row for certificate/report templates | Performance concern; consider batching | `DriveApp.addViewer` has its own quota; batch with error tolerance |

**GAS execution timeout is 6 minutes for trigger-bound scripts.** For batches exceeding approximately 200–300 rows (depending on template complexity and sleep throttling), a chunked execution strategy is needed: process N rows, write statuses, exit, and let the user re-trigger. The idempotency guard on the status column already makes this safe — rows already marked "ENVIADO" are skipped on re-run.

---

## Data Flow

```
User clicks menu
  → Main.gs: _getConfig() reads "Config" sheet
  → Main.gs: _getSelectedTemplate() resolves template from registry
  → Main.gs: _showSendDialog() collects subject/CC/BCC overrides
  → Main.gs: executeBatchFromDialog(formData) called via google.script.run
    → Main.gs: _executeBatch(asDraft, overrides)
      → Core.gs: mapHeaders() reads data sheet column names
      → Template: [optional] prepareExtraData() loads cross-sheet data
      → Core.gs: sendBatch(rows, processFn, options)
        Per row:
          → Template: processRow(row, headers, rowIndex, extraData) → data | null
          → Template: buildHtml(data) → string | { content, alertBand, extraNote }
          → Core.gs: buildEmailLayout({ content, alertBand, ... }) → full HTML
          → Core.gs: sendEmail({ to, subject, htmlBody, ... }) → { success, mode, timestamp }
      → Core.gs: batchUpdateColumn() writes all statuses in one call
      → Core.gs: showResult(processed, errors) displays summary
```

---

## Sources

**Confidence notes:**
- Architecture assessment: HIGH — derived from direct analysis of all four source files
- GAS constraints (timeout, quota, no modules, PropertiesService): HIGH — well-documented, stable GAS runtime behavior, unchanged for several years
- Test function pattern: HIGH — standard GAS community approach; no alternative exists given the copy-paste deployment model
- Anti-pattern recommendations: HIGH — derived from specific code patterns observed in the source files, not general speculation
- Scalability numbers (execution timeout 6 min, quota limits): HIGH — official GAS quotas; verify current values at https://developers.google.com/apps-script/guides/services/quotas before building chunked-execution features

**Official references:**
- GAS quotas and limits: https://developers.google.com/apps-script/guides/services/quotas
- GAS HtmlService (dialog constraints): https://developers.google.com/apps-script/guides/html
- PropertiesService API: https://developers.google.com/apps-script/reference/properties/properties-service
