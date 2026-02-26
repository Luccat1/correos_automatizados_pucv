# Plan 3.2 Summary: Menu Handler Functions

## Objective
Implement mass sending, test emails, and visual previews.

## Completed Tasks
- [x] Implement `_executeBatch()` shared logic (send/draft)
- [x] Implement `menuSendTest()` (test row to current user)
- [x] Implement `menuPreview()` (modal dialog with rendered HTML)
- [x] Implement `menuShowConfig()` (human-readable configuration summary)

## Verification Results
- Shared batch logic correctly handles both live sending and draft creation
- `processFn` properly extracts recipient/cc/bcc from template-specific logic (e.g., report delivery lookup)
- Test email correctly uses `Session.getActiveUser()`
- Preview function renders complex HTML (including alert bands) inside a modal dialog
- Status column is automatically created if missing before processing
- Throttling and quota alerts integrated via `Core.gs` helpers
