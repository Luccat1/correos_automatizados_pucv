---
phase: 01-reliability-hardening
plan: 01
subsystem: templates
tags: [gas, templates, config, configKeys]

# Dependency graph
requires: []
provides:
  - All 9 templates declare configKeys arrays for Config sheet integration
  - Config sheet extras are passed as configExtras to every processRow call
  - survey template reads survey_url and extra_note from Config sheet at runtime
affects: [02-operational-quality, template-setup-dialog, _generateSheets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "configKeys pattern: each template declares which Config sheet keys it reads, enabling _generateSheets to pre-populate the Config sheet with the right rows"
    - "configExtras pattern: _executeBatch, menuSendTest, and menuPreview all pass config.extras as extraData.configExtras so processRow can override defaults"

key-files:
  created: []
  modified:
    - src/Templates.gs

key-decisions:
  - "Added empty configKeys arrays to class_start_students and class_start_professor — these templates have no configurable keys yet but the consistent interface allows the selector dialog and future enhancements to treat all templates uniformly"

patterns-established:
  - "configKeys convention: every template object MUST have a configKeys array (empty or populated) so listTemplates() and _generateSheets() work without special-casing"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-04-14
---

# Phase 1 Plan 1: Template Config Keys & Config Reader Enhancement Summary

**All 9 templates now declare configKeys and receive Config sheet extras via extraData.configExtras in processRow, enabling operator-configurable values (survey URLs, payment deadlines, program names) to override hardcoded defaults.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-14T21:43:00Z
- **Completed:** 2026-04-14T21:43:59Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `configKeys: []` to `class_start_students` and `class_start_professor` templates (the two templates added after the plan was written that were missing the property)
- Confirmed all original 7 templates already had `configKeys` arrays and read from `extraData.configExtras` in `processRow`
- Confirmed `_executeBatch`, `menuSendTest`, and `menuPreview` in Main.gs already pass `configExtras: { ...config.extras }` in the extraData object
- Confirmed `survey` template reads `survey_url` and `extra_note` from `config.extras` at runtime

## Task Commits

Each task was committed atomically:

1. **Task 1: Add configKeys to all templates and read from Config** - `dc4b251` (feat)

**Plan metadata:** see final docs commit

## Files Created/Modified

- `src/Templates.gs` - Added `configKeys: []` to `classStartStudentsTemplate` and `classStartProfessorTemplate`

## Decisions Made

Added empty `configKeys` arrays to the two class_start templates rather than skipping them. The `_generateSheets()` function in Main.gs already iterates `template.configKeys` to populate the Config sheet — without the property, it would silently skip adding rows for those templates. An explicit empty array signals "no configurable keys" as a deliberate choice.

## Deviations from Plan

The plan specified 7 templates. The codebase has 9 (two class_start templates were added after the plan was written). All 7 original templates already had `configKeys` and the configExtras wiring was already complete in Main.gs. The only actual change was adding `configKeys: []` to the two newer templates to maintain interface consistency.

None of the core work items required code changes — the plan had already been partially implemented during earlier development. The `survey` template already read from `configExtras`, `_executeBatch` already passed `configExtras`, and all original templates already declared `configKeys`.

## Issues Encountered

None — the plan was largely already implemented. The configExtras pipeline was found to be complete and functioning. Only the two post-plan templates were missing the `configKeys` property.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Config sheet integration is fully wired; operators can set template-specific values (survey_url, payment_url, deadline_text, etc.) in the Config sheet and they will be picked up at send time
- Ready for Phase 1 Plan 2 (error handling and input validation hardening)

---
*Phase: 01-reliability-hardening*
*Completed: 2026-04-14*
