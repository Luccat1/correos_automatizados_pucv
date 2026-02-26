---
phase: 5
plan: 1
wave: 1
gap_closure: true
---

# Fix: Legacy File Cleanup & .gitignore

## Problem
The repository contains ~9 legacy script files that were superseded by the unified system (Phases 1-3), plus GSD framework artifacts that are not part of the email system. No `.gitignore` exists.

## Root Cause
The original scripts were kept as reference during the rewrite. GSD framework files were installed for the development methodology. Neither was cleaned up after completion.

## Tasks

<task type="auto">
  <name>Delete legacy script files</name>
  <files>CertificatesDiplomado.js, Code Sending Script.json, ConfirmationEmail, EnvioCertificados, PaymentReminder.js, PlacementTest, Informe, script_envio, script_envio.dart</files>
  <action>
    Delete ALL of these files/folders from the repository root:
    - `CertificatesDiplomado.js`
    - `Code Sending Script.json`
    - `ConfirmationEmail`
    - `EnvioCertificados`
    - `PaymentReminder.js`
    - `PlacementTest`
    - `Informe`
    - `script_envio`
    - `script_envio.dart`

    These are the original scripts that have been fully ported into `src/Templates.gs`.
  </action>
  <verify>None of the deleted files exist: `ls *.js, ls *.json (except appsscript.json), ls *.dart`</verify>
  <done>All 9 legacy files removed from repository</done>
</task>

<task type="auto">
  <name>Remove GSD framework artifacts and add .gitignore</name>
  <files>GSD-STYLE.md, PROJECT_RULES.md, model_capabilities.yaml, adapters/, scripts/, docs/model-selection-playbook.md, docs/runbook.md, docs/token-optimization-guide.md, .gitignore</files>
  <action>
    1. Delete GSD methodology files NOT part of the email system:
       - `GSD-STYLE.md`
       - `PROJECT_RULES.md`
       - `model_capabilities.yaml`
       - `adapters/` (entire directory: CLAUDE.md, GEMINI.md, GPT_OSS.md)
       - `scripts/` (entire directory: search/validate/setup scripts)
       - `docs/model-selection-playbook.md`
       - `docs/runbook.md`
       - `docs/token-optimization-guide.md`

    2. Create `.gitignore`:
       ```
       # GSD internal state (development methodology)
       .gsd/

       # Agent configuration
       .agent/
       .agents/
       .gemini/

       # OS files
       .DS_Store
       Thumbs.db
       desktop.ini

       # Editor files
       *.swp
       *.swo
       *~
       ```
  </action>
  <verify>`cat .gitignore` shows correct contents; `ls adapters/` returns error (deleted); `ls scripts/` returns error (deleted)</verify>
  <done>GSD artifacts removed, .gitignore created</done>
</task>

## Success Criteria
- [ ] No legacy script files remain in repo root
- [ ] No GSD framework files remain (adapters/, scripts/, GSD-STYLE.md, etc.)
- [ ] `.gitignore` exists with appropriate exclusions
- [ ] Only project files remain: src/, docs/, README.md, AGENTS.md, appsscript.json
