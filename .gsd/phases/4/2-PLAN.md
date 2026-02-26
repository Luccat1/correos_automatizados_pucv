---
phase: 4
plan: 2
wave: 1
---

# Plan 4.2: Template Creation Guide & AGENTS.md

## Objective
Write the developer-facing guide on how to add new templates, and update AGENTS.md for future AI assistants working on this codebase.

## Context
- .gsd/SPEC.md
- .gsd/DECISIONS.md
- src/Templates.gs (template pattern reference)
- AGENTS.md (existing file to update)

## Tasks

<task type="auto">
  <name>Create template creation guide</name>
  <files>docs/CREATING_TEMPLATES.md</files>
  <action>
    Create `docs/CREATING_TEMPLATES.md` — A developer guide for adding new email templates:

    1. **Overview** — The template registry pattern (what each field does)
    2. **Template Object Structure** — Full reference of all fields:
       - `id` (required) — Unique string identifier
       - `name` (required) — Spanish display name
       - `requiredHeaders` (required) — Array of column names
       - `senderName` — Default sender display name
       - `senderAlias` — Optional alias email
       - `statusColumn` — Name of the status tracking column
       - `headerTitle` — Title for email header bar
       - `footerLines` — Array of footer text lines
       - `defaults` — Object of configurable overrides
       - `processRow(row, headers, rowIndex)` (required) — Row processing function
       - `buildHtml(data)` (required) — HTML content builder function
    3. **Step-by-Step: Adding a New Template**
       a. Open `Templates.gs`
       b. Define template object with all required fields
       c. Implement `processRow` — use `requiredCell()` and `safeCell()` from Core
       d. Implement `buildHtml` — use `buildButton()`, `buildInfoBox()`, `buildWarningBox()` from Core
       e. Call `registerTemplate(yourTemplate)` at the bottom of the file
       f. Test with "Vista Previa" and "Enviar Prueba" from the menu
    4. **Example** — A simplified example template for reference (e.g., a generic notification)
    5. **Available Core Helpers** — Quick reference of all Core.gs functions available to templates

    Language: Spanish.
  </action>
  <verify>
    - `docs/CREATING_TEMPLATES.md` exists
    - Contains template object structure reference
    - Contains step-by-step guide
    - Includes example template
  </verify>
  <done>Template creation guide with full reference and example template</done>
</task>

<task type="auto">
  <name>Update AGENTS.md</name>
  <files>AGENTS.md</files>
  <action>
    Update `AGENTS.md` to reflect the new unified architecture:

    1. **Project Overview** — Unified Email System PUCV (Apps Script)
    2. **File Structure**:
       - `src/Core.gs` — Shared engine (24 functions)
       - `src/Templates.gs` — Template registry (7 templates)
       - `src/Main.gs` — Entry point and menu handlers
       - `docs/DEPLOYMENT.md` — Deployment guide
       - `docs/CREATING_TEMPLATES.md` — Template dev guide
    3. **Patterns**:
       - Registry pattern for templates
       - Config sheet for per-deployment settings
       - Status column tracking for idempotent sends
    4. **Code Conventions**:
       - English for code (variables, functions, comments)
       - Spanish for user-facing strings (menu labels, alerts, template content)
       - JSDoc on all functions
       - PUCV 100-year palette (primary: #24588d)
    5. **How to Extend** — Point to CREATING_TEMPLATES.md
  </action>
  <verify>
    - AGENTS.md exists and reflects current architecture
  </verify>
  <done>AGENTS.md updated with accurate project description and patterns</done>
</task>

## Success Criteria
- [ ] docs/CREATING_TEMPLATES.md with full template authoring guide
- [ ] AGENTS.md accurately describes the new architecture
