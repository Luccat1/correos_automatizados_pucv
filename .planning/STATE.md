# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Cualquier funcionario del Centro de Idiomas puede enviar correos institucionales masivos, correctamente formateados y rastreados, sin conocimientos tecnicos, usando solo Google Sheets.
**Current focus:** Phase 1 - Reliability Hardening

## Current Position

Phase: 1 of 3 (Reliability Hardening)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-25 — Roadmap created

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 3-phase coarse structure: hardening first, then operational quality, then architecture/tooling
- [Roadmap]: ARCH-02 (report_delivery hardcoded indexes) placed in Phase 1 as a reliability fix, not Phase 3

### Pending Todos

6 todos capturados:
- `refactor-eliminar-codigo-duplicado-y-deuda-tecnica-en-main-gs` — Código duplicado (menuPreview/menuSendTest), legacy report_delivery en _executeBatch, validación incompleta en registerTemplate, parseEmailList inconsistente
- `mejorar-manejo-de-errores-en-batch-y-ux-de-confirmacion` — Error silenciado como SALTADO en processFn, sin conteo de filas en confirmación, falta opción "Reintentar Errores"
- `sanitizar-html-en-email-builders-para-prevenir-xss` — buildButton/buildInfoBox/buildEmailLayout interpolan sin escapar HTML
- `mejorar-usabilidad-de-plantillas-y-ampliar-herramientas-del-menu` (2026-04-14) — Helpers para usuarios no-técnicos (validación previa, diagnóstico de hoja, instrucciones in-sheet) + ampliar menú (ver config activa, previsualización masiva, guía de uso)
- `alinear-flujo-de-prueba-con-envio-real-incluyendo-senddialog` (2026-04-14) — menuSendTest no abre SendDialog, los tests no ejercitan el mismo code path que el envío real; solución: pasar prueba por SendDialog con flag is_test
- `agregar-tipo-de-envio-recordatorio-con-diseno-diferenciado` (2026-04-14) — Añadir send_type inicial/recordatorio; recordatorios con título, tono, alertBand y botón distintos para diferenciarse visualmente del correo inicial

### Blockers/Concerns

- MailApp.getRemainingDailyQuota() vs GmailApp quota bucket may be separate counters -- verify empirically before Phase 2 quota forecast (ROBUST-04)

## Session Continuity

Last session: 2026-03-25
Stopped at: Roadmap created, ready to plan Phase 1
Resume file: None
