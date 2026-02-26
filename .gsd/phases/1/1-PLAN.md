---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Template Config Keys & Config Reader Enhancement

## Objective
Add `configKeys` declarations to each template (documenting what Config sheet keys they support) and enhance `_getConfig()` in Main.gs to pass template-specific config values into the processing pipeline. Templates should read params like `survey_url` and `extra_note` from Config instead of only using hardcoded defaults.

## Context
- src/Templates.gs (7 templates with `defaults` objects)
- src/Main.gs (`_getConfig()`, `_getSelectedTemplate()`, `_executeBatch()`)
- src/Core.gs (`buildEmailLayout()` already supports `extraNote`)

## Tasks

<task type="auto">
  <name>Add configKeys to all templates and read from Config</name>
  <files>src/Templates.gs, src/Main.gs</files>
  <action>
    1. **In each template object in `Templates.gs`**, add a `configKeys` array listing the Config sheet keys that template supports. For example:
       - `certificate`: `['program_name']`
       - `confirmation`: `['payment_url', 'payment_deadline', 'discount_code']`
       - `payment_reminder`: `['deadline_text', 'payment_url']`
       - `placement_test`: `['platform_url', 'deadline_text']`
       - `code_delivery`: `['code_type']`
       - `report_delivery`: `['directory_sheet_name']`
       - `survey`: `['survey_url', 'program_name', 'extra_note']`

    2. **In each template's `processRow` function**, merge `config.extras` values into the returned data object so `buildHtml` can use them. Pattern:
       ```javascript
       processRow: function(row, headers, rowIndex, extraData) {
         // ... existing extraction ...
         return {
           // ... existing fields ...
           // Merge config extras for buildHtml access
           surveyUrl: (extraData && extraData.configExtras && extraData.configExtras.survey_url) || this.defaults.surveyUrl,
           extraNote: (extraData && extraData.configExtras && extraData.configExtras.extra_note) || null
         };
       }
       ```

    3. **In `Main.gs` `_executeBatch()`**, pass `config.extras` into `extraData` so templates can read them:
       - Update the `extraData` object (line ~219) to include `configExtras: config.extras`
       - Also pass extraData in `menuSendTest()` and `menuPreview()`

    4. **In `buildHtml` functions**, use the config-provided values. Specifically for `survey`:
       - Use `data.surveyUrl` instead of `this.defaults.surveyUrl`
       - If `data.extraNote` exists, add it using `buildWarningBox()` or similar

    5. **In `buildEmailLayout()` in Core.gs**, the `extraNote` option already exists — templates just need to pass it through from their return data.
  </action>
  <verify>
    - Every template has a `configKeys` array property
    - `survey` template's `processRow` reads `survey_url` and `extra_note` from extraData
    - `_executeBatch` passes `config.extras` as part of `extraData`
  </verify>
  <done>All 7 templates declare configKeys; values from Config sheet override template defaults</done>
</task>

## Success Criteria
- [ ] All 7 templates have `configKeys` array
- [ ] Config sheet values override template defaults
- [ ] `survey` template reads `survey_url` and `extra_note` from Config
