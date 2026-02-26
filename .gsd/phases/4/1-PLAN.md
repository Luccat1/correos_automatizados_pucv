---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: HTML Template Selector Dialog

## Objective

Replace the current text-prompt-based template selector (`menuSetupTemplate`) with a rich HTML dialog that displays all available templates as clickable cards showing the template name, ID, required columns, and config keys. Selecting a template triggers the existing `_generateSheets()` logic.

## Context

- `src/Main.gs` — `menuSetupTemplate()`, `_generateSheets()`
- `src/Templates.gs` — `listTemplates()`, template registry
- `src/SendDialog.html` — reference for dialog styling patterns

## Tasks

<task type="auto">
  <name>Create TemplateSelector.html dialog</name>
  <files>src/TemplateSelector.html</files>
  <action>
    Create a new HTML file `src/TemplateSelector.html`:
    - Title: "Seleccionar Plantilla"
    - Lists all templates as styled cards in a vertical layout
    - Each card shows: template name (bold), template ID (monospace subtitle), required columns (pill badges), and config keys (if any)
    - Clicking a card highlights it; a "Configurar" button at the bottom triggers `google.script.run.setupTemplateFromDialog(templateId)`
    - A "Cancelar" button calls `google.script.host.close()`
    - Style consistent with SendDialog.html (same color palette, same font)
    - Template data is passed via HtmlService template variables (array of {id, name, requiredHeaders, configKeys})
    
    AVOID: Complex JavaScript — keep it simple with onclick handlers.
  </action>
  <verify>File exists at src/TemplateSelector.html</verify>
  <done>A styled HTML dialog with template cards is created</done>
</task>

<task type="auto">
  <name>Wire menuSetupTemplate to use HTML dialog</name>
  <files>src/Main.gs</files>
  <action>
    1. Update `menuSetupTemplate()` to:
       - Call `listTemplates()` but also enrich with `requiredHeaders` and `configKeys` from each template
       - Create an HtmlService template from `TemplateSelector.html`
       - Pass the enriched template list as a template variable
       - Show the dialog as a modal (500x500)
    
    2. Add `setupTemplateFromDialog(templateId)`:
       - A server-side callback that receives the selected template ID
       - Calls `_generateSheets(templateId)` 
       - Returns success/error status to the dialog
    
    3. Add a `description` field to each template in `Templates.gs`:
       - certificate: "Envío de certificados con enlace a Google Drive"
       - confirmation: "Confirmación de apertura de curso con detalles de pago"
       - payment_reminder: "Recordatorio urgente de plazo de pago"
       - placement_test: "Credenciales para Placement Test en plataforma"
       - code_delivery: "Entrega de códigos de acceso a materiales"
       - report_delivery: "Informe de evaluación docente con enlace compartido"
       - survey: "Encuesta de percepción estudiantil"
    
    AVOID: Breaking existing _generateSheets logic.
  </action>
  <verify>menuSetupTemplate opens an HTML dialog instead of a text prompt</verify>
  <done>Template selector shows visual cards with descriptions</done>
</task>

## Success Criteria

- [ ] `menuSetupTemplate` opens an HTML dialog (not a text prompt)
- [ ] Template cards show name, ID, description, required columns, and config keys
- [ ] Selecting a template and clicking "Configurar" generates Config + Data sheets
