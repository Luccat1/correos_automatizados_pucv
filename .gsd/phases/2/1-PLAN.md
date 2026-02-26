---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Template Registry & Certificate Template

## Objective
Create `src/Templates.gs` with the template registry pattern (register/get) and implement the first template: `certificate`. This merges `EnvioCertificados` and `CertificatesDiplomado.js` into a single, configurable certificate template that handles Drive sharing and multiple CC patterns.

## Context
- .gsd/SPEC.md
- .gsd/DECISIONS.md
- src/Core.gs (completed Phase 1)
- Reference scripts: `EnvioCertificados`, `CertificatesDiplomado.js`

## Tasks

<task type="auto">
  <name>Create Templates.gs with registry pattern</name>
  <files>src/Templates.gs</files>
  <action>
    Create `src/Templates.gs` with:

    1. `_REGISTRY` — Private object that stores registered templates by ID.

    2. `registerTemplate(template)` — Registers a template object. Validates that template has required fields: `id` (string), `name` (string), `buildHtml` (function), `processRow` (function). Throws error if missing.

    3. `getTemplate(id)` — Returns a registered template by ID, or null if not found.

    4. `listTemplates()` — Returns array of `{ id, name }` for all registered templates.

    Template object structure (documented in JSDoc):
    ```
    {
      id: string,              // Unique identifier (e.g. 'certificate')
      name: string,            // Display name in Spanish (e.g. 'Envío de Certificados')
      requiredHeaders: [],     // Array of required column names (lowercase)
      senderName: string,      // Default sender display name
      senderAlias: string,     // Optional alias email
      statusColumn: string,    // Name of the status column
      headerTitle: string,     // Title for the email header bar
      footerLines: [],         // Array of footer text lines
      buildHtml: function(data),    // Returns HTML body content (inner, not full layout)
      processRow: function(row, headers, rowIndex)  // Extracts data from row, returns object for buildHtml or null to skip
    }
    ```

    All functions with JSDoc. Do NOT include any template definitions yet — just the registry mechanism.
  </action>
  <verify>
    Open `src/Templates.gs` and verify:
    - `_REGISTRY` is a private object
    - `registerTemplate` validates required fields
    - `getTemplate` returns by ID
    - `listTemplates` returns id/name pairs
    - Template object structure is documented in JSDoc
  </verify>
  <done>Template registry pattern with register/get/list and documented structure in Templates.gs</done>
</task>

<task type="auto">
  <name>Add certificate template to Templates.gs</name>
  <files>src/Templates.gs</files>
  <action>
    Add the `certificate` template to `src/Templates.gs` by calling `registerTemplate()`:

    The certificate template merges patterns from `EnvioCertificados` and `CertificatesDiplomado.js`:

    1. **`processRow(row, headers, rowIndex)`**:
       - Reads: nombre, apellido (optional), correo, enlace (certificate link/URL)
       - Extracts file ID from the link using `extractFileId()`
       - Shares file as viewer with the recipient using `shareFileAsViewer()`
       - Returns `{ nombre, apellido, correo, certificateUrl, firstName }` or null if already sent

    2. **`buildHtml(data)`**:
       - Greeting with first name
       - Message about certificate availability
       - Button linking to the certificate ("Ver Certificado")
       - Info box with instructions to access
       - Uses `buildButton()` and `buildInfoBox()` from Core.gs
       - Do NOT hardcode any specific diploma name — make it configurable via a `programName` field in data

    3. **Config fields**:
       - `id: 'certificate'`
       - `name: 'Envío de Certificados'`
       - `requiredHeaders: ['nombre', 'correo', 'enlace']`
       - `senderName: 'PUCV'` (overridable)
       - `statusColumn: 'Estado'`
       - `headerTitle: 'ENVÍO DE CERTIFICADOS'`
       - `footerLines: ['Pontificia Universidad Católica de Valparaíso']`

    The template must be generic enough for any certificate (diplomados, cursos, etc.) — the specific program name comes from sheet configuration, not hardcoded.

    Call `registerTemplate(certificateTemplate)` at file load time (outside any function, at the bottom of the template definition).
  </action>
  <verify>
    Open `src/Templates.gs` and verify:
    - `getTemplate('certificate')` would return the template
    - `processRow` reads nombre, correo, enlace
    - `processRow` calls `shareFileAsViewer` and `extractFileId`
    - `buildHtml` uses `buildButton` and `buildInfoBox` from Core
    - No hardcoded diploma names
  </verify>
  <done>Certificate template registered with processRow + buildHtml, generic for any program</done>
</task>

## Success Criteria
- [ ] `src/Templates.gs` exists with registry pattern (register/get/list)
- [ ] Certificate template is registered and functional
- [ ] Template is generic (no hardcoded diploma names)
- [ ] Drive sharing integrated into processRow
