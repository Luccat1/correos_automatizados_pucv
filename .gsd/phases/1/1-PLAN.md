---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Sheet Helpers & Status Tracking

## Objective
Build the foundational sheet-access layer of `Core.gs`. This handles everything related to reading from Google Sheets: opening sheets, mapping headers dynamically, reading cells safely, and managing status columns with efficient batch writes. Every template depends on these functions.

## Context
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- .gsd/DECISIONS.md
- Current scripts for reference patterns: `ConfirmationEmail`, `EnvioCertificados`, `PlacementTest`, `PaymentReminder.js`, `Informe`

## Tasks

<task type="auto">
  <name>Create Core.gs with sheet helper functions</name>
  <files>src/Core.gs</files>
  <action>
    Create `src/Core.gs` with the following sheet helper functions:

    1. `getActiveSheet()` — Returns the active sheet from the bound spreadsheet.
    2. `getSheetByName(name)` — Gets a sheet by name with error handling.
    3. `mapHeaders(sheet)` — Reads row 1 headers, returns an object mapping lowercase header names to 0-based column indexes. Must handle trimming and case-insensitive matching.
    4. `safeCell(row, colIndex)` — Safely reads a cell value from a row array by index, returns trimmed string or empty string if index is undefined/out-of-range.
    5. `requiredCell(row, colIndex, fieldName, rowNumber)` — Like safeCell but throws descriptive error if value is empty.
    6. `ensureColumn(sheet, headers, columnName)` — Checks if a column exists; if not, creates it at the end. Returns 1-based column index.
    7. `batchUpdateColumn(sheet, startRow, colIndex1Based, values2DArray)` — Writes a 2D array of values to a single column starting at startRow. Encapsulates batch write pattern.

    All functions in English, with JSDoc comments including @param and @return.
    Use the naming pattern: public functions camelCase, private helpers prefixed with underscore.
    Do NOT include any template-specific logic.
  </action>
  <verify>
    Open `src/Core.gs` and verify:
    - All 7 functions exist with JSDoc
    - No template-specific code
    - Header mapping is case-insensitive
    - Batch write function uses setValues() not per-cell writes
  </verify>
  <done>All 7 sheet helper functions implemented with JSDoc in Core.gs</done>
</task>

<task type="auto">
  <name>Add utility functions to Core.gs</name>
  <files>src/Core.gs</files>
  <action>
    Add the following utility functions to `src/Core.gs`:

    1. `now()` — Returns formatted timestamp string using `Utilities.formatDate()` with timezone `America/Santiago`.
    2. `isValidEmail(email)` — Validates email format with regex.
    3. `parseEmailList(input)` — Parses a comma/semicolon-separated string of emails into a clean array. Trims whitespace, filters invalid entries.
    4. `extractFirstName(fullName)` — Extracts first name from a full name string.
    5. `extractFileId(url)` — Extracts Google Drive file ID from various URL formats (/d/ID, id=ID).
    6. `checkQuota()` — Returns remaining daily email quota via `MailApp.getRemainingDailyQuota()`.
    7. `sleep(ms)` — Wrapper for `Utilities.sleep()`.

    Keep JSDoc on all functions. These are general utilities, not template-specific.
  </action>
  <verify>
    Open `src/Core.gs` and verify:
    - All 7 utility functions exist with JSDoc
    - `parseEmailList` handles both comma and semicolon separators
    - `extractFileId` handles both /d/ and id= URL patterns
  </verify>
  <done>14 total functions in Core.gs (7 sheet + 7 utility)</done>
</task>

## Success Criteria
- [ ] `src/Core.gs` exists with 14 functions
- [ ] All functions have JSDoc comments
- [ ] No template-specific or hardcoded configuration exists
- [ ] Code is in English, ready for Spanish templates to consume
