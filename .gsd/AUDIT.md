# Milestone Audit: v2.0 — Enhanced UX & Template Polish

**Audited:** 2026-02-26

## Summary

| Metric | Value |
|--------|-------|
| Phases | 4 (+1 gap closure) |
| Gap closures | 1 (Phase 5: legacy cleanup & GitHub prep) |
| Technical debt items | 3 |
| ADRs recorded | 3 |

## Must-Haves Status

| Requirement | Verified | Evidence |
|-------------|----------|----------|
| Selector de plantillas con auto-generación de hojas | ✅ | `TemplateSelector.html`, `menuSetupTemplate()` in `Main.gs:419` |
| Auto-detección de hoja de datos (sin hoja activa) | ✅ | `_getDataSheet()` reads `data_sheet` from Config; `Datos_{id}` naming in `Main.gs:458` |
| Diálogo HTML para personalizar envíos | ✅ | `SendDialog.html` with Subject, Note, CC/BCC fields |
| Fallback de saludo genérico | ✅ | `extractFirstName(fullName, fallback)` in `Core.gs:162-171` |
| Redacción revisada (tono institucional PUCV) | ✅ | All 7 templates updated per Phase 3 VERIFICATION.md |
| Parámetros configurables por template en Config | ✅ | `configKeys` declared per template; `_generateSheets` writes them to Config sheet |

## Phase Quality

| Phase | Verdict | Gap Closures | Notes |
|-------|---------|--------------|-------|
| 1: Core Engine | PASS | 0 | Clean foundation: 24 documented functions in Core.gs |
| 2: Menu GUI | PASS | 0 | Professional HTML dialogs; SendDialog + Preview modal |
| 3: Copy Revision | PASS | 0 | All 7 templates polished; fallback "estudiante" implemented |
| 4: Selector GUI & Auto-Detection | PASS | 0 | Rich card selector; template-specific sheet naming |
| 5: Gap Closure & GitHub Prep | PASS | 1 | Legacy scripts removed; `.gitignore` created; repo cleaned |

## Concerns

1. **ROADMAP must-haves not checked off**: Lines 8-13 in `ROADMAP.md` still show `[ ]` instead of `[x]`. The Phase 5 VERIFICATION says they were checked, but current file shows otherwise. This is a **documentation inconsistency**.
2. **TODO.md items not closed**: 5 of 6 items in `TODO.md` are still `[ ]` even though their corresponding features have been implemented. This creates confusion about what's actually pending vs done.
3. **No live deployment test**: All verifications were code-level (structural). No empirical evidence of actually running the script in a Google Sheet has been captured (no screenshot or execution log).

## Recommendations

1. **Fix ROADMAP must-haves**: Check off all 6 must-have items in `ROADMAP.md` lines 8-13
2. **Close TODO items**: Mark implemented items in `TODO.md` as `[x]`
3. **Remove stale ROADMAP metadata**: Lines 15-20 contain orphaned progress metadata that duplicates and contradicts the phase statuses below
4. **Live validation**: Deploy to a test Google Sheet and capture a screenshot or execution log as empirical evidence before archiving the milestone
5. **Archive milestone**: Once gaps are closed, archive v2.0 and prepare for the next milestone

## Technical Debt to Address

- [ ] No live deployment test captured (empirical validation gap)
- [ ] `ROADMAP.md` contains stale inline progress section (lines 15-20) that should be removed
- [ ] `TODO.md` items not synchronized with completed work
