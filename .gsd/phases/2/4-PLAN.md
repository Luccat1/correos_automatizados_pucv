---
phase: 2
plan: 4
wave: 2
---

# Plan 2.4: Report Delivery & Survey Templates

## Objective
Add the `report_delivery` and `survey` templates to `Templates.gs`. Report delivery is the most complex template (cross-references two sheets, uses alias sending). Survey is a new template for sending perception questionnaires to students.

## Context
- src/Core.gs
- src/Templates.gs (from Plans 2.1-2.3 — registry + 5 templates exist)
- Reference script: `Informe`
- .gsd/SPEC.md (survey is a new template, no reference script)

## Tasks

<task type="auto">
  <name>Add report_delivery template</name>
  <files>src/Templates.gs</files>
  <action>
    Add the `report_delivery` template to `Templates.gs`:

    1. **`processRow(row, headers, rowIndex)`**:
       - This template is special — it reads from TWO sheets:
         - "Registro_Reportes" (main data: professor name, course, doc ID, URL)
         - "Directorio" (lookup: professor name → email, CC)
       - Reads from main row: professor name, course, doc ID/URL
       - Looks up professor email and CC from the directory sheet
       - Shares the Drive document with the professor using `shareFileAsViewer()`
       - Returns `{ professorName, course, reportUrl, email, cc, firstName }` or null if already sent

    2. **`buildHtml(data)`**:
       - Greeting with professor name
       - Message about evaluation report availability
       - Course name in bold
       - Button to view report ("Ver Informe de Evaluación")
       - Info box explaining what the report contains
       - Uses `buildButton()`, `buildInfoBox()` from Core.gs

    3. **Config fields**:
       - `id: 'report_delivery'`
       - `name: 'Entrega de Informes'`
       - `requiredHeaders: []` (uses fixed column indexes for the two-sheet pattern)
       - `senderName: 'Unidad de Evaluación Docente CELE'`
       - `senderAlias: 'cele.dgai@pucv.cl'`
       - `statusColumn: 'Estado'`
       - `headerTitle: 'RESULTADOS EVALUACIÓN DOCENTE'`
       - `footerLines: ['Unidad de Evaluación Docente', 'Centro de Estudios y Enseñanza de Lenguas Extranjeras', 'PUCV']`

    4. **Special: `directoryLookup(professorName, directoryData)`** — Helper function inside the template definition that searches the directory sheet for a professor name match and returns `{ email, cc }`. This encapsulates the cross-sheet logic.

    Note: The two-sheet pattern makes `processRow` more complex. The `directoryData` should be passed as part of the template's runtime context, loaded once before batch processing.
  </action>
  <verify>
    Open `src/Templates.gs` and verify:
    - `getTemplate('report_delivery')` returns the template
    - Template includes `senderAlias` for delegated sending
    - `processRow` handles cross-sheet lookup pattern
    - Drive sharing is integrated
    - `directoryLookup` helper exists within template
  </verify>
  <done>Report delivery template registered with cross-sheet lookup and alias sending</done>
</task>

<task type="auto">
  <name>Add survey template</name>
  <files>src/Templates.gs</files>
  <action>
    Add the `survey` template to `Templates.gs`:

    This is a NEW template (no existing reference script). It sends perception survey links to students.

    1. **`processRow(row, headers, rowIndex)`**:
       - Reads: nombre, correo
       - Returns `{ nombre, correo, firstName }` or null if already sent

    2. **`buildHtml(data)`**:
       - Greeting with first name
       - Message explaining the perception survey purpose
       - Emphasis on importance of completing the survey
       - Button to survey form ("Completar Encuesta")
       - Warning box about the connection between survey completion and certificate delivery (the user specifically mentioned this: "si les enviamos un correo para que rellenen encuestas que estos correos puedan añadirseles que es importante que las completen pues el envío de certificados está ligado a que se completen")
       - Uses `buildButton()`, `buildWarningBox()` from Core.gs

    3. **Config fields**:
       - `id: 'survey'`
       - `name: 'Encuesta de Percepción'`
       - `requiredHeaders: ['nombre', 'correo']`
       - `senderName: 'PUCV'` (overridable)
       - `statusColumn: 'Estado Encuesta'`
       - `headerTitle: 'ENCUESTA DE PERCEPCIÓN'`
       - `footerLines: ['Pontificia Universidad Católica de Valparaíso']`

    The survey URL and the warning message about certificates should be configurable via `defaults`.
  </action>
  <verify>
    Open `src/Templates.gs` and verify:
    - `getTemplate('survey')` returns the template
    - `buildHtml` includes warning about certificate dependency
    - Survey URL is configurable
    - Template is simple and clean (minimal required headers)
  </verify>
  <done>Survey template registered with certificate-dependency warning and configurable survey URL</done>
</task>

## Success Criteria
- [ ] Report delivery template with cross-sheet lookup and alias
- [ ] Survey template with certificate-dependency warning
- [ ] All 7 templates now registered in Templates.gs
- [ ] `listTemplates()` returns 7 entries
