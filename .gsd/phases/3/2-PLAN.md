---
phase: 3
plan: 2
wave: 1
---

# Plan 3.2: Template Copy Polish — Institutional Tone

## Objective

Revise the copy of all 7 templates to align with PUCV institutional tone: colons after vocatives, no redundancies, and professional but warm phrasing consistent with the IDIOMAS PUCV campaign style.

## Context

- `src/Templates.gs` — all `buildHtml()` functions
- `.gsd/TODO.md` — User's specific feedback on copy issues

## Tasks

<task type="auto">
  <name>Fix vocative punctuation across all templates</name>
  <files>src/Templates.gs</files>
  <action>
    Audit every `buildHtml` for vocative lines and ensure they use COLON (`:`) not COMMA (`,`).

    Current issues found:
    - **confirmation** (line ~172): uses comma → `Estimado(a) ... ,` → change to `:`
    - All others already use `:` — verify and confirm.
    
    Also standardize the vocative format:
    - Use `"Estimado/a"` (with slash) instead of `"Estimado(a)"` (with parens) for all templates.
    - This aligns with the IDIOMAS PUCV campaign style shown by the user.
    
    Templates to update:
    1. certificate: `Estimado(a)` → `Estimado/a`
    2. confirmation: `Estimado(a)` → `Estimado/a` + comma → colon
    3. placement_test: `Estimado(a)` → `Estimado/a`
    4. report_delivery: `Estimado(a)` → `Estimado/a`
    5. payment_reminder: uses "Hola" — OK, leave as is (informal urgency tone)
    6. code_delivery: uses "Hola" — OK, leave as is
    7. survey: `Estimado(a)` → `Estimado/a`
  </action>
  <verify>No template uses `Estimado(a)` — all use `Estimado/a`; no vocative uses comma</verify>
  <done>All formal templates use "Estimado/a ... :" pattern</done>
</task>

<task type="auto">
  <name>Eliminate redundancies and improve clarity</name>
  <files>src/Templates.gs</files>
  <action>
    Review and improve specific wording across templates:

    1. **survey** (line ~487): "sobre el desarrollo y calidad de tu curso actual" — verify this was already fixed in Phase 1 (was "curso actual que estás cursando")
    2. **survey** (line ~492): "Te recordamos que la completación" → "Recuerda que completar" (more natural)
    3. **survey** (line ~492): "para la gestión y posterior envío" → "para el envío" (simpler)
    4. **certificate** (line ~105): "Nos complace saludarte e informarte" → "Nos es grato informarte" (more concise)
    5. **confirmation** (line ~173): "Nos complace saludarte y confirmarte" → "Te informamos con gusto"
    6. **placement_test** (line ~286): "Esperamos que te encuentres muy bien. Te escribimos para enviarte" → "Te hacemos llegar" (more direct)
    7. **payment_reminder** (line ~232): "Te contactamos de manera urgente para recordarte" — OK, keep urgency tone
    8. **report_delivery** (line ~434): "Junto con saludarte cordialmente" — OK, formal enough

    AVOID: Over-editing. Only fix clear redundancies and fluff. Keep the warm institutional tone.
  </action>
  <verify>Check that no template contains "Nos complace saludarte" or "Estimado(a)" patterns</verify>
  <done>Copy is concise, professional, and free of redundancies</done>
</task>

## Success Criteria

- [ ] All formal vocatives use "Estimado/a" with colons
- [ ] No template contains "Nos complace saludarte"
- [ ] Survey template improved wording
- [ ] Certificate, confirmation, placement_test improved openings
