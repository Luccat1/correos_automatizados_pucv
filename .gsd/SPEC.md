# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision

A unified, extensible email automation system for PUCV's Centro de Idiomas and related academic units, built on Google Apps Script. The system provides a **core engine** (sheet reading, email sending, Drive sharing, status tracking, HTML rendering) and a **template registry** pattern, so adding a new email campaign is as simple as defining a configuration object and an HTML builder function — then copying the project files into any Google Sheet.

## Goals

1. **Unify duplicated logic** — Extract the shared patterns (sheet access, header mapping, batch processing, status columns, safe-cell reading, Drive sharing) into a reusable core engine (`Core.gs`).
2. **Institutional design system** — Create a shared HTML base layout (header, content, footer, button styles, PUCV branding) that all templates inherit, ensuring visual consistency.
3. **Template registry** — Define each email type (certificates, confirmations, reminders, placement tests, surveys, reports) as a registered template with its own config and HTML builder, all living in a clean template file.
4. **Sheet-bound deployment** — Each use case is deployed as a bound script in its own Google Sheet, with custom menus (`onOpen`) for send, test, and preview actions.
5. **Clean, documented codebase** — Rewrite all scripts from scratch with consistent naming, JSDoc comments, and clear separation of concerns.
6. **Extensibility** — Make it trivial to add new email templates by following a documented pattern.

## Non-Goals (Out of Scope)

- Web app or dashboard UI (stays in Google Sheets)
- Automated scheduling (triggers can be added later per-Sheet)
- Google Workspace Add-on publishing (too much overhead for internal use)
- External API integrations (payment, testing platforms are link-only)
- Unit testing framework (GAS lacks good native testing; manual test functions suffice)

## Users

- **Primary:** Luciano Cataldo and the Centro de Idiomas PUCV administrative team — they configure spreadsheets, run scripts, and manage email campaigns.
- **Secondary:** Academic coordinators (Cátedra UNESCO, CELE, DGAI) who receive CC'd emails and occasionally trigger sends.

## Architecture Decision

**Multi-file bound script per Spreadsheet:**

Each deployment consists of **3 `.gs` files** copied into the target Sheet's Apps Script project:

| File | Purpose |
|------|---------|
| `Core.gs` | Engine: sheet reading, email sending, Drive sharing, status tracking, menu builder, HTML base layout |
| `Templates.gs` | All registered email templates (config + HTML builders) |
| `Main.gs` | Entry point: selects which template to use, wires `onOpen` menu |

**Why not a GAS Library?**
- Libraries add latency on every function call
- Version management across many Sheets is fragile
- Copy-paste deployment is simpler for a small team and avoids permission issues

**Why multi-file instead of single file?**
- GAS shares global scope across `.gs` files — no imports needed
- Separating Core / Templates / Main keeps each file focused and readable
- Adding a new template only touches `Templates.gs` (and optionally `Main.gs` for the menu)

## Constraints

- Google Apps Script V8 runtime
- Gmail daily sending quotas (~100-1500 depending on account type)
- No npm, no build tools, no TypeScript — plain JavaScript
- Deployment is manual copy-paste into Apps Script editor
- Email HTML must be inline-style compatible (Gmail strips `<style>` tags in received emails, but GAS `sendEmail` preserves them for the sender's rendering)

## Templates (Consolidated)

| Template ID | Name | Merges From |
|-------------|------|-------------|
| `certificate` | Envío de Certificados | `EnvioCertificados` + `CertificatesDiplomado.js` |
| `confirmation` | Confirmación de Apertura | `ConfirmationEmail` |
| `payment_reminder` | Recordatorio de Pago | `PaymentReminder.js` |
| `placement_test` | Placement Test | `PlacementTest` |
| `code_delivery` | Envío de Códigos | `script_envio` |
| `report_delivery` | Entrega de Informes | `Informe` |
| `survey` | Encuesta de Percepción | *New* |

## Success Criteria

- [ ] Single `Core.gs` replaces all duplicated helper functions
- [ ] Shared HTML base layout produces visually consistent emails across all templates
- [ ] All 7 templates work correctly (send test email successfully)
- [ ] Adding a new template requires editing only `Templates.gs` (+ optional `Main.gs` menu entry)
- [ ] Custom menu appears in Google Sheets with send/test/preview options
- [ ] Clean code: JSDoc on all public functions, consistent naming, no hardcoded IDs
- [ ] Documentation: README with deployment instructions and template creation guide
