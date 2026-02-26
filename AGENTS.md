# AGENTS.md — AI Context & Patterns

> Project: Unified Email System PUCV

## Overview

A robust, template-based email automation system for Google Apps Script. Designed for high reliability, institutional branding consistency, and ease of deployment.

## Architecture

The project follows a modular 3-file structure for Google Apps Script bound scripts:

1.  **`Core.gs`**: The engine. Handles low-level GAS API interactions (Gmail, Drive, Spreadsheet), HTML layout wrapping, and UI components.
2.  **`Templates.gs`**: The registry. Uses a registration pattern to define email campaigns (`certificate`, `survey`, `confirmation`, etc.).
3.  **`Main.gs`**: The controller. Manages user interactions via custom menus and coordinates data flow between the engine and templates.

## Core Patterns

- **Template Registry**: Templates are objects registered in a central registry. Each defines its own `processRow` and `buildHtml` logic.
- **Header Mapping**: The system maps human-readable column headers to indices at runtime, allowing users to reorder columns safely.
- **Idempotent Dispatch**: Uses a status column (configurable per template) to track progress and prevent duplicate sends.
- **Centralized Config**: A "Config" sheet provides per-deployment overrides (e.g., which template to use, sender alias).

## Conventions

- **Language**: Core logic, functions, variables, and internal comments are in **English**. All user-facing strings (labels, alerts, email content) are in **Spanish**.
- **Branding**: Fixed PUCV 100-year palette (Primary: `#24588d`). Logo in header is mandatory unless overridden by template config.
- **Extensibility**: To add a template, follow the guide in `docs/CREATING_TEMPLATES.md`.

## System Dependencies

- Google Apps Script (V8 Engine)
- Gmail API
- Google Drive API
- Spreadsheet API

## Context for Future Agents

- **Don't touch `Core.gs`** unless fixing a global engine bug.
- **Add new templates to `Templates.gs`** using the `registerTemplate` function.
- **Deployment is via copy-paste** — there is no CI/CD; documentation is the source of truth for setup.
