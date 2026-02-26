# Plan 2.1 Summary: Template Registry & Certificate Template

## Objective
Create the foundational template registry and implement the first template.

## Completed Tasks
- [x] Create `Templates.gs` with registry pattern (`_REGISTRY`, `registerTemplate`, `getTemplate`, `listTemplates`)
- [x] Implement and register `certificate` template (handles Drive sharing and generic certificate delivery)

## Verification Results
- Registry validates required template fields (id, name, buildHtml, processRow)
- `listTemplates()` provides access to registered items
- Certificate template successfully extracts file IDs from diverse URL formats
- Drive sharing is natively integrated into the certificate row processing logic
- Template is generic and overridable via row data (program name)
