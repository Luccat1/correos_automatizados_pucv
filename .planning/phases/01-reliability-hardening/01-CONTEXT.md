# Phase 1: Reliability Hardening - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers four concrete reliability fixes to the existing working email system:

1. **Visible error statuses** — Every row that fails processing writes a specific error reason to the status column instead of being silently absorbed as "SALTADO" (ROBUST-01)
2. **Pre-flight email validation** — Invalid recipient addresses are detected before the batch starts and the operator is shown a blocking alert with row numbers (ROBUST-02)
3. **Drive sharing failure handling** — When `shareFileAsViewer` fails for a row, that row gets ERROR status and no email is sent (ROBUST-06)
4. **report_delivery header migration** — The template reads its data columns by header name via `mapHeaders` instead of hardcoded 0-based indexes (ARCH-02)

This phase does NOT include: audit logging, progress toasts, quota forecasts, batch re-run UI, or any architectural changes to `_executeBatch` beyond what's required for these four fixes.

</domain>

<decisions>
## Implementation Decisions

### Pre-flight Email Validation (ROBUST-02)

- **D-01:** Pre-flight scan runs inside `_executeBatch`, after rows are collected but BEFORE `sendBatch` is called. If any invalid emails are found, the batch aborts entirely with a blocking alert — no emails are sent until all rows have valid addresses.
- **D-02:** Validation uses the strict `isValidEmail()` regex already in Core.gs (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). Not the loose `includes('@')` check from `parseEmailList`.
- **D-03:** The email to validate is extracted via each template's `processRow` call (template-agnostic — the planner must ensure this doesn't trigger side effects like Drive sharing during the validation pass).
- **D-04:** Alert format: list each invalid row as "Fila X: <invalid_address>", e.g., `Fila 3: nombre_invalido@, Fila 7: sinArroba`. Operator can navigate directly to the problematic rows.

### Error vs. Skip Status Distinction (ROBUST-01)

- **D-05:** Intentional `processRow → null` skips keep the "SALTADO" label but now include a timestamp: `SALTADO (2026-03-31 10:00:00)`. Same format as ENVIADO/BORRADOR.
- **D-06:** Actual exceptions from `processRow` or related code write `ERROR: <Spanish message>` to the status column, e.g., `ERROR: Falta el campo correo en fila 3`, `ERROR: No se pudo compartir el archivo 1BxiMVs...`.
- **D-07:** SALTADO rows (intentional skips) remain skipped on batch re-run — same behavior as ENVIADO/BORRADOR. They are NOT retried. Only ERROR and empty-status rows are retried (aligns with ROBUST-03).
- **D-08:** All user-facing messages written to the status column are in Spanish. `console.error` / `console.warn` in GAS logs may remain in English for developer debugging.

### Drive Sharing Failure (ROBUST-06)

- **D-09:** When `shareFileAsViewer` returns `{ success: false }`, `processRow` must treat this as a fatal row failure — return an error indicator that causes the row to get ERROR status and NO email to be sent.
- **D-10:** Error message format: `ERROR: No se pudo compartir el archivo <fileId>` — includes the Drive file ID to help the operator locate the specific file.
- **D-11:** Drive sharing stays inside `processRow` (current location). The fix is to check the return value and propagate the failure rather than silently continuing.

### report_delivery Column Migration (ARCH-02)

- **D-12:** Data sheet (`Datos_report_delivery`) required headers after migration: `profesor`, `curso`, `doc_id`, `url_informe`. The `requiredHeaders` array must be populated with these names (currently `[]`).
- **D-13:** Directorio sheet required columns: `nombre`, `correo`, `cc`. The `directoryLookup` function must use `mapHeaders` on the Directorio sheet instead of hardcoded indexes `dRow[0]`, `dRow[1]`, `dRow[2]`.
- **D-14:** Backward compatibility: operators must rename their existing columns to the new header names. No fallback to hardcoded indexes. This is a one-time migration; a note should be added to the Config sheet or README.

### Professor Not Found in Directory

- **D-15:** When `directoryLookup` returns null (professor not in the Directorio sheet), this is treated as a data integrity error — NOT an intentional skip. Status: `ERROR: Profesor no encontrado en Directorio: <professorName>`. This makes the data problem visible instead of silently skipping professors.

### Folded Todos

- **"Mejorar manejo de errores en batch y UX de confirmacion"** (todo from 2026-03-31): Error silenciado como SALTADO en processFn. Fully addressed by decisions D-05 through D-08 above. The catch block in `_executeBatch`'s processFn must propagate error messages instead of returning null.

### Claude's Discretion

- Exact mechanism for extracting the `to` email during pre-flight validation without triggering Drive sharing side effects — planner should decide the cleanest approach (e.g., lightweight `getRecipientEmail()` method on templates, or a `dryRun` flag to processRow)
- Whether `sendBatch` needs any signature changes to support the new error propagation from processRow, or if the existing null-return convention can be extended with an error-carrying object
- How to structure the pre-flight validation loop code within `_executeBatch` (separate function vs inline)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Code
- `src/Core.gs` — `sendBatch`, `isValidEmail`, `shareFileAsViewer`, `requiredCell`, `safeCell` implementations
- `src/Main.gs` — `_executeBatch`, `processFn` catch block (lines 386-421), `sendBatch` call, status column update
- `src/Templates.gs` — `reportDeliveryTemplate` with hardcoded indexes (lines 428-458), `directoryLookup` (lines 413-426)

### Requirements
- `.planning/REQUIREMENTS.md` — ROBUST-01, ROBUST-02, ROBUST-06, ARCH-02 definitions (authoritative acceptance criteria)

### Project Context
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and phase dependencies
- `CLAUDE.md` — GAS deployment and testing constraints (no local test runner; test via GAS editor)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `isValidEmail(email)` in Core.gs:144 — strict regex validation, already built, currently unused in batch flow
- `shareFileAsViewer(fileId, email)` in Core.gs:344 — returns `{ success: boolean, error?: string }`, return value currently ignored in reportDeliveryTemplate
- `requiredCell(row, colIndex, fieldName, rowNumber)` in Core.gs:92 — throws a localized Spanish error if cell is empty; already used in some templates
- `mapHeaders(sheet)` in Core.gs:58 — already used by all templates except report_delivery
- `now()` in Core.gs:136 — returns formatted timestamp string, already used by ENVIADO/BORRADOR statuses

### Established Patterns
- Status column format: `ENVIADO (2026-03-31 10:00:00)` — timestamp in parentheses after status label
- Error prefix: `ERROR:` followed by a descriptive Spanish message (established by quota protection in sendBatch: "ERROR: QUOTA INSUFICIENTE")
- Null return from processRow = SALTADO — current convention being extended, not replaced
- `mapHeaders` lowercase lookup: all header names compared lowercase

### Integration Points
- `_executeBatch` in Main.gs is the central orchestration point — pre-flight validation and processRow error propagation changes happen here
- `sendBatch` in Core.gs receives the `processFn` callback — current behavior: null return → "SALTADO"; may need to distinguish intentional null from error object
- `reportDeliveryTemplate.processRow` — the only template that calls Drive APIs and uses hardcoded column indexes

</code_context>

<specifics>
## Specific Ideas

- SALTADO timestamp format must match ENVIADO/BORRADOR: `SALTADO (YYYY-MM-DD HH:mm:ss)` using `now()` from Core.gs
- The pre-flight error alert should be a single `showAlert` call (not multiple popups) listing all invalid rows at once
- `requiredHeaders` for report_delivery must be: `['profesor', 'curso', 'doc_id', 'url_informe']`
- Directorio sheet headers must be: `nombre`, `correo`, `cc` (lowercase, for mapHeaders lookup)

</specifics>

<deferred>
## Deferred Ideas

- "Reintentar Errores" option in confirmation dialog — UX improvement for re-running only failed rows (belongs in Phase 2 operational quality work)
- Conteo de filas en confirmación — pre-send row count summary (Phase 2: ROBUST-04/UX-02)
- XSS sanitization in email builders (buildButton, buildInfoBox, buildEmailLayout) — security hardening, separate concern from reliability

### Reviewed Todos (not folded)
- `sanitizar-html-en-email-builders-para-prevenir-xss` — security improvement, not reliability. Not in Phase 1 scope.
- `refactor-eliminar-codigo-duplicado-y-deuda-tecnica-en-main-gs` — architectural debt (menuPreview/menuSendTest duplication, parseEmailList inconsistency). Belongs in Phase 3 architecture work.

</deferred>

---

*Phase: 01-reliability-hardening*
*Context gathered: 2026-03-31*
