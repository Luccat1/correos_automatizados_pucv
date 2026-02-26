---
phase: 4
plan: 2
wave: 1
---

# Plan 4.2: Data Sheet Auto-Detection

## Objective

Make the system find the correct data sheet by reading `data_sheet` from Config instead of requiring the user to be on the correct active sheet. Update `_getDataSheet` to be smarter about detecting the data sheet name, and improve error messages.

## Context

- `src/Main.gs` — `_getDataSheet()`, `_getConfig()`, `_executeBatch()`, `_showSendDialog()`
- The current flow: `_getConfig()` reads `data_sheet` from Config → `_getDataSheet(config.dataSheet)` looks up the sheet by name

## Tasks

<task type="auto">
  <name>Improve _getDataSheet auto-detection and error handling</name>
  <files>src/Main.gs</files>
  <action>
    The current `_getDataSheet` already works by name lookup. The issue is:
    1. If `config.dataSheet` is empty, it defaults to "Datos" — this is fine
    2. But `_generateSheets()` always names the data sheet "Datos" — it ignores any custom name
    
    Updates needed:
    1. In `_getDataSheet(name)`: improve the error message to list available sheets so the user knows what sheets exist
    2. In `_generateSheets()`: use the template name as suffix for data sheet naming, e.g., "Datos_survey" instead of always "Datos". This prevents conflicts when multiple templates share the same spreadsheet.
    3. Update `_generateSheets()` so that `data_sheet` value in Config is set to the actual generated data sheet name (e.g., "Datos_survey")
    4. In `_showSendDialog()` and `_executeBatch()`: the flow already reads `config.dataSheet` — no changes needed as long as Config has the correct value
    
    AVOID: Breaking backward compat — if `data_sheet` is already set to "Datos" by an existing Config sheet, it should still work.
  </action>
  <verify>_getDataSheet provides helpful error listing available sheets; generated data sheets use template-specific names</verify>
  <done>New setups create "Datos_{templateId}" sheets; existing "Datos" still works</done>
</task>

<task type="auto">
  <name>Add sheet status indicator to SendDialog</name>
  <files>src/SendDialog.html, src/Main.gs</files>
  <action>
    In `_showSendDialog()`, pass the data sheet name to the SendDialog so the user can see which sheet is being used:
    1. Add `html.dataSheetName = sheet.getName();` in `_showSendDialog()`
    2. In `SendDialog.html`, display a small info line like: "📊 Datos desde: Datos_survey (25 filas)"
    
    This gives the user confidence that the system found the right sheet.
    
    AVOID: Overcomplicating the dialog — just a small informational line.
  </action>
  <verify>SendDialog shows which data sheet is being used</verify>
  <done>Users can see which data sheet will be used before sending</done>
</task>

## Success Criteria

- [ ] New template setups create "Datos_{templateId}" sheets
- [ ] Existing "Datos" sheet names still work
- [ ] Error messages list available sheets when data sheet is not found
- [ ] SendDialog shows the data sheet name being used
