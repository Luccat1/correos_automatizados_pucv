---
phase: 1
plan: 3
wave: 2
---

# Plan 1.3: HTML Base Layout & Menu Builder

## Objective
Build the institutional HTML email layout system and the Google Sheets custom menu builder. The layout provides a consistent visual foundation (PUCV 100-year branding) that all templates inherit. The menu builder creates the standard `onOpen` menu with send/test/preview/draft options.

## Context
- .gsd/SPEC.md
- .gsd/DECISIONS.md (color palette, menu options, footer approach)
- src/Core.gs (from Plans 1.1 and 1.2)
- PUCV 100-year color palette: primary #24588d, blues #1d71b8 #008cba #36a9e1 #a3d1e3, accents #e73a34 #ee7269 #9366a9, highlights #f4ce46 #30b6be, background #ece5e0
- PUCV logo URL: https://comunicacionestrategica.pucv.cl/LOGO100/7/color.png

## Tasks

<task type="auto">
  <name>Add PUCV color palette and HTML base layout to Core.gs</name>
  <files>src/Core.gs</files>
  <action>
    Add the following to `src/Core.gs`:

    1. `COLORS` constant object — PUCV 100-year anniversary palette:
       ```javascript
       const COLORS = {
         primary: '#24588d',
         secondary: '#1d71b8',
         accent: '#008cba',
         light: '#36a9e1',
         lightest: '#a3d1e3',
         danger: '#e73a34',
         dangerSoft: '#ee7269',
         purple: '#9366a9',
         yellow: '#f4ce46',
         teal: '#30b6be',
         bg: '#ece5e0',
         white: '#ffffff',
         text: '#333333',
         textLight: '#666666',
         border: '#e0e0e0'
       };
       ```

    2. `DEFAULT_LOGO_URL` constant — PUCV 100-year logo URL.

    3. `buildEmailLayout(options)` — Master HTML layout function. Accepts:
       ```
       {
         content: string,        // Inner HTML content (the template's body)
         logoUrl: string,        // Optional, defaults to PUCV logo
         logoAlt: string,        // Optional, defaults to "PUCV"
         logoLink: string,       // Optional, URL the logo links to
         headerTitle: string,    // Text in the colored header bar (e.g. "PROGRAMA IDIOMAS PUCV")
         headerColor: string,    // Optional, defaults to COLORS.primary
         footerLines: string[],  // Array of footer text lines (e.g. ["Programa Idiomas PUCV", "DGAI", "PUCV"])
         alertBand: string,      // Optional alert text below header (for urgency, rendered in COLORS.danger)
         extraNote: string       // Optional additional message injected before footer (the "custom additional messages" feature)
       }
       ```
       Returns a complete `<!DOCTYPE html>` string with:
       - Centered logo above header (clickable if logoLink provided)
       - Colored header bar with title
       - Optional alert band in red
       - Content area with padding and typography
       - Optional extra note in a yellow callout box
       - Footer with variable lines
       - Inline CSS for email client compatibility
       - Uses COLORS palette throughout

    4. `buildButton(text, url, color)` — Returns an HTML button string. Defaults color to COLORS.primary.

    5. `buildInfoBox(content, borderColor)` — Returns a styled callout/info box HTML string with left border.

    6. `buildWarningBox(content)` — Returns a yellow warning box (like the "enrolled in different schedule" pattern).

    Ensure ALL CSS is inline-style where it matters for email rendering (Gmail strips <style> tags from received emails). The <style> block is for the sender's preview but inline styles are the actual enforcement.
  </action>
  <verify>
    Open `src/Core.gs` and verify:
    - COLORS object has all 15 palette colors
    - buildEmailLayout produces valid HTML with DOCTYPE
    - Logo, header, content, footer sections are present
    - alertBand and extraNote are optional
    - Button, info box, and warning box helpers exist
    - Key styles are inline (not just in style tag)
  </verify>
  <done>HTML layout system with PUCV branding, 4 helper functions, and COLORS palette in Core.gs</done>
</task>

<task type="auto">
  <name>Add menu builder to Core.gs</name>
  <files>src/Core.gs</files>
  <action>
    Add the following menu functions to `src/Core.gs`:

    1. `buildMenu(menuItems)` — Creates a custom menu in Google Sheets. Accepts an array of menu item objects:
       ```
       [
         { label: '📧 Enviar Correos', functionName: 'sendAll' },
         { label: '🧪 Enviar Prueba', functionName: 'sendTest' },
         { label: '👁 Vista Previa', functionName: 'preview' },
         { label: '📝 Crear Borrador', functionName: 'createDraft' },
         { separator: true },
         { label: '⚙️ Configuración', functionName: 'showConfig' }
       ]
       ```
       Uses `SpreadsheetApp.getUi().createMenu()` with support for separators via `.addSeparator()`.

    2. `confirmAction(title, message)` — Shows a YES/NO confirmation dialog via `SpreadsheetApp.getUi().alert()`. Returns boolean.

    3. `showAlert(title, message)` — Shows an info alert dialog.

    4. `showResult(processed, errors)` — Shows a formatted results summary dialog after batch operations.

    All with JSDoc. Menu labels in Spanish (user-facing). Function names in English.
  </action>
  <verify>
    Open `src/Core.gs` and verify:
    - buildMenu creates a Google Sheets custom menu
    - confirmAction returns boolean
    - showResult formats processed/errors nicely
    - All 4 UI functions have JSDoc
  </verify>
  <done>Menu builder + UI dialog functions added to Core.gs</done>
</task>

## Success Criteria
- [ ] PUCV 100-year color palette defined as COLORS constant
- [ ] buildEmailLayout produces consistent branded HTML with all optional sections
- [ ] Menu builder creates custom Sheets menu with separators
- [ ] UI dialog helpers provide consistent user feedback
- [ ] All CSS critical for email rendering is inline
