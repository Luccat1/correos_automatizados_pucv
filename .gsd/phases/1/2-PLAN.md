---
phase: 1
plan: 2
wave: 2
---

# Plan 1.2: Template Selector Menu & Auto-Sheet Generation

## Objective
Add a menu option that lists all available templates and, upon selection, automatically creates the Config sheet and a data sheet with the correct headers for the chosen template. Also add auto-detection of the data sheet (by name from Config) so users don't need to be on the correct sheet tab.

## Context
- src/Templates.gs (`listTemplates()`, `getTemplate()`, template objects with `requiredHeaders` and `configKeys`)
- src/Main.gs (`onOpen()`, `_getConfig()`, `_executeBatch()`)
- src/Core.gs (UI helpers: `showAlert`, `buildMenu`)

## Tasks

<task type="auto">
  <name>Implement menuSetupTemplate with sheet generation</name>
  <files>src/Main.gs</files>
  <action>
    1. **Add `menuSetupTemplate()` function** to Main.gs:
       - Call `listTemplates()` to get available templates
       - Show a dialog (using `SpreadsheetApp.getUi().prompt()` or an HTML sidebar) asking user to pick a template ID
       - Once selected, call `_generateSheets(templateId)`

    2. **Add `_generateSheets(templateId)` private function**:
       - Get the template object from registry
       - Create or overwrite a sheet named "Config" with these rows:
         - Row 1: `template_id` | `{templateId}`
         - Row 2: `sender_name` | `{template.senderName}`
         - Row 3: `data_sheet` | `Datos` (default data sheet name)
         - Additional rows for each `configKeys` entry with empty values and a comment
       - Create or overwrite a sheet named "Datos" with:
         - Row 1: all `requiredHeaders` as column headers
         - If template has a `statusColumn`, add it as the last header
       - Format: bold header row, auto-resize columns
       - Show confirmation alert

    3. **Update `onOpen()` menu** to add the new option:
       ```javascript
       { label: '⚙️ Configurar Plantilla', functionName: 'menuSetupTemplate' }
       ```
       Add it after the existing separator, before "Ver Configuración".
  </action>
  <verify>
    - `menuSetupTemplate` function exists in Main.gs
    - `_generateSheets` function creates Config and Datos sheets
    - Menu includes "Configurar Plantilla" option
  </verify>
  <done>Menu option generates Config + Datos sheets for any selected template</done>
</task>

<task type="auto">
  <name>Auto-detect data sheet from Config</name>
  <files>src/Main.gs</files>
  <action>
    1. **Update `_getConfig()`** to read `data_sheet` key from Config (store as `config.dataSheet`).

    2. **Create `_getDataSheet()` helper function**:
       ```javascript
       function _getDataSheet(config) {
         const ss = SpreadsheetApp.getActiveSpreadsheet();
         const sheetName = config.dataSheet || 'Datos';
         const sheet = ss.getSheetByName(sheetName);
         if (!sheet) {
           showAlert('Hoja No Encontrada', `No se encontró la hoja "${sheetName}". Use "⚙️ Configurar Plantilla" para generarla.`);
           return null;
         }
         return sheet;
       }
       ```

    3. **Update all menu handlers** (`menuSendTest`, `menuPreview`, `menuSendEmails`, `menuCreateDrafts`) to use `_getDataSheet(config)` instead of `SpreadsheetApp.getActiveSheet()` for data rows. Keep `getActiveSheet()` only as fallback if `data_sheet` is not configured.
  </action>
  <verify>
    - `_getDataSheet` function exists
    - `_executeBatch` uses `_getDataSheet` instead of `getActiveSheet`
    - `menuSendTest` and `menuPreview` use `_getDataSheet`
  </verify>
  <done>Script finds data sheet by name from Config; user no longer needs to be on correct tab</done>
</task>

## Success Criteria
- [ ] Menu has "⚙️ Configurar Plantilla" option
- [ ] Selecting a template auto-generates Config + Datos sheets
- [ ] Config includes `data_sheet` key pointing to the data sheet
- [ ] All send/preview/test operations use the named data sheet, not active sheet
