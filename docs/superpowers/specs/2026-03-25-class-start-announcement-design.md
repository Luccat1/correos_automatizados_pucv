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

### `es_profesor` type check

GAS `getValues()` returns numbers as `Number` but cells formatted as Text return strings. Both templates must check:

```javascript
const esProfesor = String(safeCell(row, headers['es_profesor']) || '0').trim() === '1';
```

This handles `1` (Number), `"1"` (String), and any accidental whitespace.

### Status columns

Two separate tracking columns allow independent send tracking:
- `Estado Inicio` — student sends
- `Estado Inicio Profesor` — professor sends

### Two-step setup wizard

Because both templates share one data sheet, the operator must run **Herramientas > Configurar plantilla** twice — once for `class_start_students` and once for `class_start_professor`. Each run adds its own status column (`Estado Inicio` and `Estado Inicio Profesor` respectively). Both columns must exist before either send is executed. The second setup run will detect existing columns and not overwrite them.

**Important:** each setup run creates a separate data sheet (`Datos_class_start_students` and `Datos_class_start_professor`). After running setup for `class_start_professor`, the operator must update the `data_sheet` value in its Config sheet to point to the same sheet as `class_start_students` (e.g. `Datos_class_start_students`). Both templates share one data sheet.

## Architecture Change: `prepareExtraData` Hook

A generic hook is added to `_executeBatch` in `Main.gs`. It must be called in **three places**: `_executeBatch`, `menuSendTest`, and `menuPreview` — because all three call `processRow` and the professor template requires `extraData.courseGroups` to be populated first.

In all three locations, the hook uses the `rows` array **already in scope** (do not re-read the sheet):

```javascript
// rows is already defined as: values.slice(1)
if (typeof template.prepareExtraData === 'function') {
  template.prepareExtraData(rows, headers, extraData);
}
```

The hook mutates `extraData` in-place. No return value.

For `menuSendTest` and `menuPreview`, which currently fetch only one row via `getRange(2, 1, 1, ...)`, the full `rows` array must be loaded before calling the hook (using `sheet.getDataRange().getValues().slice(1)`), then `processRow` is called only for the first row as before.

Both menu functions must also run the same `requiredHeaders` validation that `_executeBatch` already performs (checking that all entries in `template.requiredHeaders` exist in the sheet headers) before invoking `prepareExtraData`. If headers are missing, show the same error alert and return early. This prevents `safeCell(row, undefined)` calls that would silently misclassify all rows.

**Operator note for `class_start_professor`:** `Enviar Prueba` processes only row 2 of the data sheet. If row 2 is a student row (`es_profesor = 0`), `processRow` returns `null` and the menu shows "No se pudo procesar la primera fila de datos." To test the professor email, temporarily place a professor row (`es_profesor = 1`) at position 2.

## Template: `class_start_students`

**id:** `class_start_students`
**name:** `Inicio de Clases — Estudiantes`
**senderName:** `Programa Idiomas PUCV`
**headerTitle:** `INICIO DE CLASES`
**footerLines:** `['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV']`
**requiredHeaders:** `['nombre', 'correo', 'idioma', 'nivel', 'horario', 'sala', 'nombre_profesor', 'correo_profesor', 'es_profesor']`
**statusColumn:** `Estado Inicio`
**No `prepareExtraData` hook** — standard batch template.

### `processRow`

- If `esProfesor === true` (using the check above): return `null`
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
**senderName:** `Programa Idiomas PUCV`
**headerTitle:** `INICIO DE CLASES`
**footerLines:** `['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV']`
**requiredHeaders:** same as above
**statusColumn:** `Estado Inicio Profesor`
**Has `prepareExtraData` hook.**

### Course key normalization

The composite key used for grouping must normalize all components to avoid silent mismatches from casing or whitespace:

```javascript
function makeCourseKey(idioma, nivel, horario) {
  return [idioma, nivel, horario]
    .map(s => String(s || '').toLowerCase().trim())
    .join('|');
}
```

Both `prepareExtraData` and `processRow` must use this same function.

### `prepareExtraData(rows, headers, extraData)`

Iterates all rows. For rows where `esProfesor === false`, groups the student into a map keyed by `makeCourseKey(idioma, nivel, horario)`. Writes result to `extraData.courseGroups`:

```javascript
extraData.courseGroups = {
  "inglés|a2|l-j 8-9": [
    { nombre: "Ana García", correo: "ana@..." },
    ...
  ],
  ...
}
```

### `processRow`

- If `esProfesor === false`: return `null`
- Otherwise:
  - Build key with `makeCourseKey(idioma, nivel, horario)`
  - Look up `extraData.courseGroups[key]` — default to `[]` if not found
  - If student list is empty: return `null` (skip the professor row; no email is sent)
  - Otherwise return:
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

Estudiantes inscritos (N):
<ul>
  <li>Ana García — ana@correo.cl</li>
  <li>Bob Torres — bob@correo.cl</li>
</ul>

Programa Idiomas PUCV
```

If `students` is empty, `processRow` returns `null` so `buildHtml` is never called with an empty list.

## Out of Scope

- No payment links, buttons, or Drive sharing
- No CC/BCC logic beyond what the operator sets manually in Config
- `report_delivery` special-case `if` block in `_executeBatch` is **not** refactored in this task — that is Phase 3 work

## Files Changed

| File | Change |
|------|--------|
| `src/Main.gs` | Add `prepareExtraData` hook call in `_executeBatch`, `menuSendTest`, and `menuPreview` |
| `src/Templates.gs` | Add `class_start_students` and `class_start_professor` objects + `registerTemplate` calls |
