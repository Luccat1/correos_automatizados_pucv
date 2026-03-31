---
created: 2026-03-31T21:23:10.204Z
title: Fix date format in email output
area: general
files:
  - src/Templates.gs:564
  - src/Templates.gs:703
  - src/Core.gs:179
---

## Problem

Dates in emails appear as raw JS Date strings, e.g.:
`Wed Apr 01 2026 00:00:00 GMT-0300 (hora de verano de Chile)`

This happens in the `class_start_announcement` and `class_start_professor` templates where `fechaInicio` is read via `requiredCell()` (which returns a Date object from the sheet) and then interpolated directly into HTML without formatting.

`formatDateEs()` already exists in `Core.gs:179` and produces "1 de abril de 2026" — it just isn't being called for these templates.

## Solution

In `processRow` for both `class_start_announcement` (line ~564) and `class_start_professor` (line ~703), wrap `fechaInicio` with `formatDateEs()` before storing it in the returned data object:

```js
fechaInicio: formatDateEs(fechaInicio),
```

Same pattern already used for `plazo` in the `report_delivery` template (line 168).
