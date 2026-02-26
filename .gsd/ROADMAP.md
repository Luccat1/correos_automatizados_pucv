# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: v1.0 — Unified Email System

## Must-Haves (from SPEC)

- [x] Core engine (`Core.gs`) with shared helpers
- [x] Shared institutional HTML base layout
- [x] Template registry pattern
- [x] All 7 templates implemented and tested
- [x] Custom Google Sheets menus
- [x] Clean, documented code
- [x] Deployment documentation

## Phases

### Phase 1: Core Engine
**Status**: ✅ Complete
**Objective**: Build `Core.gs` — the shared foundation that all templates depend on.
**Delivers**:
- Sheet access helpers (open sheet, map headers, ensure status column, safe cell read)
- Email sending engine (send or draft, with CC/BCC, alias support)
- Drive sharing helper
- Status tracking (batch writes)
- HTML base layout function (institutional header, content slot, footer, button styles)
- Menu builder (`onOpen` registration)
- Quota checking

### Phase 2: Template System
**Status**: ✅ Complete
**Objective**: Build `Templates.gs` with the registry pattern and port all existing email types.
**Delivers**:
- Template registry (register/get pattern)
- Template definition structure: `{ id, name, config, buildHtml, buildPlainText }`
- Port existing templates:
  - `certificate` (merged from EnvioCertificados + CertificatesDiplomado)
  - `confirmation` (from ConfirmationEmail)
  - `payment_reminder` (from PaymentReminder)
  - `placement_test` (from PlacementTest)
  - `code_delivery` (from script_envio)
  - `report_delivery` (from Informe)
- New template: `survey`

### Phase 3: Main Entry Point & Menus
**Status**: ✅ Complete
**Objective**: Build `Main.gs` — the entry point that wires templates to menus and user actions.
**Delivers**:
- `onOpen()` with custom menu (Enviar, Prueba, Vista Previa)
- Template selection logic (from sheet config or menu)
- Test email function
- Preview function
- Draft creation function

### Phase 4: Documentation & Deployment
**Status**: ✅ Complete
**Objective**: Write deployment guide and template creation guide.
**Delivers**:
- Updated `README.md` with new architecture overview
- Template creation guide (how to add a new template)
- Deployment instructions (copy files → bound script → configure)
- Updated `AGENTS.md`
- Updated `appsscript.json` manifest

### Phase 5: Gap Closure & GitHub Prep
**Status**: ✅ Complete
**Objective**: Clean repository, remove legacy files, add .gitignore, and prepare for GitHub.
**Gaps to Close:**
- [ ] Delete ~9 legacy script files superseded by unified system
- [ ] Remove GSD framework artifacts not part of the project (adapters/, scripts/, GSD docs)
- [ ] Add `.gitignore` for clean version control
- [ ] Fix ROADMAP must-have checkboxes (cosmetic)
