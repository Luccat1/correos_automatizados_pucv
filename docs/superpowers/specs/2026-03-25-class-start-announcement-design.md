# Class Start Announcement — Design Spec

**Date:** 2026-03-25
**Status:** Approved

## Overview

Two new email templates for announcing the start of language courses at PUCV. A single data sheet drives both sends, which are executed independently so operators can choose when to notify each group.

- `class_start_students` — one email per student confirming course details and professor contact
- `class_start_professor` — one email per professor per course combination with enrolled student list

## Data Sheet Structure

One sheet with mixed student and professor rows. Required column names (lowercase, as used by `mapHeaders`):

| Column | Description |
|--------|-------------|
| `nombre` | Full name of person in this row |
| `correo` | Email address |
| `idioma` | Language (e.g. Inglés, Alemán) |
| `nivel` | Level (e.g. A2, B1) |
| `horario` | Schedule string (e.g. "L-J 8-9") |
| `sala` | Classroom (e.g. E101) |
| `nombre_profesor` | Professor's full name (repeated on every row) |
| `correo_profesor` | Professor's email (repeated on every row) |
| `es_profesor` | Binary flag: `0` = student, `1` = professor |

The professor row carries its own name and email in `nombre`/`correo`. The `nombre_profesor`/`correo_profesor` columns are denormalized on every row so the student template can read them without cross-row lookup.

**Status columns:** Two separate tracking columns allow independent send tracking:
- `Estado Inicio` — student sends
- `Estado Inicio Profesor` — professor sends

## Architecture Change: `prepareExtraData` Hook

A generic hook is added to `_executeBatch` in `Main.gs`. Before the row iteration loop, if the selected template defines `prepareExtraData`, it is called once with all data rows:

```javascript
if (typeof template.prepareExtraData === 'function') {
  const allRows = dataSheet.getDataRange().getValues();
  const allRowsData = allRows.slice(1); // skip header row
  template.prepareExtraData(allRowsData, headers, extraData);
}
```

The hook mutates `extraData` in-place. No return value. This replaces the pattern of adding `if (template.id === ...)` branches to `_executeBatch` for templates that need cross-row data (previously used only by `report_delivery`).

## Template: `class_start_students`

**id:** `class_start_students`
**name:** `Inicio de Clases — Estudiantes`
**requiredHeaders:** `['nombre', 'correo', 'idioma', 'nivel', 'horario', 'sala', 'nombre_profesor', 'correo_profesor', 'es_profesor']`
**statusColumn:** `Estado Inicio`
**No `prepareExtraData` hook** — standard batch template.

### `processRow`

- If `es_profesor == 1`: return `null` (skip row)
- Otherwise return:
  ```
  { nombre, correo, idioma, nivel, horario, sala,
    nombreProfesor, correoProfesor, firstName }
  ```

### `buildHtml`

```
Estimado/a [firstName]:

Te informamos que tu curso ya tiene fecha de inicio confirmada:

[infoBox]
  Idioma:   [idioma]
  Nivel:    [nivel]
  Horario:  [horario]
  Sala:     [sala]
  Profesor: [nombreProfesor]
  Contacto: [correoProfesor]
[/infoBox]

Si tienes alguna consulta antes del inicio, puedes escribirle
directamente a tu profesor/a.

Programa Idiomas PUCV
```

## Template: `class_start_professor`

**id:** `class_start_professor`
**name:** `Inicio de Clases — Profesores`
**requiredHeaders:** same as above
**statusColumn:** `Estado Inicio Profesor`
**Has `prepareExtraData` hook.**

### `prepareExtraData(allRowsData, headers, extraData)`

Iterates all rows. For rows where `es_profesor == 0`, groups the student into a map keyed by `"${idioma}|${nivel}|${horario}"`. Writes result to `extraData.courseGroups`:

```javascript
extraData.courseGroups = {
  "Inglés|A2|L-J 8-9": [
    { nombre: "Ana García", correo: "ana@..." },
    ...
  ],
  ...
}
```

### `processRow`

- If `es_profesor == 0`: return `null` (skip row)
- Otherwise: build course key from row's `idioma`/`nivel`/`horario`, look up `extraData.courseGroups[key]` (default to `[]` if not found), return:
  ```
  { nombre, correo, idioma, nivel, horario, sala,
    firstName, students: [...] }
  ```

### `buildHtml`

```
Estimado/a Prof. [firstName]:

A continuación encontrará la información de su curso y
la nómina de estudiantes inscritos:

[infoBox]
  Idioma:   [idioma]
  Nivel:    [nivel]
  Horario:  [horario]
  Sala:     [sala]
[/infoBox]

Estudiantes inscritos ([N]):
• [nombre] — [correo]
• ...

Programa Idiomas PUCV
```

The student list is rendered as a `<ul>` with each `<li>` containing name and email, styled with existing institutional colors from `Core.gs`.

## Out of Scope

- No payment links, buttons, or Drive sharing
- No CC/BCC logic beyond what the operator sets manually in Config
- `report_delivery` special-case `if` block in `_executeBatch` is **not** refactored in this task — that is Phase 3 work

## Files Changed

| File | Change |
|------|--------|
| `src/Main.gs` | Add `prepareExtraData` hook call in `_executeBatch` (~4 lines) |
| `src/Templates.gs` | Add `class_start_students` and `class_start_professor` template objects + `registerTemplate` calls |
