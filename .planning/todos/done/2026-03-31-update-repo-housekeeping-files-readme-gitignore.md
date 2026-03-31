---
created: 2026-03-31T21:23:10.204Z
title: Update repo housekeeping files README gitignore
area: docs
files:
  - README.md
  - .gitignore
---

## Problem

Housekeeping files (README, .gitignore, etc.) likely need updating as the project has evolved — new templates added, architecture settled, GAS deployment flow clarified, `.planning/` directory added.

## Solution

Review and update:
- `README.md` — reflect current templates, deployment steps, and architecture
- `.gitignore` — ensure `.planning/` internals, local configs, and any secrets are excluded as needed
- Any other root-level docs that may be stale
