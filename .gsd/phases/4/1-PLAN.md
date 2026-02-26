---
phase: 4
plan: 1
wave: 1
---

# Plan 4.1: README, Deployment Guide & appsscript.json

## Objective
Rewrite `README.md` with the new unified architecture, create a deployment guide for end-users, and add the `appsscript.json` manifest file.

## Context
- .gsd/SPEC.md
- .gsd/DECISIONS.md
- src/Core.gs, src/Templates.gs, src/Main.gs

## Tasks

<task type="auto">
  <name>Rewrite README.md</name>
  <files>README.md</files>
  <action>
    Rewrite `README.md` entirely. Structure:

    1. **Title & badge** — "Correos Automatizados PUCV" with a short tagline
    2. **Overview** — What the system does (unified email automation on Google Sheets)
    3. **Architecture** — 3-file structure diagram:
       - `Core.gs` — Shared engine (sheet helpers, email sender, HTML layout, Drive sharing, menu builder)
       - `Templates.gs` — Template registry + 7 registered templates
       - `Main.gs` — Entry point, onOpen menu, batch/test/preview/draft handlers
    4. **Available Templates** — Table listing each template ID, name, and purpose:
       | ID | Name | Purpose |
       |---|---|---|
       | certificate | Envío de Certificados | Certificate delivery with Drive sharing |
       | confirmation | Confirmación de Apertura | Course opening with payment instructions |
       | payment_reminder | Recordatorio de Pago | Urgent payment deadline reminders |
       | placement_test | Placement Test | Credential delivery for testing platforms |
       | code_delivery | Envío de Códigos | Unique code distribution |
       | report_delivery | Entrega de Informes | Evaluation reports with cross-sheet lookup |
       | survey | Encuesta de Percepción | Student perception surveys |
    5. **Quick Start** — Link to deployment guide
    6. **Adding a New Template** — Link to template creation guide
    7. **License / Credits** — PUCV, Centro de Idiomas

    Language: Spanish (it's a user-facing document for PUCV staff).
    DO NOT include code samples in README — keep it clean and high-level.
  </action>
  <verify>
    Open `README.md` and verify:
    - Architecture section describes 3 files
    - Template table has 7 entries
    - Links to guides exist
  </verify>
  <done>README.md rewritten with architecture overview and template table</done>
</task>

<task type="auto">
  <name>Create deployment guide and appsscript.json</name>
  <files>docs/DEPLOYMENT.md, appsscript.json</files>
  <action>
    1. **Create `docs/DEPLOYMENT.md`** — Step-by-step guide for deploying the system to a new Google Sheet:
       
       Steps:
       a. Create a new Google Sheet (or use an existing one)
       b. Open Apps Script editor (Extensions → Apps Script)
       c. Create 3 files: `Core.gs`, `Templates.gs`, `Main.gs`
       d. Copy contents from repo `src/` folder into each file
       e. Create a "Config" sheet in the spreadsheet with key-value pairs:
          - Row 1: `template_id` | `certificate` (or whichever template)
          - Row 2: `sender_name` | `Programa Idiomas PUCV`
          - Row 3: `cc` | `idiomas@pucv.cl` (optional)
          - Additional optional rows for template-specific config
       f. Create a data sheet with the required column headers for the chosen template
       g. Reload the spreadsheet — custom menu appears
       h. Test with "🧪 Enviar Prueba" first

       Include a "Config Sheet Reference" table documenting all available config keys.
       Include a "Troubleshooting" section with common issues.

       Language: Spanish.

    2. **Create `appsscript.json`**:
       ```json
       {
         "timeZone": "America/Santiago",
         "dependencies": {},
         "exceptionLogging": "STACKDRIVER",
         "runtimeVersion": "V8",
         "oauthScopes": [
           "https://www.googleapis.com/auth/spreadsheets.currentonly",
           "https://www.googleapis.com/auth/gmail.compose",
           "https://www.googleapis.com/auth/gmail.send",
           "https://www.googleapis.com/auth/drive",
           "https://www.googleapis.com/auth/script.external_request"
         ]
       }
       ```
  </action>
  <verify>
    - `docs/DEPLOYMENT.md` exists with step-by-step instructions
    - `appsscript.json` exists with V8 runtime and correct scopes
  </verify>
  <done>Deployment guide and manifest file created</done>
</task>

## Success Criteria
- [ ] README.md rewritten with architecture and template table
- [ ] docs/DEPLOYMENT.md with step-by-step deployment guide
- [ ] appsscript.json with correct OAuth scopes
