# Phase 1: Reliability Hardening - Research

**Researched:** 2026-03-31
**Domain:** Google Apps Script error handling, batch processing, data validation
**Confidence:** HIGH

## Summary

Phase 1 addresses four concrete reliability problems in the existing GAS email system: (1) errors silently absorbed as "SALTADO", (2) no pre-send email validation, (3) Drive sharing failures ignored, and (4) hardcoded column indexes in the report_delivery template. All four problems are well-understood from code analysis and have straightforward fixes within the existing architecture.

The primary challenge is the `sendBatch`/`processFn` interface in Core.gs, which currently treats any `null` return as "SALTADO" with no way to distinguish intentional skips from errors. The fix requires extending this interface to support an error-carrying return value without breaking the existing contract for the 6 other templates that already work correctly.

**Primary recommendation:** Extend the `processFn` return convention so it can return an error object (e.g., `{ error: "message" }`) in addition to `null` (intentional skip) and data objects (proceed with send). This is the minimum-disruption change that enables all four fixes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Pre-flight scan runs inside `_executeBatch`, after rows are collected but BEFORE `sendBatch` is called. Batch aborts entirely if any invalid emails found.
- **D-02:** Validation uses strict `isValidEmail()` regex from Core.gs (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
- **D-03:** Email extracted via template's `processRow` call (template-agnostic). Must not trigger Drive sharing side effects during validation pass.
- **D-04:** Alert format: "Fila X: <invalid_address>" for each invalid row.
- **D-05:** Intentional `processRow -> null` skips keep "SALTADO" label but now include timestamp: `SALTADO (2026-03-31 10:00:00)`.
- **D-06:** Exceptions from `processRow` write `ERROR: <Spanish message>` to status column.
- **D-07:** SALTADO rows are NOT retried on batch re-run. Only ERROR and empty-status rows are retried.
- **D-08:** User-facing messages in Spanish. `console.error/warn` may remain in English.
- **D-09:** When `shareFileAsViewer` returns `{ success: false }`, processRow must treat as fatal row failure -- ERROR status, no email sent.
- **D-10:** Error message format: `ERROR: No se pudo compartir el archivo <fileId>`.
- **D-11:** Drive sharing stays inside `processRow`. Fix is to check the return value.
- **D-12:** Data sheet required headers after migration: `profesor`, `curso`, `doc_id`, `url_informe`.
- **D-13:** Directorio sheet columns: `nombre`, `correo`, `cc` -- use `mapHeaders` instead of hardcoded indexes.
- **D-14:** No backward compatibility with hardcoded indexes. Operators must rename columns. One-time migration.
- **D-15:** Professor not found = data integrity error, NOT intentional skip. Status: `ERROR: Profesor no encontrado en Directorio: <professorName>`.

### Claude's Discretion
- Mechanism for extracting `to` email during pre-flight validation without triggering Drive sharing side effects (e.g., lightweight `getRecipientEmail()` method or `dryRun` flag)
- Whether `sendBatch` needs signature changes for error propagation, or if existing null-return convention can be extended with error-carrying object
- How to structure pre-flight validation loop within `_executeBatch` (separate function vs inline)

### Deferred Ideas (OUT OF SCOPE)
- "Reintentar Errores" option in confirmation dialog (Phase 2)
- Conteo de filas en confirmacion (Phase 2: ROBUST-04/UX-02)
- XSS sanitization in email builders (security, separate concern)
- Refactoring duplicated code in Main.gs (Phase 3)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROBUST-01 | Operator sees specific error reason in status column when a row fails (not "SALTADO") | processFn catch block (Main.gs:418-421) currently returns null, needs to return error object; sendBatch (Core.gs:308-310) needs to recognize error objects |
| ROBUST-02 | Operator warned before sending if any emails are syntactically invalid; those rows skipped with error status | isValidEmail() exists in Core.gs:144 but unused in batch flow; pre-flight loop in _executeBatch must call processRow to extract email, then validate |
| ROBUST-06 | Drive sharing failures caught and written to status column instead of sending broken link | certificateTemplate (line 87) and reportDeliveryTemplate (line 448) both call shareFileAsViewer but ignore return value |
| ARCH-02 | report_delivery reads columns by header name via mapHeaders instead of hardcoded indexes | processRow uses hardcoded row[1], row[2], row[3], row[4]; directoryLookup uses dRow[0], dRow[1], dRow[2]; requiredHeaders is empty [] |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **No build/compile step**: All code runs in Google Apps Script cloud runtime. No local testing.
- **No import/require**: All `.gs` files share a single global scope.
- **No `let` at module level** for persistent variables (use `const` or `var`); GAS re-executes all files per request.
- **Deploy by copy-paste**: Copy file content into GAS editor, save, reload spreadsheet.
- **Test via GAS editor**: Run named test functions in the GAS editor "Executions" panel.
- **GAS globals**: `GmailApp`, `SpreadsheetApp`, `DriveApp`, `MailApp`, `Utilities`, `Session`, `HtmlService` -- no npm.
- **Messages in Spanish**: User-facing text must be in Spanish (per D-08).

## Architecture Patterns

### Current Data Flow (what changes)

```
_executeBatch()
  |-- mapHeaders(sheet)
  |-- ensureColumn(sheet, headers, statusColumn)
  |-- rows = sheet.getDataRange().getValues().slice(1)
  |-- processFn = (row, i) => {
  |       // Check status: skip if enviado/borrador/saltado
  |       // try { template.processRow() } catch { return null }  <-- BUG: error swallowed
  |       // buildHtml + buildEmailLayout
  |       // return { to, subject, htmlBody, cc, bcc }
  |   }
  |-- sendBatch(rows, processFn, options)
  |       // for each row: processFn() -> null means SALTADO   <-- BUG: no error distinction
  |       // sendEmail() -> success/error
  |-- batchUpdateColumn(sheet, 2, statusCol, results.statuses)
  |-- showResult(processed, errors)
```

### Pattern 1: Error Object Convention for processFn

**What:** Extend processFn return to support three states: data object (send), `null` (intentional skip), error object `{ error: "message" }` (row failure).

**When to use:** In `sendBatch` (Core.gs), check for `rowData.error` property before treating as valid send data.

**Example:**
```javascript
// In sendBatch (Core.gs), replace the null check:
const rowData = processFn(rows[i], i);
if (!rowData) {
  statuses.push([`SALTADO (${now()})`]);
  continue;
}
if (rowData.error) {
  statuses.push([`ERROR: ${rowData.error}`]);
  errors++;
  continue;
}
// ... proceed with sendEmail
```

**Why this approach:** Minimal change to sendBatch interface. No new parameters. Backward compatible -- existing templates that return null or data objects continue to work unchanged. Only templates that need to report errors use the new `{ error }` return.

### Pattern 2: Pre-flight Validation Loop

**What:** Before calling `sendBatch`, iterate rows, call `processRow` (or a lightweight email extractor), validate emails with `isValidEmail()`, and abort if any are invalid.

**Key challenge (D-03):** `processRow` for certificate and report_delivery templates calls `shareFileAsViewer` as a side effect. Pre-flight validation must NOT trigger Drive sharing.

**Recommended approach:** Add a `getRecipientEmail(row, headers, rowIndex, extraData)` method to templates. For most templates this is trivial (e.g., `return safeCell(row, headers['correo'])`). For report_delivery it does the directory lookup without calling `shareFileAsViewer`. Templates without this method fall back to skipping pre-flight validation for that template (acceptable because the main validation catches invalid emails at sendBatch time anyway).

**Alternative approach:** A `dryRun` flag passed to `processRow`. Downside: requires every template's `processRow` to check the flag and conditionally skip side effects. More invasive, more error-prone for future template authors.

**Example (recommended):**
```javascript
// In _executeBatch, before sendBatch:
const invalidRows = [];
for (let i = 0; i < rows.length; i++) {
  const rowIndex = i + 2;
  const currentStatus = String(rows[i][statusCol - 1] || '').toLowerCase();
  if (currentStatus.includes('enviado') || currentStatus.includes('borrador') || currentStatus.includes('saltado')) {
    continue;
  }

  let email;
  if (typeof template.getRecipientEmail === 'function') {
    email = template.getRecipientEmail(rows[i], headers, rowIndex, extraData);
  }
  // email may be null for rows that will be skipped by processRow -- that's fine
  if (email && !isValidEmail(email)) {
    invalidRows.push({ row: rowIndex, email: email });
  }
}

if (invalidRows.length > 0) {
  const detail = invalidRows.map(r => `Fila ${r.row}: ${r.email}`).join('\n');
  showAlert('Correos Invalidos', `Se encontraron correos invalidos:\n\n${detail}\n\nCorríjalos antes de enviar.`);
  return;
}
```

### Pattern 3: Drive Sharing Failure Propagation

**What:** Check `shareFileAsViewer` return value in `processRow` and return error object if sharing fails.

**Applies to:** `certificateTemplate` (line 87) and `reportDeliveryTemplate` (line 448).

**Example:**
```javascript
// In certificateTemplate.processRow:
const fileId = extractFileId(enlace);
if (fileId) {
  const shareResult = shareFileAsViewer(fileId, correo);
  if (!shareResult.success) {
    return { error: `No se pudo compartir el archivo ${fileId}` };
  }
}

// In reportDeliveryTemplate.processRow:
const shareResult = shareFileAsViewer(docId, lookup.email);
if (!shareResult.success) {
  return { error: `No se pudo compartir el archivo ${docId}` };
}
```

### Pattern 4: processFn Error Propagation (Main.gs catch block)

**What:** The catch block in processFn (Main.gs:418-421) currently swallows errors by returning `null`. Change it to return the error object.

**Example:**
```javascript
// Current (broken):
catch (e) {
  console.error(`Error en fila ${rowIndex}: ${e.message}`);
  return null;  // <-- becomes "SALTADO" in sendBatch
}

// Fixed:
catch (e) {
  console.error(`Error en fila ${rowIndex}: ${e.message}`);
  return { error: e.message };  // <-- becomes "ERROR: ..." in sendBatch
}
```

### Pattern 5: mapHeaders Migration for report_delivery

**What:** Replace hardcoded column indexes with `mapHeaders` lookups in both the data sheet and Directorio sheet.

**Data sheet migration:**
```javascript
// Current: safeCell(row, 1), safeCell(row, 2), safeCell(row, 3), safeCell(row, 4)
// After:
const professorName = requiredCell(row, headers['profesor'], 'Profesor', rowIndex);
const course = requiredCell(row, headers['curso'], 'Curso', rowIndex);
const docId = requiredCell(row, headers['doc_id'], 'Doc ID', rowIndex);
const reportUrl = requiredCell(row, headers['url_informe'], 'URL Informe', rowIndex);
```

**Directorio sheet migration:**
```javascript
// Current: dRow[0], dRow[1], dRow[2]
// After: use mapHeaders on directoryRows
directoryLookup: function(professorName, directoryRows, dirHeaders) {
  // dirHeaders comes from mapHeaders(dirSheet)
  const searchName = professorName.toLowerCase().trim();
  for (const dRow of directoryRows) {
    const dName = String(safeCell(dRow, dirHeaders['nombre'])).toLowerCase().trim();
    if (dName === searchName) {
      return {
        email: safeCell(dRow, dirHeaders['correo']),
        cc: safeCell(dRow, dirHeaders['cc'])
      };
    }
  }
  return null;
}
```

**Important:** The Directorio sheet's headers need to be passed as `dirHeaders` in `extraData`. The legacy code path in `_executeBatch` (Main.gs:360-366) that loads `directoryRows` must also load and pass the Directorio header map.

### Anti-Patterns to Avoid

- **Modifying `sendBatch` signature**: Adding new parameters to `sendBatch` is unnecessary. The error-carrying object convention handles everything through the existing `processFn` callback interface.
- **Adding a `dryRun` flag to `processRow`**: Increases complexity for all future template authors. A separate `getRecipientEmail` method is simpler and more explicit.
- **Catching errors in `processRow` instead of `processFn`**: Error handling belongs in the processFn wrapper in Main.gs, not scattered across each template. Templates should throw errors (via `requiredCell`) and let the wrapper catch and format them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email validation | Custom regex | `isValidEmail()` in Core.gs:144 | Already exists, already tested, used by the decision document |
| Timestamp formatting | Manual string concat | `now()` in Core.gs:136 | Already returns `yyyy-MM-dd HH:mm:ss` in Santiago timezone |
| Required field checking | Manual empty checks | `requiredCell()` in Core.gs:92 | Throws localized Spanish errors, already used by other templates |
| Header-to-index mapping | Manual column counting | `mapHeaders()` in Core.gs:58 | Lowercase-normalized, handles whitespace, used by all other templates |
| Column creation | Manual sheet manipulation | `ensureColumn()` in Core.gs:107 | Creates column if missing, returns 1-based index |

## Common Pitfalls

### Pitfall 1: Pre-flight validation triggering Drive side effects
**What goes wrong:** Calling `processRow` during pre-flight validation triggers `shareFileAsViewer` for certificate and report_delivery templates, sharing files with potentially invalid emails before the batch even starts.
**Why it happens:** `processRow` was designed as the single entry point for all row processing, including side effects.
**How to avoid:** Use a separate `getRecipientEmail` method for pre-flight validation that extracts only the email without any side effects.
**Warning signs:** Files appearing as "Shared" in Drive before the operator confirms the send.

### Pitfall 2: Status column skip logic must include ERROR
**What goes wrong:** After D-07, the processFn status check (Main.gs:383) currently skips rows with "saltado" in the status. If ERROR rows should be retried, the skip logic must NOT include "error".
**Why it happens:** The current check uses `.includes('saltado')` but there is no check for "error" because errors are currently written as "SALTADO".
**How to avoid:** Verify the skip condition only matches `enviado`, `borrador`, and `saltado` -- NOT `error`. This is already the current behavior (errors were being written as "SALTADO"), but after the fix, ensure the new ERROR statuses are not caught by the skip filter.
**Warning signs:** ERROR rows not being retried on subsequent batch runs.

### Pitfall 3: Directorio headers must be loaded before prepareExtraData
**What goes wrong:** The legacy `report_delivery` code path in `_executeBatch` loads `directoryRows` but not directory headers. After migration, `directoryLookup` needs both.
**Why it happens:** The legacy code path was written before `mapHeaders` existed for cross-sheet data.
**How to avoid:** When loading the Directorio sheet, also call `mapHeaders(dirSheet)` and store it in `extraData.dirHeaders`.
**Warning signs:** `dirHeaders['nombre']` returning `undefined`, causing all directory lookups to fail.

### Pitfall 4: report_delivery requiredHeaders must list the NEW header names
**What goes wrong:** If `requiredHeaders` is left as `[]` after migration, the header validation check in `_executeBatch` (Main.gs:336) won't catch missing columns.
**Why it happens:** The template currently has `requiredHeaders: []` because it used hardcoded indexes.
**How to avoid:** Set `requiredHeaders: ['profesor', 'curso', 'doc_id', 'url_informe']` as specified in D-12.
**Warning signs:** Template appears to work in header validation but fails at `requiredCell` time with confusing errors.

### Pitfall 5: certificateTemplate also needs Drive sharing fix
**What goes wrong:** Only fixing report_delivery but forgetting certificateTemplate. Both templates call `shareFileAsViewer` without checking the return value.
**Why it happens:** ROBUST-06 mentions "certificate or report row" but the focus is often on report_delivery.
**How to avoid:** Apply the same `shareFileAsViewer` return check to both `certificateTemplate.processRow` (line 87) and `reportDeliveryTemplate.processRow` (line 448).
**Warning signs:** Certificate emails sent with broken Drive links.

### Pitfall 6: SALTADO timestamp must use now() format
**What goes wrong:** Timestamps inconsistent between SALTADO and ENVIADO/BORRADOR statuses.
**Why it happens:** SALTADO currently has no timestamp at all.
**How to avoid:** Use `now()` from Core.gs for the timestamp, matching the format used by ENVIADO/BORRADOR: `SALTADO (2026-03-31 10:00:00)`.
**Warning signs:** Timestamps in different formats across status column.

## Code Examples

### Files That Need Changes

| File | What Changes | Lines Affected |
|------|-------------|----------------|
| `src/Core.gs` | `sendBatch`: Handle error objects from processFn, add timestamp to SALTADO | Lines 287-336 |
| `src/Main.gs` | `_executeBatch`: Pre-flight email validation loop, processFn catch block returns error object, Directorio header loading | Lines 325-438 |
| `src/Templates.gs` | `certificateTemplate.processRow`: Check shareFileAsViewer return | Lines 84-88 |
| `src/Templates.gs` | `reportDeliveryTemplate`: requiredHeaders, processRow with mapHeaders, directoryLookup with mapHeaders, shareFileAsViewer check | Lines 395-474 |

### Existing Patterns to Follow

**Status format (established):**
```
ENVIADO (2026-03-31 10:00:00)
BORRADOR CREADO (2026-03-31 10:00:00)
ERROR: QUOTA INSUFICIENTE          // existing error pattern
LIMITE ALCANZADO                   // existing limit pattern
```

**After Phase 1:**
```
ENVIADO (2026-03-31 10:00:00)      // unchanged
BORRADOR CREADO (2026-03-31 10:00:00)  // unchanged
SALTADO (2026-03-31 10:00:00)      // NEW: timestamp added
ERROR: Falta el campo requerido "correo" en la fila 3.  // NEW: from requiredCell
ERROR: No se pudo compartir el archivo 1BxiMVs...       // NEW: from shareFileAsViewer
ERROR: Profesor no encontrado en Directorio: John Smith  // NEW: from directoryLookup
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded column indexes | `mapHeaders` + `requiredCell`/`safeCell` | Already in codebase for 6/7 templates | report_delivery is the only holdout |
| `shareFileAsViewer` return ignored | Check `{ success, error }` return | Fix needed (this phase) | Prevents broken link emails |
| Silent error absorption as "SALTADO" | Error object convention `{ error: msg }` | Fix needed (this phase) | Makes failures visible |

## Open Questions

1. **Legacy report_delivery code path in _executeBatch**
   - What we know: Main.gs:360-366 has a hardcoded `if (template.id === 'report_delivery')` block that loads the Directorio sheet. This is legacy code that should eventually use `prepareExtraData` (Phase 3, ARCH-01).
   - What's unclear: Should Phase 1 refactor this into `prepareExtraData`, or just add `mapHeaders` to the existing legacy block?
   - Recommendation: Keep the legacy `if` block but add `mapHeaders(dirSheet)` to it and pass `extraData.dirHeaders`. Full refactoring to `prepareExtraData` is Phase 3 scope (ARCH-01). Minimum change for Phase 1.

2. **getRecipientEmail for all templates**
   - What we know: Only certificate and report_delivery have Drive sharing side effects. The other 5 templates' `processRow` has no side effects beyond data extraction.
   - What's unclear: Should all 7 templates get `getRecipientEmail`, or only the 2 with side effects?
   - Recommendation: Add `getRecipientEmail` to all templates for consistency. For simple templates it is one line (`return safeCell(row, headers['correo'])`). For report_delivery it does the directory lookup. This makes pre-flight validation work uniformly across all templates.

3. **certificateTemplate: What if fileId is null?**
   - What we know: `extractFileId(enlace)` can return `null` if the URL format is unrecognized. Currently the code only shares if `fileId` is truthy (line 85-88) but still sends the email with the original URL.
   - What's unclear: Should a null fileId be treated as an error (can't share = broken link) or acceptable (maybe the link is a public URL)?
   - Recommendation: Keep current behavior (skip sharing if no fileId, still send email). The URL may be publicly accessible. Only fail if `shareFileAsViewer` is called and explicitly fails.

## Sources

### Primary (HIGH confidence)
- `src/Core.gs` -- sendBatch implementation (lines 287-336), isValidEmail (line 144), shareFileAsViewer (lines 344-354), mapHeaders (lines 58-67), requiredCell (lines 92-98), now() (lines 135-137)
- `src/Main.gs` -- _executeBatch implementation (lines 325-438), processFn catch block (lines 418-421), legacy report_delivery code path (lines 360-366)
- `src/Templates.gs` -- certificateTemplate.processRow (lines 78-98), reportDeliveryTemplate (lines 395-474), directoryLookup (lines 413-426)
- `.planning/phases/01-reliability-hardening/01-CONTEXT.md` -- All 15 locked decisions (D-01 through D-15)

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` -- ROBUST-01, ROBUST-02, ROBUST-06, ARCH-02 acceptance criteria
- `CLAUDE.md` -- GAS deployment constraints, testing approach

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No external libraries; all changes are to existing GAS code using existing utility functions
- Architecture: HIGH - All patterns derive directly from existing code conventions and locked decisions
- Pitfalls: HIGH - All pitfalls identified from direct code analysis of the three source files

**Research date:** 2026-03-31
**Valid until:** Indefinite (code-only analysis, no external dependencies)
