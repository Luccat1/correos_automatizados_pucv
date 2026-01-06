# AGENTS.md

## Project Context

- **Type**: Google Apps Script (GAS) standalone project (bound to Google Sheets).
- **Main Logic**: `ConfirmationEmail` (likely `Code.gs` in GAS) processes student registrations from a Google Sheet and sends confirmation emails with dynamic payment details and discount logic.
- **Environment**: The code runs in the Google Apps Script environment attached to a Google Sheet.

## Dev Environment Tips

- **Files**:
  - `ConfirmationEmail`: Contains the main logic for course confirmation emails.
  - `Code Sending Script.json`: Appsscript configuration file.
- **Syntax**: Standard JavaScript (ES6 supported by GAS).
- **Libraries**: Uses `GmailApp`, `SpreadsheetApp`, and `Session` global services.

## Testing Instructions

- **Test Emails**:
  - Use `sendGenericTestEmail_Conf()` to send a generated test email to the active user.
  - Use `createDraftOfFirstPending()` to create a draft in Gmail for the first pending row in the sheet, allowing visual verification before sending.
  - Use `previewOneConfirmation()` to log the HTML/Text body to the execution logs without sending anything.
- **Manual Verification**:
  - Check the "Confirmaciones" sheet (or defined `sheetName`).
  - Columns expected: `nombre`, `correo`, `idioma`, `nivel`, `horario`, `plazo`, `es_continuacion`, `estado`.
  - Verify that status columns are updated ("Enviado ...", "Borrador ...", "Error ...").

## Deployment Instructions

- **Manual Sync**:
  1. Copy the content of the local file (`ConfirmationEmail`).
  2. Paste it into the Google Apps Script editor.
  3. Save and Refresh the Sheets tab if custom menus are used.

## Code Conventions

- **Configuration**: Keep `CFG_CONF` at the top of the file for easy adjustment of IDs, Templates, and Logic.
- **Logging**: Use `Logger.log()` or `console.log()` for output.
- **Status Updates**: The script writes back to the sheet to prevent double-sending. Always ensure the "estado" column is respected.
