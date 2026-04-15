# Roadmap: Correos Automatizados PUCV

## Overview

This milestone hardens an already-working email automation system. The existing 7-template system sends emails correctly in the happy path, but silently absorbs errors, lacks audit trails, and has architectural debt that will compound with each new template. The roadmap moves from fixing active defects (Phase 1), to improving the operator's daily workflow (Phase 2), to cleaning up architecture and tooling for future extensibility (Phase 3).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Reliability Hardening** - Fix silent failures, validate inputs, and make errors visible in the status column
- [ ] **Phase 2: Operational Quality** - Give operators pre-flight checks, audit logging, progress feedback, and safe re-runs
- [ ] **Phase 3: Architecture & Tooling** - Remove template-specific dispatch, add test functions, and enable clasp deployment

## Phase Details

### Phase 1: Reliability Hardening
**Goal**: Every batch run either succeeds visibly or fails visibly -- no silent data corruption, no broken links sent to students, no wrong-column data
**Depends on**: Nothing (first phase)
**Requirements**: ROBUST-01, ROBUST-02, ROBUST-06, ARCH-02
**Success Criteria** (what must be TRUE):
  1. When a row fails to process, the operator sees a specific error reason in the status column (e.g., "ERROR: correo invalido") instead of "SALTADO"
  2. Rows with syntactically invalid email addresses are skipped before sending, and the operator sees a warning listing which rows were skipped
  3. When Drive file sharing fails for a certificate or report row, that row gets an error status and no email is sent with a broken link
  4. The report_delivery template reads columns by header name (via mapHeaders), so reordering columns in the Directorio sheet does not silently send wrong data
**Plans**: TBD

### Phase 2: Operational Quality
**Goal**: Operators have full situational awareness before, during, and after every batch run -- and can safely retry failures without resending
**Depends on**: Phase 1
**Requirements**: ROBUST-03, ROBUST-04, ROBUST-05, LOG-01, LOG-02, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Operator can re-run a batch and only ERROR or empty-status rows are processed; rows marked ENVIADO or BORRADOR remain untouched
  2. The send dialog shows remaining Gmail quota and a pre-flight summary (template name, data sheet, row count, sender alias) before the operator commits
  3. When batch size exceeds the configured threshold (default 50), the operator must confirm through a hard warning before proceeding
  4. Every batch run appends a summary row to a persistent "Log" sheet (timestamp, template, operator, sent count, error count, draft flag)
  5. During long batches, the operator sees toast progress notifications at regular intervals
**Plans**: 2 (02-01: Core reliability + logging, 02-02: Pre-flight dialog + batch guard)
**UI hint**: yes

### Phase 3: Architecture & Tooling
**Goal**: The codebase is ready for new templates without accumulating debt, and deployment no longer requires manual copy-paste
**Depends on**: Phase 1
**Requirements**: ARCH-01, ARCH-03, TOOL-01
**Success Criteria** (what must be TRUE):
  1. Adding a template that needs cross-sheet data (like report_delivery) requires only defining a prepareExtraData hook on the template object -- no changes to _executeBatch
  2. Every template in Templates.gs has a named test function that exercises processRow and buildHtml with mock data and logs output to the GAS Execution Log
  3. Running `clasp push` from the repo root deploys all source files to the bound Apps Script project
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Reliability Hardening | 1/TBD | In progress | - |
| 2. Operational Quality | 0/2 | Planned | - |
| 3. Architecture & Tooling | 0/TBD | Not started | - |
