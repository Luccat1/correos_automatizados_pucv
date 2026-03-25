# Domain Pitfalls

**Domain:** Google Apps Script institutional email automation (bound Spreadsheet)
**Researched:** 2026-03-25
**Confidence:** HIGH for GAS quotas and execution limits (official Google documentation, stable APIs); MEDIUM for HTML email rendering (industry consensus, stable client behaviors); MEDIUM for Spanish encoding (GAS runtime behavior, well-documented UTF-8 quirks)

---

## Critical Pitfalls

Mistakes that cause silent data corruption, mass send failures, or rewrites.

---

### Pitfall 1: Silent Row Errors Absorbed by sendBatch

**What goes wrong:** In `_executeBatch`, the `processFn` wraps `template.processRow()` in a try/catch that returns `null` on any exception. `sendBatch` then marks the row as `"SALTADO"` — indistinguishable from intentionally skipped rows. A misconfigured column name, a bad Drive URL, or a missing `nombre` cell causes dozens of rows to silently skip with no operator-visible error detail.

**Why it happens:** The catch block in `_executeBatch` (line 366-368 of Main.gs) logs to console but returns `null`. The `sendBatch` loop pushes `["SALTADO"]` for any `null` return regardless of cause. After the run, the operator sees "0 errors, 47 procesados" but 12 rows say "SALTADO" — they don't know why.

**Consequences:** Emails never sent, no retries, no row-level error detail preserved in the sheet. An operator may assume SALTADO means "already sent" and close the spreadsheet.

**Current system exposure:** HIGH. This is the current architecture. The status column stores the full error string when `sendEmail` itself fails (e.g. quota), but not when `processRow` throws — those become undifferentiated SALTADO.

**Prevention:**
- Distinguish skip reasons: use a status like `"ERROR: [message]"` for exceptions vs `"SALTADO (ya enviado)"` for intentional skips.
- Write the caught exception message into `statuses` instead of returning `null` from the catch block.
- Log a per-row error summary at the end of the batch using `console.error`.

**Detection:** After a batch run, count SALTADO rows. If count > expected skips, investigate the Apps Script Executions log for caught exceptions.

---

### Pitfall 2: 6-Minute Execution Time Limit Kills Mid-Batch

**What goes wrong:** GAS hard-terminates any execution at 6 minutes (360 seconds) for consumer accounts and Workspace accounts alike. A batch of 200 rows with 1-second sleeps every 20 emails takes at minimum ~10 seconds of sleep alone, plus Drive sharing API calls (~0.5-1s each for `shareFileAsViewer`). The `certificate` and `report_delivery` templates call `DriveApp.addViewer()` per row. A batch of 150 certificate rows = 150 Drive API calls + 150 email sends + 7 throttle sleeps = realistic timeout territory.

**Why it happens:** GAS does not support async execution or background jobs from a menu-triggered function. The 6-minute wall is non-negotiable and non-extendable for menu triggers.

**Consequences:** Batch stops mid-run. Status column is NOT written (because `batchUpdateColumn` is called only after `sendBatch` returns). Rows that were sent get no status update; re-running the batch resends those rows because status check finds them empty.

**Current system exposure:** HIGH for `certificate` and `report_delivery` templates. MEDIUM for others (no Drive calls). The `batchUpdateColumn` write-after-batch pattern amplifies this: no partial save.

**Prevention:**
- Write status incrementally per row, not in a single batch write at the end. Trade performance for resilience.
- Or write in mini-batches: every N rows, flush statuses to the sheet.
- Add a `batchLimit` config option (already supported in `sendBatch`) and document recommended safe limits per template type: ~80 rows for Drive-heavy templates, ~150 for email-only.
- For Drive-sharing templates, consider separating the share step into a pre-run that can be run independently.

**Detection:** If the Executions panel shows a run terminated with "Exceeded maximum execution time", and the status column has un-updated rows from that run.

---

### Pitfall 3: Daily Email Quota Exhaustion Without Recovery Path

**What goes wrong:** Gmail quota is checked at `< 5` remaining before each send. When quota exhausts mid-batch, remaining rows are marked `"ERROR: QUOTA INSUFICIENTE"`. On the next day when quota resets, re-running the batch skips rows already marked `"ENVIADO"` but also skips rows marked `"ERROR: QUOTA INSUFICIENTE"` — because the status check only skips strings containing `"enviado"`, `"borrador"`, or `"saltado"`. So quota-failed rows WILL be retried the next day. This is actually correct behavior, but operators may not know they need to re-run.

**Secondary issue:** The quota for consumer Google accounts is 100 emails/day. For Google Workspace (pucv.cl accounts), it is 1,500 emails/day via GmailApp/MailApp. However, `MailApp.getRemainingDailyQuota()` reports the MailApp quota, which is separate from GmailApp quota. If the system uses `GmailApp.sendEmail()` (which it does), the GmailApp quota may not accurately match what `checkQuota()` returns. They deplete from different buckets.

**Current system exposure:** MEDIUM. The quota check logic is sound for preventing hard failures. The MailApp vs GmailApp discrepancy is a real risk that is not documented.

**Prevention:**
- Document quota limits prominently in the operator guide: 1,500/day for pucv.cl Workspace accounts.
- Add a pre-flight check that shows estimated quota consumption vs current remaining before allowing batch start.
- Mark quota-failed rows with a distinct status like `"PENDIENTE (quota)"` so operators know to re-run — but ensure the re-run logic recognizes this status as retriable.
- Consider using `MailApp.sendEmail()` instead of `GmailApp.sendEmail()` for consistency with `checkQuota()`, or switch to checking `GmailApp` quota directly.

**Detection:** After a batch run, look for `"ERROR: QUOTA INSUFICIENTE"` rows in the status column.

---

### Pitfall 4: Drive Sharing Failure Silently Proceeds to Email Send

**What goes wrong:** In `certificateTemplate.processRow()` and `reportDeliveryTemplate.processRow()`, `shareFileAsViewer()` is called before the email is sent. `shareFileAsViewer()` catches its own exceptions and returns `{ success: false, error: ... }` — but `processRow` ignores the return value. If sharing fails (wrong file ID, permission denied, file deleted), the email is still sent with a link the student cannot access.

**Why it happens:** `shareFileAsViewer` is designed as a safe wrapper that doesn't throw, and `processRow` was written without checking its return value.

**Consequences:** Student receives a certificate email, clicks the Drive link, gets "Access Denied". Support burden. May require manual re-sharing and a follow-up email.

**Current system exposure:** HIGH. Both `certificate` and `report_delivery` templates have this exact code path.

**Prevention:**
- Check the return value of `shareFileAsViewer` in `processRow`. If it fails, either throw (so the row is marked ERROR) or include a warning flag in the returned data object that `buildHtml` can use to show a fallback message.
- Validate Drive file IDs before the batch starts by sampling a few rows.
- Log sharing failures separately from email failures.

**Detection:** Watch for `DriveApp` permission errors in the Apps Script Executions log alongside `"ENVIADO"` statuses.

---

## Moderate Pitfalls

---

### Pitfall 5: `<style>` Block Stripped by Gmail

**What goes wrong:** The `buildEmailLayout()` function generates HTML with a `<style>` block in `<head>`. Gmail's web client (both consumer and Workspace) strips `<style>` tags from the `<head>` entirely when rendering received emails. Rules like `.container`, `.header`, `.content`, `.footer` defined in the stylesheet never apply.

**Why it happens:** Gmail's email parser removes `<head>` and its contents for security. This is Gmail-specific, well-documented behavior that has not changed in years.

**Consequences:** The email relies on these class-based rules for max-width, font, and color. Without them, the email layout degrades. However, the current code also has inline `style=""` attributes on all the critical elements, which Gmail does respect. So the actual visible degradation is low — the styled elements use both class and inline.

**Current system exposure:** LOW in practice. The `buildEmailLayout` output uses both inline styles (Gmail-safe) and a stylesheet (ignored by Gmail). The inline styles cover all critical visual elements. The stylesheet is redundant.

**Prevention:** Remove the `<style>` block entirely and rely only on inline styles. This eliminates the false safety of the stylesheet and makes the code honest about what actually renders. No functional change needed in the short term, but the stylesheet creates maintenance confusion.

**Detection:** Send a test to a Gmail address and use "View original" to confirm inline styles are present on all elements.

---

### Pitfall 6: Outlook Desktop Ignores `border-radius` and `box-shadow`

**What goes wrong:** `buildButton()` uses `border-radius: 4px` on the anchor tag. `buildInfoBox()` uses no rounded corners. `buildWarningBox()` similarly clean. However, if future components add `border-radius`, `box-shadow`, or CSS gradients, Outlook 2016/2019/365 desktop (Word rendering engine) will ignore them.

**Why it happens:** Outlook desktop uses the Word HTML renderer (not a browser engine). It ignores most CSS that isn't basic inline styling. This is a permanent limitation.

**Consequences:** Buttons and boxes look square and flat in Outlook desktop. Cosmetically degraded but functionally intact — links still work.

**Current system exposure:** LOW. Existing templates are defensively simple. `border-radius: 4px` on the button is the only non-universal property. `border-radius: 8px` appears on the code display box in `codeDeliveryTemplate.buildHtml()` — this will render as a hard-cornered box in Outlook desktop.

**Prevention:**
- Keep decorative CSS minimal. Round corners: use with awareness.
- Never rely on `display: flex`, `grid`, `position`, CSS animations, or media queries in email HTML — none render in Outlook.
- Test new templates against Litmus or Email on Acid before deploying, or at minimum test by forwarding to an Outlook account.

**Detection:** Forward test email to an Outlook account and compare visually.

---

### Pitfall 7: Spanish Characters Corrupted by Missing or Wrong Charset Declaration

**What goes wrong:** Content with Spanish characters (á, é, í, ó, ú, ñ, ü, ¿, ¡) can appear as mojibake (`Ã©`, `Ã±`) if the email is constructed without proper charset declaration or if string encoding is inconsistent.

**Why it happens:** GAS internally uses UTF-16, but `GmailApp.sendEmail()` serializes the HTML body to the email using UTF-8. If the `<meta charset="UTF-8">` declaration is absent or if the HTML string itself contains mixed encodings, some clients render incorrectly.

**Current system exposure:** LOW. `buildEmailLayout()` correctly declares `<meta charset="UTF-8">` at line 399 of Core.gs. All string literals in templates are hardcoded UTF-8. `safeCell()` uses `.toString()` which preserves GAS internal encoding. `Utilities.formatDate()` is locale-safe.

**Risk area:** The `_getConfig()` function reads from a Spreadsheet where users type free-form values. If a cell contains special characters entered via an unusual keyboard or copy-paste from Word (smart quotes `"`, em dash `—`, non-breaking spaces), these can appear as garbled characters in email subjects or body text. GAS Spreadsheet cells are UTF-16 internally and convert fine on `.toString()`, but smart quotes and Word-specific Unicode characters may look wrong in some email clients.

**Prevention:**
- Sanitize config values on read: strip or normalize smart quotes, em dashes, non-breaking spaces before using them in email subjects or bodies.
- Test email subjects with accented characters — subjects are not wrapped in a charset container like the HTML body.

**Detection:** After sending a test, check the raw email source for `=?UTF-8?` encoded subject lines with incorrect characters.

---

### Pitfall 8: `formatDateEs()` Timezone Mismatch for Date Cells from Sheets

**What goes wrong:** When Google Sheets reads a date cell value with `.getValues()`, it returns a JavaScript `Date` object representing the date in the spreadsheet's timezone. `formatDateEs()` calls `value.getDate()`, `value.getMonth()`, and `value.getFullYear()` using the script's local timezone (which defaults to the spreadsheet's timezone, typically `America/Santiago`). If the spreadsheet timezone is ever changed (e.g., to UTC for some administrative reason), dates near midnight can shift by one day.

**Why it happens:** `Date.getDate()` uses local time (the V8 engine's timezone, which follows the Apps Script timezone property of the script project, defaulting to the spreadsheet timezone).

**Current system exposure:** LOW but present. Currently works correctly because the spreadsheet timezone is `America/Santiago` and `now()` uses `"America/Santiago"` explicitly. But `formatDateEs()` uses raw JS date methods, not `Utilities.formatDate()`.

**Prevention:**
- Replace `formatDateEs()` to use `Utilities.formatDate(value, "America/Santiago", "d")` etc., making the timezone explicit rather than relying on the script default.
- Document that the spreadsheet timezone must remain `America/Santiago`.

**Detection:** Test with a date cell set to `2026-03-01` and verify the email renders "1 de marzo de 2026" not "28 de febrero de 2026".

---

### Pitfall 9: GmailApp Alias Silently Falls Back to Primary Account

**What goes wrong:** If `senderAlias` is set (e.g., `cele.dgai@pucv.cl`) but the alias is not configured in Gmail settings of the sending account, `_getAliasesCache()` will not find it, log a warning, and send from the primary account. The email arrives from a different address than intended, with no error surfaced to the operator.

**Why it happens:** `sendEmail()` in Core.gs (line 243-246) logs a `console.warn` but proceeds silently. The status column shows `"ENVIADO"` as if nothing was wrong.

**Current system exposure:** MEDIUM. The `report_delivery` template hardcodes `senderAlias: 'cele.dgai@pucv.cl'`. If this alias is not configured in Gmail of the account running the script, all reports are sent from the wrong address. This is an institutional trust issue.

**Prevention:**
- Surface alias fallback as a visible warning to the operator: add a pre-flight check in `_showSendDialog` that verifies the configured alias exists, or show a visible warning in the send summary.
- Or mark rows with a non-fatal warning status like `"ENVIADO (alias no disponible)"`.

**Detection:** Run `_getAliasesCache()` in the GAS editor console before a batch and verify the target alias is present.

---

### Pitfall 10: `reportDeliveryTemplate` Uses Hardcoded Column Indexes

**What goes wrong:** `reportDeliveryTemplate.processRow()` accesses columns by hardcoded index (`row[1]`, `row[2]`, `row[3]`, `row[4]`) rather than using `mapHeaders()` + column name lookup. This is documented with a comment ("Indexes based on Informe script"), meaning the template is tightly coupled to the output format of a separate script.

**Why it happens:** The `report_delivery` data sheet is generated by an external "Informe" script that produces a fixed column structure.

**Consequences:** If the Informe script's output format ever changes (adds a column, reorders columns), `report_delivery` silently reads wrong columns — sending reports to wrong emails or sharing wrong documents — without any error.

**Current system exposure:** HIGH for schema coupling risk. Medium probability because external scripts do change.

**Prevention:**
- Add column name headers to the Informe output sheet (if possible) and switch `report_delivery` to use `mapHeaders()`.
- At minimum, add a validation in `processRow` that checks whether `row[3]` looks like a valid Google Doc ID (25+ alphanumeric characters) and `row[1]` is a non-empty string. Throw a descriptive error if not.

**Detection:** Spot-check after any change to the Informe script by running a test send and verifying the correct professor receives the correct report.

---

## Minor Pitfalls

---

### Pitfall 11: Email Subject Line Length and Special Character Rendering

**What goes wrong:** Email subjects are set to `template.headerTitle` (e.g., `"CONFIRMACIÓN DE APERTURA DE CURSO"`). Some email clients truncate subjects at ~60 characters in the inbox list view. More importantly, subjects are not encoded in quoted-printable or base64 by GAS — they are passed directly to `GmailApp.sendEmail()`, which handles RFC 2047 encoding automatically. However, if a subject contains emoji (like the ones in `showResult` and menu items), some older mail servers may reject the message or display garbled characters.

**Current system exposure:** LOW. Header titles do not currently contain emoji. Subject lines are within reasonable length.

**Prevention:** Keep subjects under 60 characters for inbox preview. Avoid emoji in subject lines. If emoji are added to future templates (e.g., the `alertBand` content is `"🚨 ¡ÚLTIMO PLAZO!..."`) — this is used in the alert band HTML, not the subject, so it is safe.

---

### Pitfall 12: `extractFileId` Regex Matches Non-ID Strings

**What goes wrong:** `extractFileId()` uses `/[-\w]{25,}/` which matches any 25+ character alphanumeric/hyphen sequence. A Google Drive URL like `https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/view` correctly matches the file ID. But a URL like `https://docs.google.com/spreadsheets/d/some-long-spreadsheet-id-here-12345/edit#gid=0` also matches, but the extracted ID may include URL path fragments if the regex anchor fails on unusual URL formats.

**Current system exposure:** LOW. Drive URLs in practice follow consistent patterns. The regex is functional for known-good inputs.

**Prevention:** Use a more specific regex targeting `/\/d\/([a-zA-Z0-9_-]{25,})/` or validate the extracted ID by attempting `DriveApp.getFileById()` and catching the exception.

---

### Pitfall 13: `onOpen` Trigger Fails for New Editors Without Re-Authorization

**What goes wrong:** When the spreadsheet is shared with a new editor and they open it, `onOpen()` runs under their account. If the script requires authorizations (GmailApp, DriveApp) that haven't been granted by that user, the menu may appear without items or GAS silently fails to add it.

**Why it happens:** GAS bound scripts run as the active user (not the owner) for simple triggers like `onOpen`. Each user must independently authorize the required OAuth scopes.

**Current system exposure:** MEDIUM. The system is designed for institutional use by multiple staff members. Any new user of the spreadsheet needs to authorize the script.

**Prevention:**
- Include an authorization step in onboarding: first use should trigger the authorization flow. This happens automatically the first time a user runs any function requiring OAuth.
- Document this in operator documentation: "The first time you use the menu, Google will ask you to authorize access to Gmail and Drive."

---

### Pitfall 14: Sheets `getDataRange()` Includes Trailing Empty Rows

**What goes wrong:** `sheet.getDataRange()` returns the range from A1 to the last cell that has ever had content, including cells that were filled and then cleared. If someone deletes row data by pressing Delete (clearing content but not deleting the row), `getDataRange()` still includes those rows. `sendBatch` will iterate them, `processRow` will see empty cells, `requiredCell` will throw, the exception is caught, and the row is marked SALTADO.

**Current system exposure:** LOW but common user error. `sendBatch` handles it gracefully via the catch block returning null/SALTADO. Cosmetically noisy but not harmful.

**Prevention:** Filter rows before the batch: skip rows where all key cells are empty. Add a pre-check that counts "non-empty rows" vs "total rows" and warns the operator if there are significantly more total rows than non-empty rows.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Adding new templates with Drive sharing | Silent share failure + email sent (Pitfall 4) | Always check `shareFileAsViewer` return value in processRow |
| Increasing batch sizes | 6-minute timeout kills mid-batch, status not written (Pitfall 2) | Implement incremental status writes before increasing limits |
| Templates with external API calls | Execution time limit compounds with Drive sharing (Pitfall 2) | Pre-flight timing estimate; enforce batchLimit per template type |
| Multi-user deployment | New editors need OAuth re-authorization (Pitfall 13) | Document authorization flow; test with a non-owner account |
| Config sheet changes | Alias silently falls back to primary (Pitfall 9) | Add alias pre-flight check in _showSendDialog |
| Refactoring report_delivery | Hardcoded column index coupling (Pitfall 10) | Switch to mapHeaders before any column changes |
| Adding rich HTML components | Outlook desktop ignores border-radius/flex/grid (Pitfall 6) | Test all new visual components against Outlook rendering |
| Error UX improvements | SALTADO obscures real errors (Pitfall 1) | Separate skip-intent from skip-error in status column values |

---

## Sources

- Google Apps Script Quotas documentation (developers.google.com/apps-script/guides/services/quotas) — MEDIUM confidence (cited from training data; URL is correct, figures are stable but should be re-verified for current account tier limits)
- GmailApp vs MailApp quota distinction — MEDIUM confidence (well-known GAS developer community knowledge, stable behavior)
- Gmail `<style>` tag stripping — HIGH confidence (industry standard, unchanged for 10+ years, confirmed by multiple authoritative HTML email references including Litmus and Campaign Monitor documentation)
- Outlook Word rendering engine limitations — HIGH confidence (official Microsoft documentation, stable behavior across Outlook 2013-365 desktop)
- GAS 6-minute execution limit — HIGH confidence (official Google documentation, fundamental platform constraint)
- Spanish character encoding via GAS UTF-8 handling — MEDIUM confidence (observed behavior, UTF-8 declaration effectiveness is well-established)
- Date timezone behavior in GAS V8 runtime — MEDIUM confidence (V8 runtime behavior documented by Google, timezone handling is a known GAS gotcha)
