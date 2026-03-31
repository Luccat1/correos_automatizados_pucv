# Phase 1: Reliability Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> See `01-CONTEXT.md` for the authoritative decisions.

**Date:** 2026-03-31
**Facilitator:** Claude Code (discuss-phase workflow)

---

## Todos Reviewed

| Todo | Decision |
|------|----------|
| Mejorar manejo de errores en batch y UX de confirmacion | Folded into Phase 1 scope (covers ROBUST-01) |
| Sanitizar HTML en email builders para prevenir XSS | Deferred — security hardening, not reliability |

---

## Area 1: Pre-flight Email Validation (ROBUST-02)

**Q:** When the batch starts and invalid email addresses are found, what should happen?
**A:** Pre-flight scan → blocking alert + abort (no emails sent until all rows are valid)

**Q:** Should the existing strict isValidEmail() regex be used?
**A:** Strict regex (isValidEmail)

**Q:** Which column should pre-flight validation check?
**A:** Template's 'to' field from processRow (template-agnostic)

**Q:** What should the pre-flight alert show the operator?
**A:** Row number + invalid address (e.g. "Fila 3: correo_invalido@, Fila 7: sinArroba")

---

## Area 2: SALTADO vs ERROR Distinction (ROBUST-01)

**Q:** After the fix, what should processRow→null intentional skips write?
**A:** Keep SALTADO, but add timestamp: "SALTADO (2026-03-31 10:00:00)"
**User note:** "me parece bien mantener saltado, pero con esto perdemos el registro de cuándo exactamente se envió un correo" — confirmed timestamp addition resolves this.

**Q:** What format should actual errors use in the status column?
**A:** `ERROR: <message>` in Spanish

**Q:** Should SALTADO rows also include a timestamp?
**A:** Yes — "SALTADO (2026-03-31 10:00:00)"

---

## Area 3: report_delivery Column Names (ARCH-02)

**Q:** What header names should the report_delivery data sheet use?
**A:** Descriptive Spanish: `profesor`, `curso`, `doc_id`, `url_informe`

**Q:** What header names should the Directorio sheet use?
**A:** `nombre`, `correo`, `cc`

---

## Area 4: Drive Failure Atomicity (ROBUST-06)

**Q:** When shareFileAsViewer fails, what should happen?
**A:** ERROR status + no email sent

**Q:** Should error message include the Drive file ID?
**A:** Yes — "ERROR: No se pudo compartir el archivo <fileId>"

---

## Additional Area 5: Validation Location in Call Chain

**Q:** Where should the pre-flight email validation run?
**A:** Inside _executeBatch, before sendBatch is called

---

## Additional Area 6: Professor Not Found in Directory

**Q:** When directoryLookup returns null, should that be SALTADO or ERROR?
**A:** ERROR with descriptive message: "ERROR: Profesor no encontrado en Directorio: <professorName>"
*Rationale: this is a data integrity issue — professor exists in data sheet but missing from Directorio. Operator needs to know.*

---

## Additional Area 7: Backward Compatibility for report_delivery

**Q:** How should backward compatibility be handled?
**A:** Require operators to rename headers (no fallback to indexes). One-time migration.

---

## Additional Area 8: Re-run Idempotency (SALTADO)

**Q:** Should SALTADO rows be re-processed on re-run?
**A:** No — SALTADO rows remain skipped on re-run (same as ENVIADO/BORRADOR)

---

## Additional Area 9: Error Message Language

**Q:** Language for user-facing error messages in status column?
**A:** Spanish for all status column messages; console.error/warn can remain English

---

## Additional Area 10: Drive Sharing Timing

**Q:** Where should shareFileAsViewer be called?
**A:** Inside processRow, before returning data (keep current location, fix return value check)
