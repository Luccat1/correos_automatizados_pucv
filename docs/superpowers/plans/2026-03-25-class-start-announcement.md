# Class Start Announcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two email templates (`class_start_students` and `class_start_professor`) and a generic `prepareExtraData` hook so operators can independently notify students and professors when a language course begins.

**Architecture:** A binary `es_profesor` column in the shared data sheet distinguishes row types. The student template is a standard batch template. The professor template uses a new optional `prepareExtraData(rows, headers, extraData)` hook — called once before row iteration in `_executeBatch`, `menuSendTest`, and `menuPreview` — to aggregate student rows into a `courseGroups` map keyed by normalized `idioma|nivel|horario`.

**Tech Stack:** Google Apps Script (GAS), no build step. All `.gs` files share a single global scope. Testing is done via named functions run in the GAS Execution Log — there is no local test runner. Copy changes into the GAS editor and run test functions from the editor.

---

## Files

| File | Change |
|------|--------|
| `src/Main.gs` | Add `prepareExtraData` hook call in `_executeBatch`, `menuSendTest`, and `menuPreview`; add requiredHeaders validation to `menuSendTest` and `menuPreview` |
| `src/Templates.gs` | Add `_makeCourseKey` helper, `classStartStudentsTemplate`, `classStartProfessorTemplate`, two `registerTemplate` calls, and four test functions |

---

## Task 1: Add `prepareExtraData` hook to `_executeBatch`

**Files:**
- Modify: `src/Main.gs`

The hook goes after `const rows = values.slice(1); // Skip header` and before `const processFn = (row, i) => {`.

- [ ] **Step 1: Add the hook call**

Locate the comment `// Skip header` in `_executeBatch`. Immediately after `const rows = values.slice(1);`, add:

```javascript
  // Invoke prepareExtraData hook if defined (for templates needing cross-row aggregation)
  if (typeof template.prepareExtraData === 'function') {
    template.prepareExtraData(rows, headers, extraData);
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/Main.gs
git commit -m "feat: add prepareExtraData hook to _executeBatch"
```

---

## Task 2: Add `prepareExtraData` hook to `menuSendTest` and `menuPreview`

**Files:**
- Modify: `src/Main.gs`

Both functions currently load only one row and have no requiredHeaders validation. The change is the same in both: load all rows, validate headers, call the hook, then fall into the existing `try` block.

- [ ] **Step 1: Update `menuSendTest`**

In `menuSendTest`, find this block (starting at `const headers = mapHeaders(sheet);` and ending with `const rowData = template.processRow(row, headers, 2, extraData);` inside the `try`):

```javascript
  const headers = mapHeaders(sheet);

  // Get first data row (row 2)
  const dataRange = sheet.getRange(2, 1, 1, sheet.getLastColumn());
  const row = dataRange.getValues()[0];

  try {
    const extraData = { configExtras: config.extras };
    const rowData = template.processRow(row, headers, 2, extraData);
```

Replace it entirely with:

```javascript
  const headers = mapHeaders(sheet);

  // Validate required headers (same as _executeBatch)
  const missingTest = (template.requiredHeaders || []).filter(h => headers[h] === undefined);
  if (missingTest.length > 0) {
    showAlert('Cabeceras Faltantes', `Faltan las siguientes columnas requeridas: ${missingTest.join(', ')}`);
    return;
  }

  // Load all rows so prepareExtraData can aggregate cross-row data
  const allValues = sheet.getDataRange().getValues();
  const rows = allValues.slice(1);
  const row = rows[0];

  try {
    const extraData = { configExtras: config.extras };
    if (typeof template.prepareExtraData === 'function') {
      template.prepareExtraData(rows, headers, extraData);
    }
    const rowData = template.processRow(row, headers, 2, extraData);
```

Everything after `const rowData = ...` (the HTML build, sendEmail, showAlert, catch block) remains unchanged.

- [ ] **Step 2: Update `menuPreview`**

In `menuPreview`, find this block (same pattern):

```javascript
  const headers = mapHeaders(sheet);

  const dataRange = sheet.getRange(2, 1, 1, sheet.getLastColumn());
  const row = dataRange.getValues()[0];

  try {
    const extraData = { configExtras: config.extras };
    const rowData = template.processRow(row, headers, 2, extraData);
```

Replace it entirely with:

```javascript
  const headers = mapHeaders(sheet);

  // Validate required headers
  const missingPreview = (template.requiredHeaders || []).filter(h => headers[h] === undefined);
  if (missingPreview.length > 0) {
    showAlert('Cabeceras Faltantes', `Faltan las siguientes columnas requeridas: ${missingPreview.join(', ')}`);
    return;
  }

  // Load all rows so prepareExtraData can aggregate cross-row data
  const allValues = sheet.getDataRange().getValues();
  const rows = allValues.slice(1);
  const row = rows[0];

  try {
    const extraData = { configExtras: config.extras };
    if (typeof template.prepareExtraData === 'function') {
      template.prepareExtraData(rows, headers, extraData);
    }
    const rowData = template.processRow(row, headers, 2, extraData);
```

Everything after `const rowData = ...` remains unchanged.

- [ ] **Step 3: Commit**

```bash
git add src/Main.gs
git commit -m "feat: add prepareExtraData hook and requiredHeaders validation to menuSendTest and menuPreview"
```

---

## Task 3: Add `class_start_students` template with tests

**Files:**
- Modify: `src/Templates.gs` (append before the `registerTemplate` calls at the bottom)

- [ ] **Step 1: Write the test function first (TDD)**

Append this test function to `src/Templates.gs`, before the `registerTemplate` calls:

```javascript
/**
 * Test: classStartStudentsTemplate.processRow
 * Run from the GAS editor and check the Execution Log.
 */
function testClassStartStudentsProcessRow() {
  const headers = {
    nombre: 0, correo: 1, idioma: 2, nivel: 3,
    horario: 4, sala: 5, nombre_profesor: 6, correo_profesor: 7, es_profesor: 8
  };

  // Test 1: student row is processed
  const studentRow = ['Ana García', 'ana@test.com', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0];
  const r1 = classStartStudentsTemplate.processRow(studentRow, headers, 2, {});
  if (r1 === null) throw new Error('FAIL test 1: student row should not return null');
  if (r1.correo !== 'ana@test.com') throw new Error('FAIL test 1: wrong correo — got: ' + r1.correo);
  if (r1.nombreProfesor !== 'Prof. Smith') throw new Error('FAIL test 1: wrong nombreProfesor — got: ' + r1.nombreProfesor);
  Logger.log('PASS test 1: student row processed correctly');

  // Test 2: professor row (number 1) is skipped
  const profRow = ['Prof. Smith', 'smith@pucv.cl', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 1];
  if (classStartStudentsTemplate.processRow(profRow, headers, 3, {}) !== null) {
    throw new Error('FAIL test 2: professor row should return null');
  }
  Logger.log('PASS test 2: professor row (number 1) skipped');

  // Test 3: professor row (string "1") is also skipped — GAS can return strings from Text-formatted cells
  const profRowStr = ['Prof. Smith', 'smith@pucv.cl', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', '1'];
  if (classStartStudentsTemplate.processRow(profRowStr, headers, 4, {}) !== null) {
    throw new Error('FAIL test 3: professor row with string "1" should return null');
  }
  Logger.log('PASS test 3: professor row (string "1") skipped');

  Logger.log('ALL TESTS PASSED: testClassStartStudentsProcessRow');
}
```

- [ ] **Step 2: Copy `src/Templates.gs` to GAS editor, run `testClassStartStudentsProcessRow`**

Expected: error "classStartStudentsTemplate is not defined" — confirms test runs before implementation.

- [ ] **Step 3: Implement `classStartStudentsTemplate`**

Append to `src/Templates.gs` before the test function:

```javascript
/**
 * Class Start Announcement — Students
 * Sends individual emails to each student confirming course details and professor contact.
 */
const classStartStudentsTemplate = {
  id: 'class_start_students',
  name: 'Inicio de Clases — Estudiantes',
  description: 'Confirma a cada estudiante el inicio de su curso con sala y datos del profesor.',
  requiredHeaders: ['nombre', 'correo', 'idioma', 'nivel', 'horario', 'sala', 'nombre_profesor', 'correo_profesor', 'es_profesor'],
  statusColumn: 'Estado Inicio',
  senderName: 'Programa Idiomas PUCV',
  headerTitle: 'INICIO DE CLASES',
  footerLines: ['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV'],

  processRow: function(row, headers, rowIndex, extraData) {
    const esProfesor = String(safeCell(row, headers['es_profesor']) || '0').trim() === '1';
    if (esProfesor) return null;

    const nombre          = requiredCell(row, headers['nombre'],          'Nombre',          rowIndex);
    const correo          = requiredCell(row, headers['correo'],          'Correo',          rowIndex);
    const idioma          = requiredCell(row, headers['idioma'],          'Idioma',          rowIndex);
    const nivel           = requiredCell(row, headers['nivel'],           'Nivel',           rowIndex);
    const horario         = requiredCell(row, headers['horario'],         'Horario',         rowIndex);
    const sala            = requiredCell(row, headers['sala'],            'Sala',            rowIndex);
    const nombreProfesor  = requiredCell(row, headers['nombre_profesor'], 'Nombre Profesor', rowIndex);
    const correoProfesor  = requiredCell(row, headers['correo_profesor'], 'Correo Profesor', rowIndex);

    return {
      nombre, correo, idioma, nivel, horario, sala,
      nombreProfesor, correoProfesor,
      firstName: extractFirstName(nombre, 'estudiante')
    };
  },

  buildHtml: function(data) {
    const greeting = `Estimado/a <strong>${data.firstName}</strong>:`;
    let content = `<p>${greeting}</p>`;
    content += `<p>Te informamos que tu curso ya tiene fecha de inicio confirmada:</p>`;

    const courseInfo = [
      `<strong>Idioma:</strong> ${data.idioma}`,
      `<strong>Nivel:</strong> ${data.nivel}`,
      `<strong>Horario:</strong> ${data.horario}`,
      `<strong>Sala:</strong> ${data.sala}`,
      `<strong>Profesor/a:</strong> ${data.nombreProfesor}`,
      `<strong>Contacto:</strong> <a href="mailto:${data.correoProfesor}" style="color:${COLORS.primary};">${data.correoProfesor}</a>`
    ].join('<br>');
    content += buildInfoBox(courseInfo);

    content += `<p>Si tienes alguna consulta antes del inicio, puedes escribirle directamente a tu profesor/a.</p>`;
    content += `<p>¡Te esperamos!</p>`;

    return content;
  }
};
```

- [ ] **Step 4: Add `registerTemplate` call**

At the bottom of `src/Templates.gs`, after `registerTemplate(surveyTemplate);`, add:

```javascript
registerTemplate(classStartStudentsTemplate);
```

- [ ] **Step 5: Copy updated `src/Templates.gs` to GAS editor, run `testClassStartStudentsProcessRow`**

Expected Execution Log:
```
PASS test 1: student row processed correctly
PASS test 2: professor row (number 1) skipped
PASS test 3: professor row (string "1") skipped
ALL TESTS PASSED: testClassStartStudentsProcessRow
```

- [ ] **Step 6: Commit**

```bash
git add src/Templates.gs
git commit -m "feat: add class_start_students template"
```

---

## Task 4: Add `class_start_professor` template with tests

**Files:**
- Modify: `src/Templates.gs`

- [ ] **Step 1: Write test functions first (TDD)**

Append after `testClassStartStudentsProcessRow`:

```javascript
/**
 * Tests for _makeCourseKey normalization.
 */
function testMakeCourseKey() {
  const k1 = _makeCourseKey('Inglés', 'A2', 'L-J 8-9');
  const k2 = _makeCourseKey(' Inglés ', ' A2 ', ' L-J 8-9 ');
  const k3 = _makeCourseKey('INGLÉS', 'a2', 'l-j 8-9');
  if (k1 !== k2) throw new Error('FAIL: spaces not normalized — k1: ' + k1 + ' k2: ' + k2);
  if (k1 !== k3) throw new Error('FAIL: case not normalized — k1: ' + k1 + ' k3: ' + k3);
  Logger.log('PASS: _makeCourseKey normalizes correctly — key: ' + k1);
  Logger.log('ALL TESTS PASSED: testMakeCourseKey');
}

/**
 * Tests for classStartProfessorTemplate.prepareExtraData and processRow.
 */
function testClassStartProfessorTemplate() {
  const headers = {
    nombre: 0, correo: 1, idioma: 2, nivel: 3,
    horario: 4, sala: 5, nombre_profesor: 6, correo_profesor: 7, es_profesor: 8
  };

  const rows = [
    ['Ana García',   'ana@test.com',   'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0],
    ['Bob Torres',   'bob@test.com',   'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0],
    ['Prof. Smith',  'smith@pucv.cl',  'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 1],
    ['Carmen López', 'carmen@test.com','Alemán',  'B1', 'V 10-12', 'F202', 'Prof. Braun', 'braun@pucv.cl', 0],
    ['Prof. Braun',  'braun@pucv.cl',  'Alemán',  'B1', 'V 10-12', 'F202', 'Prof. Braun', 'braun@pucv.cl', 1],
  ];

  const extraData = { configExtras: {} };
  classStartProfessorTemplate.prepareExtraData(rows, headers, extraData);

  // Test 1: courseGroups has two entries (one per course)
  const groups = extraData.courseGroups;
  const keys = Object.keys(groups);
  if (keys.length !== 2) throw new Error('FAIL test 1: expected 2 course groups, got ' + keys.length);
  Logger.log('PASS test 1: two course groups built');

  // Test 2: Inglés/A2 group has 2 students
  const englishKey = _makeCourseKey('Inglés', 'A2', 'L-J 8-9');
  if (!groups[englishKey]) throw new Error('FAIL test 2: missing key ' + englishKey);
  if (groups[englishKey].length !== 2) throw new Error('FAIL test 2: expected 2 students, got ' + groups[englishKey].length);
  Logger.log('PASS test 2: Inglés A2 group has 2 students');

  // Test 3: student rows return null for the professor template
  if (classStartProfessorTemplate.processRow(rows[0], headers, 2, extraData) !== null) {
    throw new Error('FAIL test 3: student row should return null');
  }
  Logger.log('PASS test 3: student row skipped by professor template');

  // Test 4: professor row returns data with correct student list
  const profData = classStartProfessorTemplate.processRow(rows[2], headers, 4, extraData);
  if (profData === null) throw new Error('FAIL test 4: professor row should return data');
  if (profData.students.length !== 2) throw new Error('FAIL test 4: expected 2 students, got ' + profData.students.length);
  if (profData.idioma !== 'Inglés') throw new Error('FAIL test 4: wrong idioma — got: ' + profData.idioma);
  Logger.log('PASS test 4: professor row returns data with 2-student list');

  // Test 5: professor whose course key does not match any student rows returns null.
  // Setup: two students for Inglés/A2, one professor for a completely different course.
  // This proves the lookup is isolated by course key, not just the empty-map case.
  const rowsIsolated = [
    ['Ana García', 'ana@test.com', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0],
    ['Bob Torres', 'bob@test.com', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0],
    ['Prof. Solo',  'solo@pucv.cl', 'Japonés', 'N1', 'S 9-11', 'G303', 'Prof. Solo',  'solo@pucv.cl',  1],
  ];
  const extraDataIsolated = { configExtras: {} };
  classStartProfessorTemplate.prepareExtraData(rowsIsolated, headers, extraDataIsolated);
  const soloResult = classStartProfessorTemplate.processRow(rowsIsolated[2], headers, 4, extraDataIsolated);
  if (soloResult !== null) throw new Error('FAIL test 5: professor with no matching students should return null');
  Logger.log('PASS test 5: professor with no matching students returns null (key isolation verified)');

  Logger.log('ALL TESTS PASSED: testClassStartProfessorTemplate');
}
```

- [ ] **Step 2: Copy to GAS editor, run `testMakeCourseKey` and `testClassStartProfessorTemplate`**

Expected: error "_makeCourseKey is not defined" — confirms tests run before implementation.

- [ ] **Step 3: Implement `_makeCourseKey` and `classStartProfessorTemplate`**

Append to `src/Templates.gs` before the test functions:

```javascript
/**
 * Builds a normalized composite key for course grouping.
 * Lowercases and trims each component to prevent silent mismatches.
 * @param {string} idioma
 * @param {string} nivel
 * @param {string} horario
 * @returns {string}
 */
function _makeCourseKey(idioma, nivel, horario) {
  return [idioma, nivel, horario]
    .map(function(s) { return String(s || '').toLowerCase().trim(); })
    .join('|');
}

/**
 * Class Start Announcement — Professor
 * Sends one email per professor per course combination with the enrolled student list.
 */
const classStartProfessorTemplate = {
  id: 'class_start_professor',
  name: 'Inicio de Clases — Profesores',
  description: 'Notifica a cada profesor el inicio de su curso con la nómina de estudiantes inscritos.',
  requiredHeaders: ['nombre', 'correo', 'idioma', 'nivel', 'horario', 'sala', 'nombre_profesor', 'correo_profesor', 'es_profesor'],
  statusColumn: 'Estado Inicio Profesor',
  senderName: 'Programa Idiomas PUCV',
  headerTitle: 'INICIO DE CLASES',
  footerLines: ['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV'],

  /**
   * Pre-aggregates student rows into extraData.courseGroups keyed by idioma|nivel|horario.
   * Called once before row iteration by _executeBatch, menuSendTest, and menuPreview.
   * @param {Array.<Array>} rows - All data rows (header already removed).
   * @param {Object} headers - mapHeaders result.
   * @param {Object} extraData - Mutated in-place.
   */
  prepareExtraData: function(rows, headers, extraData) {
    const groups = {};
    rows.forEach(function(row) {
      const esProfesor = String(safeCell(row, headers['es_profesor']) || '0').trim() === '1';
      if (esProfesor) return;

      const idioma  = safeCell(row, headers['idioma'])  || '';
      const nivel   = safeCell(row, headers['nivel'])   || '';
      const horario = safeCell(row, headers['horario']) || '';
      const key = _makeCourseKey(idioma, nivel, horario);

      if (!groups[key]) groups[key] = [];
      groups[key].push({
        nombre: safeCell(row, headers['nombre']) || '',
        correo: safeCell(row, headers['correo']) || ''
      });
    });
    extraData.courseGroups = groups;
  },

  processRow: function(row, headers, rowIndex, extraData) {
    const esProfesor = String(safeCell(row, headers['es_profesor']) || '0').trim() === '1';
    if (!esProfesor) return null;

    const nombre  = requiredCell(row, headers['nombre'],  'Nombre',  rowIndex);
    const correo  = requiredCell(row, headers['correo'],  'Correo',  rowIndex);
    const idioma  = requiredCell(row, headers['idioma'],  'Idioma',  rowIndex);
    const nivel   = requiredCell(row, headers['nivel'],   'Nivel',   rowIndex);
    const horario = requiredCell(row, headers['horario'], 'Horario', rowIndex);
    const sala    = requiredCell(row, headers['sala'],    'Sala',    rowIndex);

    const key = _makeCourseKey(idioma, nivel, horario);
    const students = (extraData.courseGroups && extraData.courseGroups[key]) || [];

    if (students.length === 0) return null; // No matching students — skip this professor row

    return {
      nombre, correo, idioma, nivel, horario, sala,
      firstName: extractFirstName(nombre, 'profesor'),
      students: students
    };
  },

  buildHtml: function(data) {
    let content = `<p>Estimado/a Prof. <strong>${data.firstName}</strong>:</p>`;
    content += `<p>A continuación encontrará la información de su curso y la nómina de estudiantes inscritos:</p>`;

    const courseInfo = [
      `<strong>Idioma:</strong> ${data.idioma}`,
      `<strong>Nivel:</strong> ${data.nivel}`,
      `<strong>Horario:</strong> ${data.horario}`,
      `<strong>Sala:</strong> ${data.sala}`
    ].join('<br>');
    content += buildInfoBox(courseInfo);

    const count = data.students.length;
    content += `<p><strong>Estudiantes inscritos (${count}):</strong></p>`;
    const listItems = data.students
      .map(function(s) {
        return `<li style="margin-bottom:4px;">${s.nombre} — <a href="mailto:${s.correo}" style="color:${COLORS.primary};">${s.correo}</a></li>`;
      })
      .join('');
    content += `<ul style="padding-left:20px; margin:0 0 16px;">${listItems}</ul>`;

    content += `<p>Cualquier consulta sobre la gestión del curso puede responder directamente a este correo.</p>`;

    return content;
  }
};
```

- [ ] **Step 4: Add `registerTemplate` call**

After `registerTemplate(classStartStudentsTemplate);` add:

```javascript
registerTemplate(classStartProfessorTemplate);
```

- [ ] **Step 5: Copy updated `src/Templates.gs` to GAS editor, run both test functions**

Expected for `testMakeCourseKey`:
```
PASS: _makeCourseKey normalizes correctly — key: inglés|a2|l-j 8-9
ALL TESTS PASSED: testMakeCourseKey
```

Expected for `testClassStartProfessorTemplate`:
```
PASS test 1: two course groups built
PASS test 2: Inglés A2 group has 2 students
PASS test 3: student row skipped by professor template
PASS test 4: professor row returns data with 2-student list
PASS test 5: professor with no matching students returns null (key isolation verified)
ALL TESTS PASSED: testClassStartProfessorTemplate
```

- [ ] **Step 6: Commit**

```bash
git add src/Templates.gs
git commit -m "feat: add class_start_professor template with prepareExtraData hook"
```

---

## Task 5: Smoke test end-to-end

No code changes — verifies the full flow using the spreadsheet menus.

- [ ] **Step 1: Run setup wizard for `class_start_students`**

In the spreadsheet: `📧 Correos PUCV > Seleccionar Plantilla`, choose "Inicio de Clases — Estudiantes". Verify:
- Config sheet has `template_id = class_start_students` and `data_sheet = Datos_class_start_students`
- Data sheet `Datos_class_start_students` was created with all required column headers including `Estado Inicio`

- [ ] **Step 2: Run setup wizard for `class_start_professor`**

Repeat for "Inicio de Clases — Profesores". Then update `data_sheet` in the **professor's Config sheet** to `Datos_class_start_students` (the shared sheet). Verify `Estado Inicio Profesor` column was added to the shared sheet.

- [ ] **Step 3: Populate data sheet with test data**

Add two student rows and one professor row. Use your own email so test emails arrive in your inbox:

| nombre | correo | idioma | nivel | horario | sala | nombre_profesor | correo_profesor | es_profesor |
|--------|--------|--------|-------|---------|------|-----------------|-----------------|-------------|
| Estudiante Uno | your-email@... | Inglés | A2 | L-J 8-9 | E101 | Prof. Test | your-email@... | 0 |
| Estudiante Dos | your-email@... | Inglés | A2 | L-J 8-9 | E101 | Prof. Test | your-email@... | 0 |
| Prof. Test | your-email@... | Inglés | A2 | L-J 8-9 | E101 | Prof. Test | your-email@... | 1 |

- [ ] **Step 4: Test student template — Vista Previa**

Switch Config `template_id` to `class_start_students`. Run `📧 Correos PUCV > Vista Previa`. Verify preview shows: student greeting, course infobox with idioma/nivel/horario/sala/profesor/contacto.

- [ ] **Step 5: Test professor template — Vista Previa**

Switch Config `template_id` to `class_start_professor`. **Move the professor row to position 2 of the sheet** (first data row) so `menuPreview` processes it. Run `Vista Previa`. Verify preview shows: professor greeting, course infobox, student list with two entries.

- [ ] **Step 6: Send test emails and verify status columns**

Run `🧪 Enviar Prueba` for each template. Verify:
- Both emails arrive in your inbox with correct content
- After running the full batch send (`📧 Enviar Correos`), check that `Estado Inicio` is populated with "Enviado" for the two student rows and `Estado Inicio Profesor` is populated for the professor row

- [ ] **Step 7: Commit**

```bash
git commit --allow-empty -m "chore: smoke test class start announcement templates — verified"
```
