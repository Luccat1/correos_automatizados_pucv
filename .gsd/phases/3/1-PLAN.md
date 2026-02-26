---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Fallback Greeting & extractFirstName Enhancement

## Objective

When a recipient has no name, the system should produce a generic, polite greeting (e.g., "Estimado/a estudiante") instead of an empty or broken salutation. This requires updating `extractFirstName()` in `Core.gs` and ensuring all templates handle the fallback correctly.

## Context

- `src/Core.gs` — `extractFirstName()`
- `src/Templates.gs` — all 7 templates' `buildHtml()`

## Tasks

<task type="auto">
  <name>Enhance extractFirstName with fallback</name>
  <files>src/Core.gs</files>
  <action>
    Update `extractFirstName(fullName)` to accept an optional second parameter `fallback`:
    ```javascript
    function extractFirstName(fullName, fallback) {
      if (!fullName || !fullName.toString().trim()) return fallback || "";
      const parts = fullName.toString().trim().split(/\s+/);
      return parts[0];
    }
    ```
    This preserves backward compatibility (existing callers without fallback still get empty string).
  </action>
  <verify>Function signature includes fallback parameter</verify>
  <done>`extractFirstName("", "estudiante")` returns "estudiante"; `extractFirstName("Juan Pérez")` returns "Juan"</done>
</task>

<task type="auto">
  <name>Update all templates to use fallback greetings</name>
  <files>src/Templates.gs</files>
  <action>
    For each template, update how `firstName` is computed in `processRow`:

    1. **certificate** (line ~91): `firstName: extractFirstName(nombre, "estudiante")`
    2. **confirmation** (line ~164): `firstName: extractFirstName(nombre, "estudiante")`
    3. **payment_reminder** (line ~221): `firstName: extractFirstName(nombre, "estudiante")`
    4. **placement_test** (line ~278): `firstName: extractFirstName(nombre, "estudiante")`
    5. **code_delivery** (line ~341): `firstName: extractFirstName(nombre, "estudiante")`
    6. **report_delivery** (line ~428): Already uses full professorName in greeting — no change needed
    7. **survey** (line ~475): `firstName: extractFirstName(nombre, "estudiante")`

    Also update each `buildHtml` vocative to handle the fallback. Pattern:
    - When firstName was extracted from a real name: `"Estimado(a) <strong>Juan</strong>:"`
    - When firstName is the fallback "estudiante": `"Estimado/a estudiante:"`

    The simplest approach: in `buildHtml`, check if data.nombre is populated. If it is, use `"Estimado(a) <strong>${data.firstName}</strong>:"`. If not, use `"Estimado/a estudiante:"`.

    AVOID: Changing report_delivery — it uses `data.professorName` directly and always requires a name.
  </action>
  <verify>All 6 applicable templates have fallback greetings</verify>
  <done>Templates produce "Estimado/a estudiante:" when the nombre field is empty</done>
</task>

## Success Criteria

- [ ] `extractFirstName` accepts a fallback parameter
- [ ] All templates except report_delivery use fallback "estudiante"
- [ ] Greeting is "Estimado/a estudiante:" when name is missing
