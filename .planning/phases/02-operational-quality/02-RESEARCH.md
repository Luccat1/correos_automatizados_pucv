# Phase 2: Operational Quality - Research

**Researched:** 2026-04-15
**Domain:** Google Apps Script -- UI dialogs, toast notifications, sheet logging, batch control flow
**Confidence:** HIGH

## Summary

Phase 2 enhances the operator experience across three pillars: (1) safe re-runs by skipping already-processed rows, (2) pre-flight awareness via an enriched send dialog showing quota/summary/warnings, and (3) post-run observability via a persistent Log sheet and in-flight toast progress. All work is constrained to Google Apps Script's server-side `.gs` files and one client-side `.html` dialog, with no external dependencies.

The existing codebase already has partial infrastructure for most requirements. The `_executeBatch` processFn already skips rows with "enviado" or "borrador" status (ROBUST-03 is partially done but needs to also re-process ERROR rows). The `SendDialog.html` already shows template name, data sheet, and row count (UX-02 needs quota and sender alias added). The `sendBatch` loop in Core.gs already has a throttle cadence (every 20 rows) where toast calls can be inserted (LOG-02). The main new capabilities are: the Log sheet writer (LOG-01), the configuration validator (UX-01), and the large-batch warning (ROBUST-05).

**Primary recommendation:** Implement in two plans -- Plan 1 for backend logic (skip logic fix, config validator, log writer, toast progress in sendBatch), Plan 2 for dialog UI (pre-flight summary with quota, large-batch warning confirmation).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ROBUST-03 | Re-run only processes ERROR or empty-status rows; ENVIADO/BORRADOR untouched | Existing skip logic in `_executeBatch` processFn (line 383) already skips enviado/borrador/saltado. Fix: also skip rows with non-error statuses, and re-process ERROR rows. See Architecture Patterns section. |
| ROBUST-04 | Quota forecast in send dialog | `MailApp.getRemainingDailyQuota()` returns remaining recipients. Shared counter with GmailApp. Add server-side function to return quota, call from dialog. See Code Examples. |
| ROBUST-05 | Hard confirmation when batch > configurable threshold (default 50) | Implement in SendDialog.html client-side JS. Threshold read from Config sheet or hardcoded default. See Architecture Patterns. |
| LOG-01 | Persistent Log sheet with batch summary row | New function `_appendLogEntry()` in Main.gs. Create/find "Log" sheet, append row. See Code Examples. |
| LOG-02 | Toast progress during long batches | `SpreadsheetApp.getActiveSpreadsheet().toast(msg, title, seconds)` called inside `sendBatch` loop. See Architecture Patterns. |
| UX-01 | Consolidated config validation before send | New `_validateConfig()` function checking: template exists, data sheet exists, required headers present, unknown template ID. Run at top of `_showSendDialog`. See Architecture Patterns. |
| UX-02 | Pre-flight summary in send dialog (template, sheet, rows, quota, alias) | Extend `_showSendDialog` to pass quota + senderAlias to template. Extend SendDialog.html to display them. See Code Examples. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Language**: Code (variables, functions) in English; UI messages in Spanish; JSDoc in English
- **Column naming**: snake_case lowercase (e.g., `estado_envio`)
- **GAS constraints**: No import/require; no `let` at module level; no `setTimeout` (use `Utilities.sleep`); all `.gs` files share global scope
- **Deployment**: Manual copy-paste to GAS editor (no build step)
- **Testing**: Manual via GAS menu items (Enviar Prueba, Vista Previa)
- **Private functions**: Prefix with `_` (e.g., `_appendLogEntry()`)
- **processRow convention**: Return `null` to skip, never throw for skippable rows

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Google Apps Script | V8 runtime | Server-side execution | Only option for bound spreadsheet scripts |
| SpreadsheetApp | built-in | Sheet read/write, toast, UI | GAS native service |
| MailApp | built-in | `getRemainingDailyQuota()` | Only way to check email quota |
| GmailApp | built-in | `sendEmail()`, `createDraft()` | Already used for email dispatch |
| HtmlService | built-in | Modal dialogs (SendDialog.html) | GAS native for custom UI |
| Session | built-in | `getActiveUser().getEmail()` for operator identity | GAS native |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Utilities | built-in | `sleep()`, `formatDate()` | Throttling, timestamps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SpreadsheetApp.toast | HtmlService sidebar | Sidebar is persistent but overkill for progress; toast is non-blocking and simpler |
| Log sheet (append row) | console.log only | console.log is ephemeral (GAS Execution Log); sheet log is persistent and operator-visible |
| Client-side confirm in dialog | Server-side `confirmAction()` | Server-side would require closing dialog + reopening; client-side JS confirm is seamless |

## Architecture Patterns

### Recommended Changes by File

```
src/
  Core.gs       -- Add toast progress callback support to sendBatch()
  Main.gs       -- Add _validateConfig(), _appendLogEntry(), fix skip logic, enhance _showSendDialog()
  SendDialog.html -- Add quota display, sender alias, large-batch warning UI
```

### Pattern 1: Status-Based Row Skipping (ROBUST-03)

**What:** The processFn inside `_executeBatch` must skip rows that are already successfully processed, but re-process rows marked as ERROR.

**Current behavior (Main.gs lines 380-384):**
```javascript
const currentStatus = String(row[statusCol - 1] || '').toLowerCase();
if (currentStatus.includes('enviado') || currentStatus.includes('borrador') || currentStatus.includes('saltado')) {
  return null;
}
```

**Required behavior:**
```javascript
const currentStatus = String(row[statusCol - 1] || '').toLowerCase();
// Skip already-sent or drafted rows; re-process empty or ERROR rows
if (currentStatus.includes('enviado') || currentStatus.includes('borrador')) {
  return null;
}
// Remove 'saltado' from skip list -- it should be re-processable
// ERROR rows fall through to processing (they have status but not enviado/borrador)
```

**Key decision:** Remove `saltado` from the skip list. Rows with "SALTADO" were previously errors silently marked; after Phase 1 these should now show "ERROR: reason". But any legacy SALTADO rows should be re-processable. Only "ENVIADO" and "BORRADOR" are terminal states.

### Pattern 2: Pre-flight Validation (UX-01)

**What:** Consolidated validation that runs once before opening the send dialog, reporting ALL issues in a single alert.

**When to use:** At the start of `_showSendDialog()`, before building the HTML template.

```javascript
function _validateConfig(config, template, sheet) {
  const errors = [];

  // Check template exists (already handled by _getSelectedTemplate)
  // Check data sheet headers
  const headers = mapHeaders(sheet);
  const missing = (template.requiredHeaders || []).filter(h => headers[h] === undefined);
  if (missing.length > 0) {
    errors.push('Columnas faltantes: ' + missing.join(', '));
  }

  // Check for empty data
  const rowCount = sheet.getLastRow() - 1;
  if (rowCount <= 0) {
    errors.push('La hoja de datos esta vacia.');
  }

  return errors; // empty array = valid
}
```

**Integration point:** Call from `_showSendDialog()`. If errors array is non-empty, show one consolidated alert with all issues.

### Pattern 3: Toast Progress in sendBatch (LOG-02)

**What:** Non-blocking progress notifications during batch execution.

**GAS API:** `SpreadsheetApp.getActiveSpreadsheet().toast(message, title, timeoutSeconds)`
- `timeoutSeconds = -1` keeps toast visible until replaced
- Toast is non-blocking -- does not pause script execution
- Toast only visible in the spreadsheet tab, not the script editor

**Implementation approach:** Add an optional `onProgress` callback to `sendBatch` options. Caller provides the callback; sendBatch calls it at the throttle interval (every `sleepEvery` emails).

```javascript
// In sendBatch, inside the loop, at the throttle check:
if (options.sleepEvery && (i + 1) % options.sleepEvery === 0) {
  if (typeof options.onProgress === 'function') {
    options.onProgress(i + 1, rows.length, processed, errors);
  }
  sleep(options.sleepMs || 1000);
}
```

```javascript
// In _executeBatch, when building options:
options.onProgress = function(current, total, sent, errs) {
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Procesando fila ' + current + ' de ' + total + ' (' + sent + ' enviados, ' + errs + ' errores)',
    'Progreso de envio',
    -1
  );
};
```

### Pattern 4: Persistent Log Sheet (LOG-01)

**What:** Append one summary row per batch run to a "Log" sheet.

**Columns:** `timestamp | template_id | template_name | operator_email | total_rows | sent_count | error_count | as_draft | subject`

**Implementation:**
```javascript
function _appendLogEntry(logData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName('Log');
  if (!logSheet) {
    logSheet = ss.insertSheet('Log');
    logSheet.getRange(1, 1, 1, 9).setValues([[
      'Timestamp', 'Template ID', 'Template', 'Operador',
      'Total Filas', 'Enviados', 'Errores', 'Borrador', 'Asunto'
    ]]);
    logSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f3f3f3');
    logSheet.setFrozenRows(1);
  }
  logSheet.appendRow([
    logData.timestamp, logData.templateId, logData.templateName,
    logData.operator, logData.totalRows, logData.sent,
    logData.errors, logData.asDraft, logData.subject
  ]);
}
```

**Call site:** At the end of `_executeBatch`, after `batchUpdateColumn` and before `showResult`.

### Pattern 5: Large-Batch Warning (ROBUST-05)

**What:** When processable row count exceeds threshold, require explicit confirmation.

**Threshold source:** Config sheet key `batch_warning_threshold` (default: 50).

**Implementation:** In SendDialog.html, the server passes the threshold and processable row count. Client-side JS shows a red warning banner and requires the operator to check a confirmation checkbox before the submit button is enabled.

```javascript
// Server-side: new function to get pre-flight data
function getPreflightData() {
  var resolved = _getSelectedTemplate();
  if (!resolved) return null;
  var config = resolved.config;
  var template = resolved.template;
  var sheet = _getDataSheet(config.dataSheet);
  if (!sheet) return null;
  return {
    quota: MailApp.getRemainingDailyQuota(),
    senderAlias: config.senderAlias || template.senderAlias || '',
    batchThreshold: parseInt(config.extras.batch_warning_threshold) || 50
  };
}
```

### Anti-Patterns to Avoid

- **Do NOT use `ui.alert()` for progress** -- it blocks script execution and requires user click to dismiss. Use `toast()` instead.
- **Do NOT check quota per-row in the dialog** -- call `getRemainingDailyQuota()` once when opening the dialog, not per row. The quota call has its own rate limits.
- **Do NOT create a new Log sheet per batch** -- use a single persistent "Log" sheet with appended rows.
- **Do NOT use `google.script.run` synchronously** -- all calls are async. Chain with `.withSuccessHandler()`.
- **Do NOT pass Date objects from server to client** -- they don't serialize cleanly. Pass formatted strings instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email quota checking | Custom quota tracker | `MailApp.getRemainingDailyQuota()` | GAS native, accounts for all sends including manual |
| Toast notifications | Custom sidebar progress UI | `SpreadsheetApp.toast()` | Non-blocking, built-in, no HTML overhead |
| Sheet creation | Manual Range manipulation for Log | `Sheet.appendRow()` | Handles row insertion, auto-expands sheet |
| User identity | Custom login/auth | `Session.getActiveUser().getEmail()` | GAS native, works in bound scripts |

**Key insight:** Every feature in this phase can be built entirely with GAS built-in services. No external libraries, no API calls, no OAuth beyond what GAS already provides.

## Common Pitfalls

### Pitfall 1: MailApp vs GmailApp Quota Confusion
**What goes wrong:** Developer assumes MailApp and GmailApp have separate quotas and double-counts.
**Why it happens:** Different service names suggest different quota pools.
**How to avoid:** They share one quota. `MailApp.getRemainingDailyQuota()` reflects total remaining for both services. Use this single call.
**Warning signs:** Quota number seems too high or too low relative to observed sends.

### Pitfall 2: Toast Visibility Scope
**What goes wrong:** Developer calls `toast()` but the operator never sees it.
**Why it happens:** Toast only appears in the spreadsheet tab. If the operator is viewing the Apps Script editor, another sheet, or another browser tab, the toast is invisible.
**How to avoid:** Document this limitation for operators. Toast is best-effort UX, not a guaranteed notification.
**Warning signs:** Operator reports not seeing any progress during long batches.

### Pitfall 3: HtmlService Template Variable Escaping
**What goes wrong:** GAS templated values (`<?= var ?>`) break the HTML if they contain special characters.
**Why it happens:** `<?= ?>` does HTML-escape, but `<?!= ?>` does NOT. Mixing them up causes either broken display or XSS.
**How to avoid:** Use `<?= ?>` (escaped) for user-visible text values. Use `<?!= ?>` only for trusted HTML fragments.
**Warning signs:** Template names or values with `<`, `>`, `&`, or quotes break the dialog.

### Pitfall 4: appendRow Performance on Large Log Sheets
**What goes wrong:** `appendRow()` gets slow as the Log sheet grows to thousands of rows.
**Why it happens:** `appendRow()` scans for the last row each time.
**How to avoid:** For this use case (one append per batch run, not per email), performance is fine. If it ever becomes an issue, use `getLastRow() + 1` with `setValues()` instead.
**Warning signs:** Only relevant if Log sheet exceeds ~10,000 rows (unlikely for institutional email system).

### Pitfall 5: Race Condition with Dialog Close
**What goes wrong:** `google.script.run.executeBatchFromDialog()` starts server-side execution, but `google.script.host.close()` in the success handler closes the dialog before the batch finishes. The batch continues server-side but the user sees no feedback.
**Why it happens:** The success handler fires when `executeBatchFromDialog` returns, which is after the entire batch completes. This is actually correct in GAS -- server functions run to completion. But if the function throws partway, the failure handler fires and the dialog stays open.
**How to avoid:** Current pattern is correct. The dialog closes only on success. Toast messages provide progress while the dialog's "Procesando..." loader is visible. `showResult()` alert appears after dialog closes.
**Warning signs:** None expected; current pattern is sound.

### Pitfall 6: Processable Row Count vs Total Row Count
**What goes wrong:** The dialog shows total rows but the actual processable count (excluding already-sent rows) is much smaller.
**Why it happens:** `sheet.getLastRow() - 1` counts all data rows, including already-processed ones.
**How to avoid:** Count processable rows server-side by reading the status column and filtering. Pass both total and processable counts to the dialog.
**Warning signs:** Operator sees "200 filas" but only 5 actually get processed.

## Code Examples

### Getting Quota for Pre-flight Display
```javascript
// Server-side function called from SendDialog.html
function getPreflightData() {
  return {
    quota: MailApp.getRemainingDailyQuota(),
    senderAlias: /* resolved from config */,
    batchThreshold: /* from config.extras or default 50 */
  };
}
```

### Toast Progress Pattern
```javascript
// Source: GAS official docs - SpreadsheetApp.toast()
SpreadsheetApp.getActiveSpreadsheet().toast(
  'Procesando fila 40 de 200 (38 enviados, 2 errores)',
  'Progreso de envio',
  -1  // stays visible until replaced or manually closed
);
```

### Log Sheet Append
```javascript
// Source: GAS official docs - Sheet.appendRow()
var logSheet = ss.getSheetByName('Log');
logSheet.appendRow([
  now(),                              // timestamp
  'certificate',                      // template_id
  'Certificado de Participacion',     // template_name
  Session.getActiveUser().getEmail(), // operator
  150,                                // total rows
  148,                                // sent
  2,                                  // errors
  false,                              // as_draft
  'Certificado CELE 2026'            // subject
]);
```

### Client-Side Quota Display in Dialog
```html
<!-- In SendDialog.html -->
<div id="quota-info" class="summary" style="display:none;">
  <strong>Cuota disponible:</strong> <span id="quota-count">--</span> correos restantes
</div>

<script>
  // Fetch pre-flight data on dialog load
  google.script.run
    .withSuccessHandler(function(data) {
      document.getElementById('quota-count').textContent = data.quota;
      document.getElementById('quota-info').style.display = 'block';
      // Show warning if batch exceeds threshold
      if (parseInt('<?= rowCount ?>') > data.batchThreshold) {
        document.getElementById('batch-warning').style.display = 'block';
      }
    })
    .getPreflightData();
</script>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MailApp.sendEmail | GmailApp.sendEmail | Project already uses GmailApp | Enables aliases, drafts |
| ui.alert for progress | SpreadsheetApp.toast | Available since 2014 | Non-blocking feedback |
| Per-row quota check | Single pre-batch quota check | Best practice | Avoids rate limit on quota API |

**Deprecated/outdated:**
- None relevant. GAS built-in APIs used here are stable and unchanged.

## Open Questions

1. **Processable row count accuracy**
   - What we know: `sheet.getLastRow() - 1` includes all rows. We need to count only rows with empty or ERROR status.
   - What's unclear: Whether reading the full status column for counting is too slow for very large sheets (1000+ rows).
   - Recommendation: Read status column with `getRange().getValues()` and filter. For typical PUCV usage (50-300 rows), performance is fine. If needed, use `getRange(2, statusCol, lastRow-1, 1)` to read only the status column.

2. **Batch warning threshold configuration**
   - What we know: Default is 50. Should be configurable.
   - What's unclear: Whether to use the Config sheet's `extras` or a hardcoded default.
   - Recommendation: Read from Config sheet key `batch_warning_threshold` if present, fall back to 50. Add this key to `_generateSheets` as optional.

## Sources

### Primary (HIGH confidence)
- [GAS Quotas Documentation](https://developers.google.com/apps-script/guides/services/quotas) - Quota limits and behavior
- [MailApp Reference](https://developers.google.com/apps-script/reference/mail/mail-app) - getRemainingDailyQuota() API
- [HtmlService Communication](https://developers.google.com/apps-script/guides/html/communication) - google.script.run patterns
- [google.script.run Reference](https://developers.google.com/apps-script/guides/html/reference/run) - Client-server communication

### Secondary (MEDIUM confidence)
- [SpreadsheetApp toast tutorial](https://spreadsheet.dev/toast-notifications-in-google-sheets) - Toast usage patterns
- [Toast with Google Apps Script](https://sheets-pratique.com/en/codes/toast) - Toast parameter reference
- [MMailApp analysis](https://max-makhrov.medium.com/mmailapp-for-google-apps-script-gmailapp-mailapp-gmail-api-804079828051) - MailApp vs GmailApp quota sharing confirmation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All GAS built-in services, well-documented, stable APIs
- Architecture: HIGH - Patterns are straightforward GAS idioms, no novel approaches needed
- Pitfalls: HIGH - Based on direct code analysis of existing codebase + documented GAS limitations

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (GAS built-in APIs are stable; 30 days is conservative)
