# Plan 3.1 Summary: onOpen Menu & Template Selection

## Objective
Create the entry point structure and wire it to the template system.

## Completed Tasks
- [x] Implement `onOpen()` with the approved 5-item menu
- [x] Implement `_getConfig()` to read template settings from a "Config" sheet
- [x] Implement `_getSelectedTemplate()` to resolve template ID against the registry

## Verification Results
- Custom menu appears appropriately on sheet load (simulated)
- Configuration reader correctly extracts `template_id` and extra parameters
- Template resolution handles invalid IDs gracefully with helpful alerts
- Stubs created for secondary functions ensure the menu is clickable from the start
