---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: onOpen Menu & Template Selection

## Objective
Create `src/Main.gs` with the `onOpen()` trigger that builds the Google Sheets custom menu and the template selection logic that determines which template to use for the current Sheet.

## Context
- .gsd/SPEC.md
- .gsd/DECISIONS.md (ADR-001, Menu Options)
- src/Core.gs — `buildMenu`, `confirmAction`, `showAlert`, `showResult`
- src/Templates.gs — `getTemplate`, `listTemplates`

## Tasks

<task type="auto">
  <name>Create Main.gs with onOpen and template selection</name>
  <files>src/Main.gs</files>
  <action>
    Create `src/Main.gs` with:

    1. **`_getConfig()`** — Private helper that reads template configuration from the active Sheet.
       - Looks for a sheet named "Config" (case-insensitive) or uses PropertiesService.
       - If a "Config" sheet exists, read key-value pairs from columns A and B:
         - `template_id` — which template to use (e.g., 'certificate', 'survey')
         - `sender_name` — override sender (optional)
         - `sender_alias` — override alias (optional)
         - `cc` — default CC (optional)
         - `bcc` — default BCC (optional)
         - Additional template-specific keys (e.g., `payment_url`, `deadline_text`, `survey_url`, `program_name`)
       - Returns a config object `{ templateId, senderName, senderAlias, cc, bcc, extras: {} }`
       - If no Config sheet exists, show error dialog and return null.

    2. **`_getSelectedTemplate()`** — Gets the template from registry based on config.
       - Calls `_getConfig()` to get templateId.
       - Calls `getTemplate(templateId)` from Templates.gs.
       - If template not found, shows error with available templates via `listTemplates()`.
       - Returns `{ template, config }` or null on error.

    3. **`onOpen()`** — The standard GAS trigger that creates the custom menu.
       - Calls `buildMenu()` from Core.gs with user-approved items:
         - `📧 Enviar Correos` → `menuSendEmails`
         - `🧪 Enviar Prueba` → `menuSendTest`
         - `👁 Vista Previa` → `menuPreview`
         - separator
         - `📝 Crear Borradores` → `menuCreateDrafts`
         - separator
         - `ℹ️ Ver Configuración` → `menuShowConfig`
       - All function names reference functions in Main.gs (Plan 3.2).

    Code language: English. User-facing strings: Spanish.
    Do NOT implement the menu handler functions yet (menuSendEmails, etc.) — those are Plan 3.2.
    Create stub declarations for them so GAS doesn't error on menu click:
    ```
    function menuSendEmails() {}
    function menuSendTest() {}
    function menuPreview() {}
    function menuCreateDrafts() {}
    function menuShowConfig() {}
    ```
  </action>
  <verify>
    Open `src/Main.gs` and verify:
    - `onOpen` calls `buildMenu` with correct items
    - `_getConfig` reads from a "Config" sheet
    - `_getSelectedTemplate` resolves template from registry
    - All 5 menu handler stubs exist
  </verify>
  <done>Main.gs exists with onOpen, config reader, template selector, and 5 menu stubs</done>
</task>

## Success Criteria
- [ ] `src/Main.gs` exists
- [ ] `onOpen()` creates menu with 5 items and 2 separators
- [ ] `_getConfig()` can read template_id from a Config sheet
- [ ] `_getSelectedTemplate()` resolves the template from registry
