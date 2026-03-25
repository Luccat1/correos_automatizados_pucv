# Project Research Summary

**Project:** Correos Automatizados PUCV
**Domain:** Google Apps Script institutional email automation (bound to Google Sheets)
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

This is a brownfield GAS project: a mature, working email automation system bound to a Google Spreadsheet, serving the Centro de Idiomas at PUCV. The system already has a solid 3-layer architecture (Core/Templates/Main), 7 registered email templates, batch send with quota protection, status-column idempotency, and a template registry pattern. The research question is not "how to build" but "how to improve, harden, and extend" the existing system with minimum risk.

The recommended approach is targeted hardening first, then incremental feature additions. Four critical-to-high severity issues exist in the current codebase that should be fixed before any new templates or features are added: (1) processing errors are silently absorbed as SALTADO, indistinguishable from intentional skips; (2) Drive sharing failures in certificate/report templates proceed to send the email with a broken link; (3) the report_delivery template uses hardcoded column indexes instead of mapHeaders; and (4) the 6-minute execution timeout can kill a batch mid-run with no status written for completed rows. These are operational risks that affect users right now. Fixing them is the correct first phase.

The key risks after hardening are scope creep (the system has a clear, appropriate scope; a web interface or external database would destroy the simplicity that makes it maintainable) and deployment friction (manual copy-paste across 5 files is error-prone; adopting clasp would eliminate this in one setup session). The stack is non-negotiable at its core — GAS V8 on Google Workspace Education, 1,500 emails/day quota — but the surrounding toolchain (clasp, JSDoc types, structured logging) can meaningfully improve developer experience without changing the runtime.

---

## Key Findings

### Recommended Stack

The GAS runtime is fixed and correct. The system already makes the right choices: GmailApp over MailApp (alias support, draft creation, higher Workspace quota), HtmlService for dialogs, SpreadsheetApp for data and config, DriveApp for file sharing. No changes to core technology are warranted.

The primary toolchain gap is deployment: manual copy-paste across 5 files is the only current deployment method. Adopting clasp (Google's official CLI for GAS) would reduce a 5-minute error-prone copy-paste cycle to a 5-second `clasp push`. This is the highest-ROI toolchain improvement available.

**Core technologies:**
- Google Apps Script V8: execution runtime — bound to Sheets, non-negotiable, V8 engine enables ES2019+ syntax
- GmailApp: email dispatch — correct choice over MailApp; supports aliases, drafts, and the same 1,500/day Workspace quota
- SpreadsheetApp: data and config storage — sheet-based config is visible and editable by non-developers, correct for institutional use
- HtmlService: modal dialogs — only UI surface available inside GAS; current implementation is complete
- DriveApp: file sharing — used by certificate and report templates; sharing failures currently unhandled (see Pitfalls)
- clasp (recommended addition): CLI deploy — eliminates manual copy-paste; official Google tool, 5-second push replaces 5-minute manual process
- @types/google-apps-script (recommended addition): IDE types — enables autocomplete for GAS globals without a build step

**What not to add:** async/await (GAS is synchronous), npm packages at runtime (Node.js only), Jest test runner (GAS API surface too large to mock reliably), TypeScript migration of existing files (adds build complexity with no runtime benefit), web app deployment (out of scope), GAS Library imports for actively developed code (poor debuggability).

### Expected Features

The current system is functionally complete for its primary use case. The gap is not missing features — it is missing operational reliability: errors that should be visible are hidden, failures that should block sending do not, and the audit trail is ephemeral (execution log only, no persistent record).

**Must have (table stakes — P0/P1):**
- Error detail in status column — operators need to know WHY a row failed, not just that it was SALTADO
- Email validation before send — isValidEmail() exists but is never called; invalid emails waste quota and produce confusing partial failures
- Re-run failed rows menu item — after fixing a data error, staff should not have to clear the entire status column
- Row count confirmation with cap warning — accidental 500-row sends need a speed bump; SendDialog shows count but doesn't enforce confirmation
- Quota forecast before batch — show remaining quota vs batch size before committing; getRemainingDailyQuota() is already called per row
- Configuration validation on demand — catch missing/wrong Config sheet keys before batch start, not mid-batch

**Should have (differentiators — P1/P2):**
- Send Log sheet — persistent audit trail: timestamp, template, operator, sent count, error count per run; institutional accountability
- Plain text body auto-generation — currentplainBody is empty string; rare but real for non-HTML clients
- Config sheet self-documentation — configKeys descriptions and example values in generated sheets
- Per-row preview navigation — browse recipients before sending, not just row 2
- Selective send (checked rows only) — send to a subset without deleting other rows

**Defer to later phases (P3):**
- Scheduled / time-triggered sending — high effort, low current demand
- Attachment support — add when a specific template explicitly requires it
- Multi-language template variants — high effort, medium value

**Anti-features (never build):**
- Open tracking via pixel — requires a persistent HTTP server; no path in GAS
- Unsubscribe management — institutional transactional emails don't require it
- Custom HTML email editor inside GAS modals — CSP restrictions make WYSIWYG impossible
- Direct database integration — destroys the simplicity of the Sheets-bound model

### Architecture Approach

The existing 3-layer architecture (Core / Templates / Main) is well-designed and should be preserved. Dependency direction is strictly top-down: Main calls Templates and Core; Templates calls Core only; Core calls nothing in the system. This invariant must be maintained when adding features. Three specific architectural improvements are needed: (1) remove the template-specific dispatch block in _executeBatch by introducing an optional `prepareExtraData` hook on template objects; (2) propagate error messages from processFn catch blocks into the status column instead of returning null; (3) move confirmation dialogs from _executeBatch into menu handlers so _executeBatch is a pure data-processing function.

**Major components:**
1. Core.gs — GAS API wrappers, HTML builder, email dispatch, sheet utilities; calls only GAS built-ins; no knowledge of templates
2. Templates.gs — template definitions and registry; processRow extracts data, buildHtml produces HTML; calls Core helpers only
3. Main.gs — spreadsheet menu, dialog display, config reading, batch orchestration; calls Core and Templates
4. HTML dialogs (TemplateSelector.html, SendDialog.html) — client-side UI; calls Main.gs via google.script.run only

**Key patterns to maintain:**
- mapHeaders() with lowercase normalization — tolerates column name variation from end users
- batchUpdateColumn() for status writes — one Sheets API call for entire batch
- safeCell / requiredCell pair — explicit distinction between optional and mandatory columns
- Status column as idempotency guard — ensures safe re-run after timeout or quota exhaustion
- extraData injection pattern — forward-compatible cross-sheet dependency passing to processRow

### Critical Pitfalls

1. **Silent row errors (SALTADO obscures real failures)** — The catch block in _executeBatch returns null, which writes SALTADO. Processing errors are indistinguishable from intentional skips. Fix: return error string from catch block and write "ERROR: [message]" to status column. This is a single-line change with high impact.

2. **6-minute execution timeout kills mid-batch with no status written** — batchUpdateColumn() runs only after sendBatch() returns. If GAS terminates mid-run (timeout), rows already sent have no status update; re-run resends them. Fix: write status in incremental mini-batches (every N rows) rather than only at the end. Critical for certificate/report templates that make a Drive API call per row.

3. **Drive sharing failure proceeds to send broken link** — shareFileAsViewer() returns {success: false} but processRow ignores the return value. Student receives email, clicks Drive link, gets "Access Denied". Fix: check shareFileAsViewer() return value in processRow; throw or skip if sharing fails. Affects all certificate and report_delivery template sends.

4. **reportDeliveryTemplate uses hardcoded column indexes** — row[1], row[2], row[3], row[4] instead of mapHeaders(). Column reorder in the source sheet silently sends wrong data to wrong recipients. Fix: enforce named headers on the Directorio sheet and use mapHeaders(), or add header validation that throws descriptively if expected columns are absent.

5. **Alias fallback is silent** — If senderAlias is set but not configured in Gmail, the email sends from the primary account with no error. Operators see ENVIADO, not realizing the sender identity is wrong. Fix: pre-flight check in _showSendDialog that verifies the configured alias exists in getAliases(); surface as a visible warning, not just console.warn.

---

## Implications for Roadmap

Based on combined research, 4 phases are suggested. Phases 1 and 2 address current defects and operational gaps before adding new capability. Phases 3 and 4 add meaningful improvements and developer experience.

### Phase 1: Reliability Hardening

**Rationale:** Four HIGH-severity issues exist in the current codebase (silent errors, Drive sharing failure, hardcoded indexes, mid-batch timeout risk). These affect every batch run today. No new features should be added until the error handling and idempotency guarantees are sound — otherwise new templates inherit the same defects.

**Delivers:**
- Error messages visible in status column (ERROR: [message] vs SALTADO)
- Drive sharing failures blocking send, not silently proceeding
- report_delivery template switched to mapHeaders-based column access
- Incremental status writes to survive mid-batch timeout
- Email validation via existing isValidEmail() called in processFn

**Addresses:** FEATURES.md P0 items: error detail in status column, email validation before send

**Avoids:** PITFALLS.md Pitfalls 1, 2, 3, 4 — the four critical/high severity issues

**Research flag:** No additional research needed. All changes are within well-understood existing code. Standard patterns.

---

### Phase 2: Operational Quality

**Rationale:** After reliability is solid, address the operational UX gaps that cause staff friction on every batch run. These are independent improvements that build on the corrected error model from Phase 1 (re-run failed rows depends on ERROR being distinguishable from SALTADO; quota forecast depends on pre-flight validation pattern; send log depends on stable status values).

**Delivers:**
- Re-run failed rows menu item (skips ENVIADO and BORRADOR only, retries ERROR rows)
- Quota forecast shown in SendDialog before batch commit
- Row count cap warning with explicit confirmation for batches above threshold
- Configuration validation menu item (checks template_id, data_sheet, required headers)
- Send Log sheet (persistent append-only audit trail: timestamp, template, operator, sent, errors, asDraft)
- Alias pre-flight check in _showSendDialog (Pitfall 9 fix)

**Addresses:** FEATURES.md P1 items; PITFALLS.md Pitfall 9 (alias fallback)

**Avoids:** Config validation as onOpen() handler (FEATURES.md warning: validate lazily, not on every sheet load); Log sheet reading back during batch (FEATURES.md warning: append-only)

**Research flag:** No additional research needed. All patterns are established GAS patterns.

---

### Phase 3: Architecture Improvements

**Rationale:** The template-specific dispatch in _executeBatch (the report_delivery if-block) and the confirmation dialogs inside _executeBatch are architectural debt that will compound as templates are added. Fixing them now, before adding more templates, keeps the system maintainable. This phase also adds the clasp deployment toolchain, which benefits all future development.

**Delivers:**
- prepareExtraData optional hook on template objects (removes template-specific dispatch from _executeBatch)
- Confirmation dialogs moved from _executeBatch to menu handlers (pure batch function)
- clasp + .clasp.json setup for CLI deployment (eliminates manual copy-paste)
- appsscript.json manifest with explicit OAuth scopes and Stackdriver logging
- Structured log() wrapper in Core.gs with level + context labels
- Test function pattern documented and example test functions added per template

**Addresses:** ARCHITECTURE.md Anti-Patterns 1 and 5; STACK.md clasp recommendation

**Avoids:** TypeScript migration of existing working files (adds build complexity with no runtime benefit)

**Research flag:** No additional research needed. clasp setup is well-documented. Architecture patterns are derived directly from code analysis.

---

### Phase 4: Incremental Feature Additions

**Rationale:** With reliability, operational quality, and architecture in good shape, incremental feature additions carry low risk. Each addition is independent; they can be split into sub-phases based on actual demand from operators.

**Delivers (in priority order):**
- Send Log sheet enhancements (skip breakdown: intentional vs error)
- Plain text body auto-generation (strip HTML for non-rendering clients)
- Config sheet self-documentation (example values and types in generated Config sheets)
- Per-row preview navigation in preview dialog
- Selective send via checkbox column
- Attachment support for templates that require it (GmailApp already supports Blob attachments)

**Defers:**
- Scheduled send via time trigger (high effort, low current demand; requires PropertiesService state management)
- Multi-language template variants (high effort; address when an English-language template is actually needed)

**Avoids:** Open tracking, unsubscribe management, custom HTML editor, external database (all FEATURES.md anti-features)

**Research flag:** Scheduled send (if demanded) will need focused research on ScriptApp.newTrigger() patterns and PropertiesService state storage for pending jobs. All other Phase 4 items follow established patterns.

---

### Phase Ordering Rationale

- Phase 1 before Phase 2: Re-run failed rows (Phase 2) only works correctly when ERROR rows are distinguishable from SALTADO rows (Phase 1). Quota forecast relies on validated pre-flight patterns. Send Log needs stable status values.
- Phase 1 before Phase 3: clasp deployment (Phase 3) is easier to set up when the codebase has already been corrected; deploying broken code more efficiently is not a gain.
- Phase 2 before Phase 4: Feature additions (Phase 4) depend on a stable operational foundation. Adding selective send before error handling works correctly would mask the same silent-error problems.
- Phase 3 can overlap with Phase 2: Architecture improvements are largely independent of operational quality features; teams with capacity can parallelize.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Scheduled send only):** ScriptApp.newTrigger() behavior, PropertiesService state management for pending jobs, trigger ownership and quota attribution — these have edge cases worth researching before committing to implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1:** Pure error handling improvements within existing code. No new APIs. No research needed.
- **Phase 2:** All items use GAS APIs already present in the codebase (MailApp.getRemainingDailyQuota, SpreadsheetApp.toast, PropertiesService). No research needed.
- **Phase 3:** clasp is well-documented by Google. Architecture patterns derived from direct code analysis. No research needed.
- **Phase 4 (excluding scheduled send):** Feature additions use already-present GAS APIs. No research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core runtime is fixed and well-understood. clasp and toolchain recommendations are from official Google sources and widely used. Quota numbers (1,500/day Workspace) are stable and well-documented. |
| Features | HIGH | Feature gaps derived from direct codebase analysis, not speculation. Anti-features rationale is grounded in hard GAS constraints (no persistent server, no module system). |
| Architecture | HIGH | All anti-patterns and recommendations derived from direct analysis of all four source files. GAS constraints (6-min timeout, no module system, synchronous execution) are official, stable platform facts. |
| Pitfalls | HIGH for GAS limits and Gmail behavior; MEDIUM for quota tracking accuracy | GAS 6-minute limit, Gmail style stripping, Outlook rendering: HIGH confidence (official docs, industry consensus). MailApp vs GmailApp quota bucket distinction: MEDIUM (well-known GAS community knowledge, verify before fixing). |

**Overall confidence:** HIGH

### Gaps to Address

- **MailApp.getRemainingDailyQuota() vs GmailApp quota bucket:** Research indicates they may be separate counters. Before Phase 2 quota forecast feature, test empirically: send a batch with GmailApp, check what getRemainingDailyQuota() returns. If buckets are truly separate, the quota forecast will need a different measurement approach or a note in the UI.
- **clasp version:** STACK.md notes clasp 2.4.x — verify current version with `npm info @google/clasp version` before Phase 3 setup. The version number is MEDIUM confidence; the tool's existence and approach are HIGH confidence.
- **Drive API sharing quota:** Documented as no hard per-day limit, but high-volume sharing (150+ files in one batch) has not been empirically tested. For Phase 1, note batchLimit recommendations for Drive-heavy templates.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis: `src/Core.gs`, `src/Templates.gs`, `src/Main.gs`, `src/SendDialog.html`, `src/TemplateSelector.html` — architecture, pitfalls, feature gaps (read 2026-03-25)
- Google Apps Script quotas: https://developers.google.com/apps-script/guides/services/quotas — quota limits, execution time limits
- GAS V8 runtime: https://developers.google.com/apps-script/guides/v8-runtime — engine capabilities and constraints
- clasp GitHub: https://github.com/google/clasp — official Google CLI tool for GAS
- Gmail `<style>` tag stripping: Litmus/Campaign Monitor HTML email documentation — industry standard, unchanged 10+ years
- Outlook Word rendering engine: Microsoft documentation — CSS rendering limitations

### Secondary (MEDIUM confidence)
- @types/google-apps-script (npm) — type definitions; maintained community package, HIGH for existence, MEDIUM for completeness
- GmailApp vs MailApp quota bucket behavior — well-known GAS developer community knowledge, unverified empirically
- Spanish character encoding in GAS UTF-8 handling — observed behavior, well-established pattern
- Date timezone behavior in GAS V8 runtime — documented Google behavior, known GAS gotcha

### Tertiary (LOW confidence)
- gas-mock-globals npm library — exists but incomplete GAS API coverage; maintenance status uncertain (STACK.md: LOW confidence). Verdict: do not use.

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
