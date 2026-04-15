---
status: partial
phase: 02-operational-quality
source: [02-VERIFICATION.md]
started: 2026-04-15T21:00:00Z
updated: 2026-04-15T21:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Safe Re-run Skip Logic (ROBUST-03)
expected: After running a batch, manually change one row status to 'ERROR: test' and re-run. Only the ERROR row and any empty-status rows should be processed; ENVIADO rows must not be touched.
result: [pending]

### 2. Consolidated Validation Alert (UX-01)
expected: Rename a required column in the data sheet to something invalid, then trigger Enviar Correos from the menu. A single alert should list all missing columns before any email is attempted.
result: [pending]

### 3. Log Sheet Auto-Creation and Row Append (LOG-01)
expected: After any batch run, a 'Log' sheet should appear (created automatically if missing) with one new row per batch containing timestamp, template ID, template name, operator email, total rows, sent, errors, asDraft, subject.
result: [pending]

### 4. Toast Progress During Long Batch (LOG-02)
expected: With a data sheet of 20+ processable rows, running the batch should produce SpreadsheetApp.toast notifications at every 20-row throttle interval.
result: [pending]

### 5. Send Dialog Pre-flight Summary (ROBUST-04 + UX-02)
expected: Opening the send dialog shows template name, data sheet name, total rows (server-rendered), then asynchronously fills in processable row count, quota remaining, and sender alias.
result: [pending]

### 6. Batch Warning Checkbox Gate (ROBUST-05)
expected: Add 'batch_warning_threshold=2' in Config extras, populate 3+ processable rows, open the send dialog. A red warning box should appear and the submit button must be disabled until the confirmation checkbox is checked.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
