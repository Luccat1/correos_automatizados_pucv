# Technology Stack

**Project:** Correos Automatizados PUCV
**Researched:** 2026-03-25
**Mode:** Brownfield — existing system, extension and improvement focus

---

## Context: What the Stack Must Accept

This system is permanently bound to Google Apps Script. There is no alternative runtime — the system lives inside a Google Spreadsheet and uses GmailApp, GmailApp.createDraft, DriveApp, SpreadsheetApp, and HtmlService. These are non-negotiable. The research question is: what *surrounding* tooling is viable for local development, testing, and code quality, and what does the GAS runtime actually allow in 2025?

---

## Recommended Stack

### Core Runtime (Fixed — Cannot Change)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Google Apps Script (V8) | V8 engine (ES2019+) | Execution runtime | Bound to Sheets; only option for this use case |
| HtmlService | GAS built-in | Modal dialogs and template HTML | The only UI surface available inside GAS |
| GmailApp | GAS built-in | Send emails, create drafts, get aliases | Superior to MailApp for this use case — supports aliases, drafts, HTML |
| SpreadsheetApp | GAS built-in | Read/write sheet data | Core data source |
| DriveApp | GAS built-in | Share files as viewer | Used for certificate/report delivery |

**Why GmailApp over MailApp:** The system already correctly uses GmailApp. MailApp has a lower daily quota (100 for consumer accounts) and does not support aliases or draft creation. GmailApp supports both. Do not switch.

### Local Development Toolchain (Recommended Addition)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| clasp | 2.4.x | Push/pull .gs files from CLI, TypeScript transpilation | Eliminates manual copy-paste; enables version-controlled deploys |
| Node.js | 18 LTS or 20 LTS | clasp runtime dependency | Required by clasp; LTS versions are stable |
| @types/google-apps-script | latest | TypeScript type definitions for GAS globals | Enables IDE autocomplete for SpreadsheetApp, GmailApp, etc. |
| TypeScript | 5.x (optional) | Static typing for GAS code | Only valuable if migrating; adds build step complexity |

**clasp is the correct choice** for the deploy problem. It authenticates with OAuth, maps a local directory to a GAS project, and handles push/pull. The `clasp push` command replaces manual copy-paste. `clasp push --watch` enables hot-reload during development. clasp has been actively maintained by Google and is the official CLI tool for GAS.

**TypeScript: recommended ONLY for new files, not migration.** The existing `.gs` files work correctly. Migrating them to TypeScript would require a build step (clasp compiles `.ts` to `.gs` before pushing) and adds complexity with no runtime benefit. New templates added going forward could be written in TypeScript to get IDE safety, but forcing a migration of working code is not worth the disruption.

### Code Quality (Recommended Addition)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ESLint | 8.x | Lint `.gs` files treated as JS | Catches common errors before they reach GAS |
| Prettier | 3.x | Code formatting | Consistency across contributors |
| eslint-plugin-googleappsscript | latest (if available) | GAS-aware lint rules | Avoids flagging GAS globals as undefined |

**ESLint configuration note:** GAS globals (SpreadsheetApp, GmailApp, etc.) are not browser or Node globals. ESLint must be configured with `globals: { SpreadsheetApp: "readonly", GmailApp: "readonly", ... }` or use the `@types/google-apps-script` globals list. Without this, ESLint will flag every GAS API call as an undefined variable.

### Testing (No Local Test Runner — GAS Only)

| Approach | Tool | Confidence | Notes |
|----------|------|-----------|-------|
| In-editor test functions | Manual execution in GAS editor | HIGH | The only reliable approach for GAS-bound code |
| Jest with mocks | Jest + manual GAS mock objects | MEDIUM | Possible but expensive to maintain mock fidelity |
| gas-mock-globals | npm library | LOW | Exists but incomplete coverage of GAS API surface; maintenance uncertain |

**Verdict: Do not introduce Jest or a mock-based test runner for this project.** The PROJECT.md correctly identifies "Tests automatizados locales" as out of scope. The GAS API surface is too large and stateful to mock reliably. The existing pattern — named test functions (`menuSendTest`, manual single-row preview) executed in the GAS editor — is the correct approach. What the project should add is more granular test functions (e.g., `testBuildHtml_certificate()`, `testProcessRow_withMissingColumn()`) that validate individual functions without sending real emails. These run inside GAS and log to the Executions panel.

---

## GAS Runtime Limits (2026, HIGH confidence for quotas, MEDIUM for V8 specifics)

### Execution Time

| Limit | Value | Notes |
|-------|-------|-------|
| Maximum execution time per call | 6 minutes | Applies to all trigger and menu-invoked functions |
| Maximum execution time for simple triggers | 30 seconds | `onOpen()` and `onEdit()` are simple triggers |
| URL Fetch call timeout | 60 seconds | Not used in this project currently |

**Implication:** Batch sends of 100+ rows with sleep throttling (1 second per 20 emails) will approach but generally not exceed 6 minutes. A batch of 500 rows with 1-second sleep every 20 emails = 500 emails / 20 * 1s = ~25 seconds of sleep + processing time. Safe for most realistic campaign sizes at the Centro de Idiomas.

### Email Quotas (per 24-hour rolling window)

| Account Type | MailApp.sendEmail | GmailApp.sendEmail | Notes |
|--------------|-------------------|-------------------|-------|
| Personal Google account | 100 | 100 | Free tier |
| Google Workspace (paid) | 1,500 | 1,500 | Standard and higher tiers |
| Google Workspace Education | 1,500 | 1,500 | Applies to PUCV's domain |

**PUCV runs Google Workspace for Education.** The limit is 1,500 emails/day per GAS execution account. The system's quota check (`MailApp.getRemainingDailyQuota()`) is correct but returns MailApp quota, not GmailApp quota. These are tracked together — the same 1,500-email bucket. The current threshold of stopping at < 5 remaining is conservative and correct.

**Important:** The quota is per Google account running the script, not per spreadsheet. If multiple staff members run sends from different accounts, each has their own 1,500-email quota. If a single shared service account runs all sends, the 1,500 limit is shared.

### Spreadsheet / Sheets API Limits

| Operation | Limit | Notes |
|-----------|-------|-------|
| Read calls per 100 seconds (project) | 100 | Per GAS project, not per user |
| Write calls per 100 seconds (project) | 100 | Batch writes count as 1 call |
| Cells per read (getValues) | 10,000,000 | Practical limit is much lower due to memory |
| Max rows per spreadsheet | 10,000,000 | Academic constraint for this use case |

**The existing `batchUpdateColumn()` pattern is correct** — it writes all status updates in one `setValues()` call instead of per-row, staying well within write rate limits.

### Other Limits Relevant to This Project

| Resource | Limit | Relevance |
|----------|-------|-----------|
| Script properties storage | 500KB total | Low — not currently used |
| HtmlService output size | 100KB per response | Relevant for preview dialog; current HTML is well under this |
| Drive sharing permissions per day | No hard limit documented | Sharing ~1,500 files/day unlikely for this use case |
| Concurrent script executions | 30 per user | Not relevant — single-user menu operations |

---

## Deployment Toolchain Decision

### Current State: Manual Copy-Paste
**Problem:** Error-prone, no version control of what's actually deployed, cannot diff deployed vs local code, multiple staff maintainers increases risk.

### Recommended: clasp Push Workflow
```bash
# One-time setup per project
npm install -g @google/clasp
clasp login
clasp clone <SCRIPT_ID>  # pulls current GAS project into local files

# Development cycle
# 1. Edit .gs/.html files locally
clasp push              # deploys to GAS in seconds
# 2. Test in GAS editor or via Sheets menu
```

**The Script ID** is found in the GAS editor: Extensions > Apps Script > Project Settings > Script ID.

**Why clasp over manual copy-paste:**
- `clasp push` takes 5 seconds vs 5 minutes of manual copy-paste across 5 files
- `clasp diff` shows what will change before pushing
- `clasp pull` syncs cloud changes back to local (when someone edits in the GAS editor directly)
- Enables `git diff` on actual deployed code
- `clasp push --watch` auto-pushes on file save during active development

**What clasp does NOT solve:**
- No CI/CD without a service account key (requires OAuth secrets in environment)
- No automatic rollback — GAS has version history in the editor but clasp doesn't expose it cleanly
- No staging environment — there is one GAS project per spreadsheet

### File Structure with clasp

```
src/
  Core.gs
  Templates.gs
  Main.gs
  TemplateSelector.html
  SendDialog.html
.clasp.json          # { "scriptId": "...", "rootDir": "src" }
appsscript.json      # GAS manifest (timezone, OAuth scopes, etc.)
```

The `.clasp.json` tells clasp which directory to push. Keeping source in `src/` (already the current structure) requires `"rootDir": "src"` in `.clasp.json`. The `appsscript.json` manifest must also live in `src/` when using rootDir.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Deployment | clasp push | Manual copy-paste | Manual is error-prone and slow; clasp is the official Google CLI |
| Type safety | JSDoc + @types/google-apps-script | Full TypeScript migration | TS adds build complexity with marginal benefit for existing working code |
| Testing | In-editor GAS test functions | Jest + GAS mocks | Mock fidelity is expensive; GAS API surface too large to mock reliably |
| Email sending | GmailApp (current) | MailApp | MailApp lacks alias and draft support; already using the right choice |
| HTML templating | GAS HtmlService (current) | External template engine | No external engines work inside GAS; HtmlService is the only option |
| State/config storage | Config sheet (current) | PropertiesService | Sheet-based config is visible and editable by non-developers; correct for this use case |

---

## What NOT to Use

**Do not use `async/await`.** GAS V8 supports the syntax but execution is synchronous — `await` does not yield to other operations. Promises are not useful in GAS. All GAS API calls are blocking. The existing synchronous code is correct.

**Do not use `import`/`require`.** GAS has no module system. All `.gs` files share a single global scope per execution. This is a hard constraint of the runtime, not a choice.

**Do not use `setTimeout` or `setInterval`.** These are browser globals. Use `Utilities.sleep(ms)` for throttling (already done correctly).

**Do not use npm packages at runtime.** npm packages run in Node.js, not GAS. clasp can bundle libraries at build time if using TypeScript + webpack, but this adds significant complexity and is not recommended for this project's scope.

**Do not introduce a web app deployment** (`doGet`, `doPost`). The PROJECT.md correctly identifies an independent web interface as out of scope. The system's value is in its Sheets integration.

**Do not use Google Apps Script Library imports** for code that must be edited frequently. GAS Libraries (versioned external script dependencies) have poor debuggability and require version bumps to pick up changes. They are appropriate for stable shared utilities, not for actively developed template code.

---

## appsscript.json Manifest (Required for clasp)

When adopting clasp, an `appsscript.json` manifest must exist in `src/`. The minimum required content for this project:

```json
{
  "timeZone": "America/Santiago",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

**`exceptionLogging: "STACKDRIVER"`** is strongly recommended — it routes `console.error()` and uncaught exceptions to Cloud Logging, which provides better visibility than the default GAS log viewer. This is already partially supported (the code uses `console.error` and `console.warn` throughout).

---

## Installation (clasp Setup)

```bash
# Install clasp globally
npm install -g @google/clasp

# Install type definitions for IDE support (project-level)
npm init -y
npm install -D @types/google-apps-script

# Authenticate (opens browser OAuth flow)
clasp login

# Link to existing GAS project
# Get Script ID from: GAS Editor > Project Settings > Script ID
clasp clone YOUR_SCRIPT_ID --rootDir src

# Or if .clasp.json already exists with scriptId, just push
clasp push
```

---

## Sources

- Google Apps Script quotas page: https://developers.google.com/apps-script/guides/services/quotas (verified structure from training data; quota numbers are HIGH confidence for Workspace Education tier)
- clasp GitHub repository: https://github.com/google/clasp (official Google tool, stable as of 2024-2025)
- GAS V8 runtime announcement: https://developers.google.com/apps-script/guides/v8-runtime (V8 has been default since 2020; HIGH confidence)
- @types/google-apps-script: https://www.npmjs.com/package/@types/google-apps-script (maintained community package; HIGH confidence for existence, MEDIUM for completeness)
- GmailApp quota documentation: https://developers.google.com/apps-script/reference/gmail/gmail-app (HIGH confidence; 1,500/day for Workspace is well-established)

**Confidence note:** Web fetch and web search were unavailable during this research session. All quota numbers and tool versions are drawn from training data (cutoff August 2025). The GAS quota structure (1,500 emails/day for Workspace) has been stable for several years and is HIGH confidence. clasp version specifics (2.4.x) are MEDIUM confidence — verify current version with `npm info @google/clasp version` before adopting.
