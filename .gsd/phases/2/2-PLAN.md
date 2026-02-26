---
phase: 2
plan: 2
wave: 1
---

# Plan 2.2: Menu Reorganization & Preview Enhancement

## Objective
Reorganize the flat menu into logical submenus and enhance the preview modal to render the email inside a styled dialog with scroll support.

## Context
- `src/Main.gs` — `onOpen`, `menuPreview`
- `src/Core.gs` — `buildMenu`, `buildEmailLayout`

## Tasks

<task type="auto">
  <name>Reorganize menu with submenus</name>
  <files>src/Main.gs, src/Core.gs</files>
  <action>
    1. Update `onOpen()` in Main.gs to use submenus:
       ```
       📧 Correos PUCV
       ├─ ⚙️ Configurar Plantilla
       ├─ ──────────────
       ├─ 📤 Envío
       │  ├─ 📧 Enviar Correos
       │  ├─ 📝 Crear Borradores
       │  └─ 🧪 Enviar Prueba
       ├─ ──────────────
       ├─ 🔍 Herramientas
       │  ├─ 👁 Vista Previa
       │  └─ ℹ️ Ver Configuración
       ```
    2. Update `buildMenu()` in Core.gs to support a `children` array for submenu items:
       - If an item has a `children` array, use `ui.createMenu(label).addItem(...)` to create a submenu and add it via `menu.addSubMenu()`
       - Preserve backward compatibility: items without `children` are still added normally
    
    AVOID: Changing function names or breaking existing references. Only the menu structure changes.
  </action>
  <verify>Menu renders with submenus when spreadsheet is reopened</verify>
  <done>Menu has "📤 Envío" and "🔍 Herramientas" submenus grouping related actions</done>
</task>

<task type="auto">
  <name>Enhance preview modal with styled dialog</name>
  <files>src/Main.gs</files>
  <action>
    1. Update `menuPreview()` to show a larger, more polished preview:
       - Set dialog size to 700x650 (wider for email readability)
       - Wrap the rendered HTML inside a container `<div>` with scroll support
       - Add a header bar at the top showing: template name, subject line, and recipient count
       - Add a "Cerrar" button at the bottom
    2. The preview HTML should be self-contained (no external dependencies) since it's served via `HtmlService`
    
    AVOID: Changing the actual email rendering logic — only the preview wrapper changes.
  </action>
  <verify>Preview dialog opens at 700x650 with a header bar, scrollable email content, and a close button</verify>
  <done>Preview modal shows a polished, scrollable email preview with metadata header</done>
</task>

## Success Criteria
- [ ] Menu has organized submenus (Envío, Herramientas)
- [ ] `buildMenu` supports nested `children` items
- [ ] Preview dialog is larger and includes metadata (template name, subject)
- [ ] All existing menu functions still work correctly
