# Requirements — Correos Automatizados PUCV

**Milestone:** v1.0 — Robustez, Observabilidad y Calidad Arquitectonica
**Date:** 2026-03-25
**Source:** README.md + research findings (FEATURES.md, ARCHITECTURE.md, PITFALLS.md)

---

## v1 Requirements

### Robustness (Error Handling)

- [ ] **ROBUST-01**: Operator can see the specific error reason in the status column when a row fails to process (e.g., "ERROR: correo invalido", not "SALTADO")
- [ ] **ROBUST-02**: Operator is warned before sending if any recipient email addresses are syntactically invalid, and those rows are skipped with a clear error status
- [ ] **ROBUST-03**: Operator can re-run a batch and only rows with ERROR status (or empty status) are processed; already-sent rows remain unchanged
- [x] **ROBUST-04**: Operator sees a quota forecast ("Cuota disponible: N correos") in the send dialog before committing to a batch
- [x] **ROBUST-05**: Operator sees a hard confirmation warning when batch size exceeds a configurable threshold (default: 50 rows)
- [ ] **ROBUST-06**: Drive file-sharing failures (shareFileAsViewer) are caught and written to the status column as errors instead of proceeding to send a broken email link

### Observability (Logging & Audit)

- [ ] **LOG-01**: Every batch run appends one row to a persistent "Log" sheet containing: timestamp, template name, operator email, total rows, sent count, error count, asDraft flag
- [ ] **LOG-02**: Batch progress is shown to the operator via toast notifications (SpreadsheetApp.toast) at regular intervals during long-running batches

### Architecture Quality

- [ ] **ARCH-01**: The `_executeBatch` function in Main.gs is template-agnostic — cross-sheet data loading (currently hardcoded for `report_delivery`) is handled via an optional `prepareExtraData(config, ss)` hook on the template object
- [ ] **ARCH-02**: The `report_delivery` template reads its data columns by header name (via `mapHeaders`) instead of hardcoded 0-based indexes
- [ ] **ARCH-03**: Each template in Templates.gs has a named test function (e.g., `testCertificateTemplate()`) that exercises `processRow` and `buildHtml` with mock data and logs output to the GAS Execution Log

### User Experience

- [ ] **UX-01**: The configuration validator runs when the user triggers a send action and reports all missing headers, missing sheets, and unknown template IDs in one consolidated error alert — before any emails are sent
- [x] **UX-02**: The send dialog displays a pre-flight summary showing: template name, data sheet name, row count, remaining quota, and selected sender alias

### Tooling

- [ ] **TOOL-01**: The project can be pushed to Google Apps Script using clasp (`clasp push`) instead of manual copy-paste, with a `.clasp.json` and updated `appsscript.json` in the repo

---

## v2 Requirements (Deferred)

These are valuable but not required for this milestone:

- **UX-DEFER-01**: Operator can navigate between rows in the preview dialog (next/previous row) before sending
- **UX-DEFER-02**: Operator can mark individual rows with a "Seleccionado" checkbox to send to a subset without deleting other rows
- **UX-DEFER-03**: Emails include a plain text fallback body (auto-generated from HTML content by stripping tags)
- **FEAT-DEFER-01**: Templates support attaching a file via a Drive URL column (GmailApp `attachments` parameter)
- **FEAT-DEFER-02**: Operator can schedule a batch send via a time-based GAS trigger
- **FEAT-DEFER-03**: Multi-language template variants for English-language recipients
- **LOG-DEFER-01**: Structured `log(level, context, message, data)` wrapper in Core.gs replacing raw `console.log/error` calls

---

## Out of Scope

- **Open/read tracking (tracking pixel)** — requires a persistent HTTP server; GAS web apps are not suitable for this
- **Unsubscribe / opt-out management** — institutional transactional emails (certificates, credentials) are exempt from marketing unsubscribe requirements
- **Custom HTML email editor in dialog** — HtmlService CSP restrictions make rich editors impossible inside GAS modals
- **External database integration** — the system is designed to live entirely within Google Workspace
- **Email thread tracking / reply handling** — GmailApp send-only; replies go to sender alias naturally
- **Multiple sender aliases per row** — alias must be pre-registered in Gmail; per-row switching is disproportionately complex

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| ROBUST-01 | Phase 1 | TBD |
| ROBUST-02 | Phase 1 | TBD |
| ROBUST-03 | Phase 2 | TBD |
| ROBUST-04 | Phase 2 | TBD |
| ROBUST-05 | Phase 2 | TBD |
| ROBUST-06 | Phase 1 | TBD |
| LOG-01 | Phase 2 | TBD |
| LOG-02 | Phase 2 | TBD |
| ARCH-01 | Phase 3 | TBD |
| ARCH-02 | Phase 1 | TBD |
| ARCH-03 | Phase 3 | TBD |
| UX-01 | Phase 2 | TBD |
| UX-02 | Phase 2 | TBD |
| TOOL-01 | Phase 3 | TBD |
