---
phase: 01-reliability-hardening
plan: 02
subsystem: templates
tags: [google-apps-script, drive-sharing, error-handling, mapHeaders]

# Dependency graph
requires:
  - phase: 01-reliability-hardening/plan-01
    provides: "{ error } convention in sendBatch and processFn; extraData.dirHeaders in Main.gs"
provides:
  - "certificateTemplate: shareFileAsViewer return value checked; { error } returned on sharing failure"
  - "certificateTemplate.getRecipientEmail: returns correo without Drive side effects"
  - "reportDeliveryTemplate.requiredHeaders populated with [profesor, curso, doc_id, url_informe]"
  - "reportDeliveryTemplate.processRow: mapHeaders-based column access, no more hardcoded indexes"
  - "reportDeliveryTemplate.directoryLookup: accepts dirHeaders; uses safeCell with mapHeaders"
  - "reportDeliveryTemplate: professor-not-found treated as ERROR not silent SALTADO"
  - "reportDeliveryTemplate: shareFileAsViewer return value checked"
  - "reportDeliveryTemplate.getRecipientEmail: directory lookup without Drive side effects"
affects:
  - 01-reliability-hardening/plan-01

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "shareFileAsViewer result check: const shareResult = shareFileAsViewer(...); if (!shareResult.success) return { error: ... }"
    - "getRecipientEmail method on templates for side-effect-free pre-flight email validation"
    - "mapHeaders-based column access in all templates (reportDeliveryTemplate now aligned)"
    - "directoryLookup accepts dirHeaders for header-name-based Directorio sheet access"

key-files:
  created: []
  modified:
    - src/Templates.gs

key-decisions:
  - "Drive sharing failure in processRow returns { error } object (not throw) so processFn catch block does not double-wrap the message"
  - "getRecipientEmail on certificate uses safeCell (not requiredCell) to avoid throwing during pre-flight"
  - "directoryLookup signature extended with dirHeaders param; callers pass extraData.dirHeaders defensively (null-safe guard)"
  - "requiredCell used in reportDeliveryTemplate.processRow for all four data columns (throws Spanish error on empty)"

patterns-established:
  - "Template method getRecipientEmail: side-effect-free email extraction for pre-flight validation"
  - "Return { error: 'Spanish message' } from processRow for fatal row errors (not throw, not null)"

requirements-completed:
  - ROBUST-06
  - ARCH-02

# Metrics
duration: 15min
completed: 2026-04-14
---

# Phase 1 Plan 02: Reliability Hardening - Templates Summary

**Drive sharing failures now produce visible ERROR statuses; reportDeliveryTemplate migrated from hardcoded column indexes to mapHeaders with professor-not-found producing ERROR instead of silent skip**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-14T00:00:00Z
- **Completed:** 2026-04-14T00:15:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Certificates with unshearable Drive files now write `ERROR: No se pudo compartir el archivo <fileId>` and no email is sent (ROBUST-06)
- report_delivery rows where the professor is absent from the Directorio sheet now write `ERROR: Profesor no encontrado en Directorio: <name>` instead of silently skipping (D-15)
- reportDeliveryTemplate column access migrated from hardcoded indexes to `requiredCell + mapHeaders` — reordering columns in the data sheet no longer corrupts data (ARCH-02)
- Both templates implement `getRecipientEmail` for side-effect-free pre-flight email validation (ROBUST-02 prerequisite)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix certificateTemplate — Drive sharing check and getRecipientEmail** - `0e132be` (feat)
2. **Task 2: Migrate reportDeliveryTemplate to mapHeaders and fix all reliability issues** - `62e18a5` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/Templates.gs` - certificateTemplate and reportDeliveryTemplate reliability fixes

## Decisions Made

- `getRecipientEmail` on certificateTemplate uses `safeCell` (not `requiredCell`) to avoid throwing during pre-flight validation — the pre-flight loop skips templates that return null/empty email
- `directoryLookup` signature extended to accept `dirHeaders`; called with `extraData ? extraData.dirHeaders : null` so it degrades gracefully before Plan 01 changes are merged
- `processRow` in reportDeliveryTemplate uses `requiredCell` for all four data columns — empty required fields throw a Spanish error that the processFn catch block (Plan 01) will capture as `ERROR: Falta el campo requerido...`
- Drive sharing failure in `processRow` returns `{ error }` object rather than throwing, so the error message is not double-wrapped by the catch block

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

Operators must rename their existing Datos_report_delivery sheet columns to: `profesor`, `curso`, `doc_id`, `url_informe`. They must also rename Directorio sheet columns to: `nombre`, `correo`, `cc`. These are one-time migrations with no fallback to old hardcoded indexes. A comment was added above `requiredHeaders` in the template to guide operators.

## Next Phase Readiness

- Both templates now implement `getRecipientEmail` — pre-flight email validation in Plan 01 will work for certificate and report_delivery batches
- `directoryLookup` accepts `dirHeaders` — once Plan 01 populates `extraData.dirHeaders` in Main.gs, cross-sheet lookups will be column-order-independent
- All four Phase 1 reliability requirements (ROBUST-01, ROBUST-02, ROBUST-06, ARCH-02) addressed across Plans 01 and 02

---
*Phase: 01-reliability-hardening*
*Completed: 2026-04-14*
