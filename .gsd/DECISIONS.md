# Decisions Log

> Architecture Decision Records for the project.

## ADR-001: Multi-file Bound Script Architecture (2026-02-26)

**Context:** Needed to decide between GAS Library, single-file, or multi-file bound scripts.

**Decision:** Multi-file bound scripts (Core.gs + Templates.gs + Main.gs) copied into each Sheet.

**Rationale:**
- GAS Libraries add latency on every function call and version management is fragile
- Single file would be too large and hard to maintain
- Multi-file leverages GAS's shared global scope (no imports needed)
- Copy-paste deployment is simple for a small team

**Status:** Accepted

---

## ADR-002: PUCV Institutional Color Palette (2026-02-26)

**Context:** Needed to define a consistent color system for email templates.

**Decision:** Use the PUCV 100-year anniversary palette:
- Primary: `#24588d` (azul institucional)
- Blues: `#1d71b8`, `#008cba`, `#36a9e1`, `#a3d1e3`
- Accents: `#e73a34` (red/urgent), `#ee7269` (soft red), `#9366a9` (purple)
- Highlights: `#f4ce46` (yellow), `#30b6be` (teal)
- Background: `#ece5e0` (warm grey)

**Status:** Accepted

---

## Phase 1 Decisions (2026-02-26)

### Branding & Layout
- Logo PUCV **always in header** by default, but configurable per template (e.g., UNESCO logo for Cátedra)
- Footer **varies per area** — each template defines its own footer unit name (Programa Idiomas, CELE, DGAI, Cátedra UNESCO, etc.)
- Use the 100-year anniversary palette; `#24588d` as primary, `#e73a34` for urgency accents

### Menu Options
Standard menu items:
1. 📧 Enviar correos (masivo)
2. 🧪 Enviar prueba (al usuario activo)
3. 👁 Vista previa (HTML en logs)
4. 📝 Crear borrador

Additional features requested:
- **CC/BCC configuration** from menu or config sheet
- **Scheduled sends** (time-based triggers)
- **Custom additional messages** — ability to inject contextual notes into templates (e.g., "complete la encuesta para recibir su certificado")

### Drive Sharing
- Part of each template's logic, not a global Core feature
- Core provides the helper function; templates decide whether to call it

### Code Language
- **English** for code (functions, variables, comments) — easier to maintain
- **Spanish** for all user-facing content (templates, menu labels, alerts, status messages)

### Scope Clarification
- Scheduled sends may require GAS triggers (`ScriptApp.newTrigger`) — include basic support in Core but keep advanced scheduling for a future phase
