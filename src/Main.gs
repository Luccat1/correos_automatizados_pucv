/**
 * Main.gs
 * Entry point and UI integration for the Unified Email System PUCV.
 */

/**
 * Creates the custom menu when the spreadsheet opens.
 * Wired to functions in this file.
 */
function onOpen() {
  const menuItems = [
    { label: '📊 Ver Dashboard', functionName: 'showDashboard' },
    null, // separator
    { label: '⚙️ Configurar Plantilla', functionName: 'menuSetupTemplate' },
    null, // separator
    { label: '📤 Gestionar Envío', functionName: 'menuSendEmails' },
    null, // separator
    {
      label: '🔍 Herramientas',
      children: [
        { label: '👁 Vista Previa', functionName: 'menuPreview' },
        { label: 'ℹ️ Ver Configuración', functionName: 'menuShowConfig' }
      ]
    }
  ];

  buildMenu(menuItems);
}

/**
 * Reads configuration from the "Config" sheet.
 * @returns {Object|null}
 * @private
 */
function _getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheets().find(s => s.getName().toLowerCase() === 'config');

  if (!configSheet) {
     showAlert('Configuración Faltante', 'No se encontró la hoja "Config". Por favor, créala para definir qué plantilla usar.');
     return null;
  }

  const data = configSheet.getDataRange().getValues();
  const config = { extras: {} };

  data.forEach(row => {
    const key = String(row[0] || '').toLowerCase().trim();
    const value = row[1];

    if (!key) return;

    switch (key) {
      case 'template_id': config.templateId = String(value).trim(); break;
      case 'data_sheet': config.dataSheet = String(value).trim(); break;
      case 'sender_name': config.senderName = value; break;
      case 'sender_alias': config.senderAlias = value; break;
      case 'cc': config.cc = value; break;
      case 'bcc': config.bcc = value; break;
      default: config.extras[key] = value instanceof Date ? formatDateEs(value) : value;
    }
  });

  if (!config.templateId) {
    showAlert('Configuración Incompleta', 'La hoja "Config" debe tener un "template_id".');
    return null;
  }

  return config;
}

/**
 * Resolves the selected template from the registry.
 * @returns {Object|null} { template, config }
 * @private
 */
function _getSelectedTemplate() {
  const config = _getConfig();
  if (!config) return null;

  const template = getTemplate(config.templateId);

  if (!template) {
    const available = listTemplates().map(t => `- ${t.id} (${t.name})`).join('\n');
    showAlert('Plantilla No Encontrada', `ID "${config.templateId}" no es válido.\n\nDisponibles:\n${available}`);
    return null;
  }

  return { template, config };
}

// --- Menu Handlers ---

/**
 * Shows a preview of the email in a modal dialog.
 */
function menuPreview() {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  const sheet = _getDataSheet(config.dataSheet);
  if (!sheet) return;

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

  if (!row) {
    showAlert('Sin Datos', 'La hoja de datos está vacía.');
    return;
  }

  try {
    const extraData = { configExtras: { ...config.extras } };
    if (typeof template.prepareExtraData === 'function') {
      template.prepareExtraData(rows, headers, extraData);
    }
    // Scan for the first row the template accepts (some templates skip certain row types)
    let rowData = null;
    for (let idx = 0; idx < rows.length; idx++) {
      rowData = template.processRow(rows[idx], headers, idx + 2, extraData);
      if (rowData) break;
    }
    if (!rowData) {
      showAlert('Sin Vista Previa', 'No se encontró ninguna fila procesable (todas las filas fueron saltadas por la plantilla).');
      return;
    }

    const innerHtml = template.buildHtml(rowData);
    const isObject = typeof innerHtml === 'object';
    const body = isObject ? innerHtml.content : innerHtml;
    const alertBand = isObject ? innerHtml.alertBand : null;

    const fullHtml = buildEmailLayout({
      content: body,
      headerTitle: template.headerTitle,
      footerLines: template.footerLines,
      alertBand: alertBand
    });

    const rowCount = sheet.getLastRow() - 1;
    const previewHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f1f5f9; 
            color: #1e293b;
          }
          .preview-header { 
            background: linear-gradient(135deg, #001f3f 0%, #24588d 50%, #1d71b8 100%); 
            color: white; 
            padding: 16px 24px; 
            position: sticky; 
            top: 0; 
            z-index: 100;
            box-shadow: 0 4px 14px rgba(0,31,63,0.15);
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .preview-header h3 { 
            margin: 0 0 2px 0; 
            font-size: 16px; 
            font-weight: 700;
            color: #ffffff;
          }
          .preview-header p { 
            margin: 0; 
            font-size: 11px; 
            opacity: 0.85; 
            font-weight: 500;
          }
          .preview-badge {
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.25);
            backdrop-filter: blur(4px);
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: #ffffff;
          }
          .preview-container { 
            padding: 24px 20px; 
            display: flex; 
            justify-content: center; 
          }
          .email-wrapper { 
            background: white; 
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.05); 
            width: 100%; 
            max-width: 620px; 
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          .preview-footer {
            padding: 14px 24px;
            text-align: right;
            background: white;
            border-top: 1px solid #e2e8f0;
            position: sticky;
            bottom: 0;
            display: flex;
            justify-content: flex-end;
          }
          .btn-close {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
            padding: 9px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.2s ease;
          }
          .btn-close:hover {
            background: #e2e8f0;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <div class="preview-header">
          <div>
            <h3>👁 Vista Previa: ${template.name}</h3>
            <p><strong>Asunto:</strong> ${template.headerTitle}</p>
          </div>
          <span class="preview-badge">~${rowCount} destinatarios</span>
        </div>
        <div class="preview-container">
          <div class="email-wrapper">
            ${fullHtml}
          </div>
        </div>
        <div class="preview-footer">
          <button class="btn-close" onclick="google.script.host.close()">Cerrar Vista Previa</button>
        </div>
      </body>
      </html>
    `;

    const htmlOutput = HtmlService.createHtmlOutput(previewHtml)
        .setWidth(750)
        .setHeight(650)
        .setTitle(`Vista Previa: ${template.name}`);
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, ' ');
  } catch (e) {
    showAlert('Error en Vista Previa', e.message);
  }
}

/**
 * Opens the send management dialog (mode is selected inside the dialog).
 */
function menuSendEmails() {
  _showSendDialog('send');
}

/** Called from Dashboard quick-action to open dialog pre-selected in test mode. */
function menuSendTest() {
  _showSendDialog('test');
}

/**
 * Shared execution logic for sending and drafting.
 * @param {boolean} asDraft
 * @param {Object} [overrides] - Optional overrides from the GUI.
 * Templates may optionally define prepareExtraData(rows, headers, extraData) to
 * aggregate cross-row data before per-row processing begins.
 * @private
 */
function _executeBatch(asDraft, overrides) {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  const sheet = _getDataSheet(config.dataSheet);
  if (!sheet) return;

  const headers = mapHeaders(sheet);

  // Validate required headers
  const missing = template.requiredHeaders.filter(h => headers[h] === undefined);
  if (missing.length > 0) {
    showAlert('Cabeceras Faltantes', `Faltan las siguientes columnas requeridas: ${missing.join(', ')}`);
    return;
  }

  // Confirmation (skip if coming from Dialog as it's already confirmed there)
  if (!overrides) {
    const actionName = asDraft ? 'crear borradores' : 'enviar correos masivos';
    if (!confirmAction('Confirmar Acción', `¿Está seguro que desea ${actionName} usando la plantilla "${template.name}"?`)) {
      return;
    }
  }

  // Pre-load extra data for templates that need it
  const extraData = { configExtras: { ...config.extras } };
  
  // Apply overrides if provided
  if (overrides) {
    if (overrides.extraNote !== undefined) extraData.configExtras.extra_note = overrides.extraNote;
  }

  // Legacy: report_delivery pre-dates the prepareExtraData hook.
  // Future templates should implement prepareExtraData instead.
  if (template.id === 'report_delivery') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dirSheet = ss.getSheets().find(s => s.getName().toLowerCase() === 'directorio');
    if (dirSheet) {
      extraData.directoryRows = dirSheet.getDataRange().getValues();
      extraData.dirHeaders = mapHeaders(dirSheet);
    }
  }

  const statusCol = ensureColumn(sheet, headers, template.statusColumn || 'Estado_Envio');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const rows = values.slice(1); // Skip header

  // Invoke prepareExtraData hook if defined (for templates needing cross-row aggregation)
  if (typeof template.prepareExtraData === 'function') {
    template.prepareExtraData(rows, headers, extraData);
  }

  // Track rows with terminal status so we can preserve them after the batch.
  // sendBatch writes "SALTADO" for any null return from processFn, which would
  // overwrite existing "ENVIADO" statuses and cause duplicate sends on future runs.
  const terminalRowIndices = new Set();

  const processFn = (row, i) => {
    const rowIndex = i + 2;
    const currentStatus = String(row[statusCol - 1] || '').toLowerCase();

    // Terminal states: never re-process these rows.
    // - enviado / borrador: already dispatched
    // - saltado: template explicitly skipped (missing data, etc.) — clear manually to retry
    // ERROR and empty statuses are re-processable so users can fix data and retry.
    if (currentStatus.includes('enviado') || currentStatus.includes('borrador') || currentStatus.includes('saltado')) {
      terminalRowIndices.add(i);
      return null;
    }

    try {
      const data = template.processRow(row, headers, rowIndex, extraData);
      if (!data) return null;

      const innerHtml = template.buildHtml(data);
      const isObject = typeof innerHtml === 'object';
      const body = isObject ? innerHtml.content : innerHtml;
      const extraNote = (overrides && overrides.extraNote) || (isObject ? innerHtml.extraNote : null);

      const fullHtml = buildEmailLayout({
        content: body,
        headerTitle: (overrides && overrides.subject) || template.headerTitle,
        footerLines: template.footerLines,
        alertBand: isObject ? innerHtml.alertBand : null,
        extraNote: extraNote
      });

      // Recipient selection
      const recipient = data.to || data.correo;
      
      // CC/BCC calculation: Overrides > Template Data > Config
      const cc = (overrides && overrides.cc) || data.cc || config.cc;
      const bcc = (overrides && overrides.bcc) || data.bcc || config.bcc;

      return {
        to: recipient,
        subject: (overrides && overrides.subject) || template.headerTitle,
        htmlBody: fullHtml,
        cc: cc,
        bcc: bcc,
        attachments: data.attachments || []
      };
    } catch (e) {
      console.error(`Error en fila ${rowIndex}: ${e.message}`);
      return `ERROR: ${e.message}`;
    }
  };

  const options = {
    senderName: config.senderName || template.senderName,
    senderAlias: config.senderAlias || template.senderAlias,
    asDraft: asDraft,
    batchLimit: (overrides && overrides.batchLimit) ? parseInt(overrides.batchLimit) : null,
    sleepEvery: 20,
    sleepMs: 1000
  };

  // Toast progress notifications (LOG-02)
  options.onProgress = function(current, total, sent, errs) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Procesando fila ' + current + ' de ' + total + ' (' + sent + ' enviados, ' + errs + ' errores)',
      'Progreso de envio',
      -1
    );
  };

  const results = sendBatch(rows, processFn, options);

  // Restore original statuses for terminal rows so we never overwrite
  // "ENVIADO (fecha)" or "SALTADO" with a new "SALTADO" entry.
  const finalStatuses = results.statuses.map(function(status, i) {
    if (terminalRowIndices.has(i)) {
      return [String(rows[i][statusCol - 1] || '')];
    }
    return status;
  });

  // Update statuses
  batchUpdateColumn(sheet, 2, statusCol, finalStatuses);

  // Append to persistent Log sheet (LOG-01)
  _appendLogEntry({
    timestamp: now(),
    templateId: template.id,
    templateName: template.name,
    operator: Session.getActiveUser().getEmail(),
    totalRows: rows.length,
    sent: results.processed,
    errors: results.errors,
    asDraft: asDraft,
    subject: (overrides && overrides.subject) || template.headerTitle
  });

  showResult(results.processed, results.errors);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Proceso finalizado: ' + results.processed + ' enviados, ' + results.errors + ' errores.',
    'Envio completado',
    5
  );
}

/**
 * Shows the current active configuration.
 */
function menuShowConfig() {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  const extras = Object.entries(config.extras).map(([k, v]) => `- ${k}: ${v}`).join('\n');
  
  let msg = `Plantilla: ${template.name} (${template.id})\n`;
  msg += `Estado Col: ${template.statusColumn}\n\n`;
  msg += `Remitente: ${config.senderName || template.senderName || 'Default'}\n`;
  if (config.senderAlias) msg += `Alias: ${config.senderAlias}\n`;
  if (config.cc) msg += `CC: ${config.cc}\n`;
  if (config.bcc) msg += `BCC: ${config.bcc}\n`;
  
  if (extras) {
    msg += `\nConfiguración Adicional:\n${extras}\n`;
  }
  
  msg += `\nCabeceras Requeridas:\n- ${template.requiredHeaders.join('\n- ')}`;

  showAlert('Configuración Actual', msg);
}

/**
 * Displays a visual template selector dialog.
 */
function menuSetupTemplate() {
  const templates = listTemplates();
  const html = HtmlService.createTemplateFromFile('TemplateSelector');
  html.templates = templates;

  const ui = html.evaluate()
      .setWidth(500)
      .setHeight(550)
      .setTitle('Configurar Nueva Plantilla');

  SpreadsheetApp.getUi().showModalDialog(ui, ' ');
}

/**
 * Server-side callback to run sheet generation from dialog.
 * @param {string} templateId
 */
function setupTemplateFromDialog(templateId) {
  _generateSheets(templateId);
}

/**
 * Generates "Config" and data sheets for a template.
 * @param {string} templateId
 * @private
 */
function _generateSheets(templateId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const template = getTemplate(templateId);
  
  // 1. Config Sheet
  let configSheet = ss.getSheetByName('Config');
  if (!configSheet) {
    configSheet = ss.insertSheet('Config');
  } else {
    if (!confirmAction('Hoja Existente', 'La hoja "Config" ya existe. ¿Desea sobreescribirla?')) {
      return;
    }
    configSheet.clear();
  }

  const dataSheetName = `Datos_${templateId}`;

  const configRows = [
    ['Variable', 'Valor', 'Descripción'],
    ['template_id', template.id, 'ID de la plantilla a usar'],
    ['data_sheet', dataSheetName, 'Nombre de la hoja que contiene los datos'],
    ['sender_name', template.senderName || '', 'Nombre que aparecerá como remitente'],
    ['sender_alias', template.senderAlias || '', 'Email alias (debe estar configurado en Gmail)'],
    ['cc', '', 'Correos en CC (separados por coma)'],
    ['bcc', '', 'Correos en BCC (separados por coma)']
  ];

  if (template.configKeys) {
    template.configKeys.forEach(key => {
      configRows.push([key, '', `Configuración específica: ${key}`]);
    });
  }

  configSheet.getRange(1, 1, configRows.length, 3).setValues(configRows);
  configSheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f3f3f3');
  configSheet.setFrozenRows(1);
  configSheet.autoResizeColumns(1, 3);

  // 2. Data Sheet
  let dataSheet = ss.getSheetByName(dataSheetName);
  if (!dataSheet) {
    dataSheet = ss.insertSheet(dataSheetName);
  } else {
    const confirm = confirmAction('Hoja Existente', `La hoja "${dataSheetName}" ya existe. ¿Desea añadir las cabeceras requeridas?`);
    if (!confirm) return;
  }

  const headers = [...template.requiredHeaders];
  if (template.statusColumn) {
     if (!headers.includes(template.statusColumn)) headers.push(template.statusColumn);
  } else if (!headers.includes('Estado_Envio')) {
    headers.push('Estado_Envio');
  }
  
  // Merge with existing headers if any
  const lastCol = dataSheet.getLastColumn();
  const existingHeaders = lastCol > 0 ? dataSheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  const finalHeaders = [...existingHeaders];
  headers.forEach(h => {
    if (!finalHeaders.includes(h)) finalHeaders.push(h);
  });

  dataSheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
  dataSheet.getRange(1, 1, 1, finalHeaders.length).setFontWeight('bold').setBackground('#d9ead3');
  dataSheet.setFrozenRows(1);
  dataSheet.autoResizeColumns(1, finalHeaders.length);

  showAlert('Configuración Completada', `Se han preparado las hojas para la plantilla "${template.name}".\n\n1. Complete los valores en "Config".\n2. Llene los datos en "${dataSheetName}".`);
}

/**
 * Returns the sheet intended for data, or null with alert if missing.
 * @param {string} name
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null}
 * @private
 */
function _getDataSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = name || 'Datos';
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    const sheets = ss.getSheets().map(s => `"${s.getName()}"`).join(', ');
    showAlert('Hoja no encontrada', 
      `No se encontró la hoja de datos "${sheetName}".\n\n` +
      `Verifique el nombre en la hoja "Config".\n` +
      `Hojas disponibles en este documento: ${sheets}`
    );
    return null;
  }

  return sheet;
}

/**
 * Validates configuration before showing the send dialog.
 * Returns an array of error strings (empty = valid).
 * @param {Object} config - From _getConfig()
 * @param {Object} template - From getTemplate()
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Data sheet
 * @returns {Array.<string>}
 * @private
 */
function _validateConfig(config, template, sheet) {
  var errors = [];

  // Check data sheet has required headers
  var headers = mapHeaders(sheet);
  var missing = (template.requiredHeaders || []).filter(function(h) {
    return headers[h] === undefined;
  });
  if (missing.length > 0) {
    errors.push('Columnas faltantes en hoja de datos: ' + missing.join(', '));
  }

  // Check for empty data
  var rowCount = sheet.getLastRow() - 1;
  if (rowCount <= 0) {
    errors.push('La hoja de datos "' + sheet.getName() + '" esta vacia.');
  }

  // Check sender alias is valid if specified
  if (config.senderAlias) {
    try {
      var aliases = GmailApp.getAliases();
      if (aliases.indexOf(config.senderAlias) === -1) {
        errors.push('El alias "' + config.senderAlias + '" no esta configurado en Gmail. Alias disponibles: ' + (aliases.length > 0 ? aliases.join(', ') : 'ninguno'));
      }
    } catch (e) {
      // Non-fatal: alias check failed, skip validation
    }
  }

  return errors;
}

/**
 * Appends a batch summary row to the persistent "Log" sheet.
 * Creates the sheet and header row if it does not exist.
 * @param {Object} logData
 * @param {string} logData.timestamp
 * @param {string} logData.templateId
 * @param {string} logData.templateName
 * @param {string} logData.operator
 * @param {number} logData.totalRows
 * @param {number} logData.sent
 * @param {number} logData.errors
 * @param {boolean} logData.asDraft
 * @param {string} logData.subject
 * @private
 */
function _appendLogEntry(logData) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName('Log');
  if (!logSheet) {
    logSheet = ss.insertSheet('Log');
    logSheet.getRange(1, 1, 1, 9).setValues([[
      'Timestamp', 'Template ID', 'Template', 'Operador',
      'Total Filas', 'Enviados', 'Errores', 'Borrador', 'Asunto'
    ]]);
    logSheet.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f3f3f3');
    logSheet.setFrozenRows(1);
  }
  logSheet.appendRow([
    logData.timestamp, logData.templateId, logData.templateName,
    logData.operator, logData.totalRows, logData.sent,
    logData.errors, logData.asDraft, logData.subject
  ]);
}

/**
 * Shows the pre-send customization dialog with selectable execution modes.
 * @param {string} [initialMode='send'] - 'send', 'draft', or 'test'.
 * @private
 */
function _showSendDialog(initialMode) {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  const sheet = _getDataSheet(config.dataSheet);
  if (!sheet) return;

  // Consolidated pre-flight validation (UX-01)
  const validationErrors = _validateConfig(config, template, sheet);
  if (validationErrors.length > 0) {
    showAlert('Errores de Configuracion',
      'Se encontraron los siguientes problemas:\n\n' +
      validationErrors.map(function(e, i) { return (i + 1) + '. ' + e; }).join('\n') +
      '\n\nCorrija estos problemas antes de continuar.'
    );
    return;
  }

  const rowCount = sheet.getLastRow() - 1;

  const html = HtmlService.createTemplateFromFile('SendDialog');
  html.templateName = template.name;
  html.subject = template.headerTitle;
  html.extraNote = config.extras.extra_note || '';
  html.cc = config.cc || '';
  html.bcc = config.bcc || '';
  html.rowCount = rowCount;
  html.dataSheetName = sheet.getName();
  html.initialMode = initialMode || 'send';
  html.senderAlias = config.senderAlias || template.senderAlias || '';

  const ui = html.evaluate()
      .setWidth(540)
      .setHeight(640)
      .setTitle('Gestión de Envío de Correos');

  SpreadsheetApp.getUi().showModalDialog(ui, ' ');
}

/**
 * Server-side callback from SendDialog.html.
 * Handles test sends, draft creation, and real batch sends.
 * @param {Object} formData
 */
function executeBatchFromDialog(formData) {
  if (formData.mode === 'test') {
    _executeTestSend(formData);
  } else {
    const asDraft = (formData.mode === 'draft');
    _executeBatch(asDraft, formData);
  }
}

/**
 * Executes a single test email send from the dialog with custom subject, note, and recipient.
 * @param {Object} formData
 * @private
 */
function _executeTestSend(formData) {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  const sheet = _getDataSheet(config.dataSheet);
  if (!sheet) return;

  const headers = mapHeaders(sheet);
  const missingTest = (template.requiredHeaders || []).filter(h => headers[h] === undefined);
  if (missingTest.length > 0) {
    showAlert('Cabeceras Faltantes', `Faltan las siguientes columnas requeridas: ${missingTest.join(', ')}`);
    return;
  }

  const allValues = sheet.getDataRange().getValues();
  const rows = allValues.slice(1);
  if (rows.length === 0) {
    showAlert('Sin Datos', 'La hoja de datos está vacía.');
    return;
  }

  try {
    const extraData = { configExtras: { ...config.extras } };
    if (formData && formData.extraNote !== undefined) {
      extraData.configExtras.extra_note = formData.extraNote;
    }
    if (typeof template.prepareExtraData === 'function') {
      template.prepareExtraData(rows, headers, extraData);
    }

    let rowData = null;
    for (let idx = 0; idx < rows.length; idx++) {
      rowData = template.processRow(rows[idx], headers, idx + 2, extraData);
      if (rowData) break;
    }
    if (!rowData) {
      showAlert('Sin Datos Procesables', 'No se encontró ninguna fila procesable para generar la prueba.');
      return;
    }

    const innerHtml = template.buildHtml(rowData);
    const isObject = typeof innerHtml === 'object';
    const body = isObject ? innerHtml.content : innerHtml;
    const alertBand = isObject ? innerHtml.alertBand : null;
    const extraNote = (formData && formData.extraNote) || (isObject ? innerHtml.extraNote : null);

    const fullHtml = buildEmailLayout({
      content: body,
      headerTitle: (formData && formData.subject) || template.headerTitle,
      footerLines: template.footerLines,
      alertBand: alertBand,
      extraNote: extraNote
    });

    const targetEmail = (formData && formData.testEmail) || Session.getActiveUser().getEmail();
    const cc = (formData && formData.cc) || '';
    const bcc = (formData && formData.bcc) || '';

    const result = sendEmail({
      to: targetEmail,
      subject: `[PRUEBA] ${(formData && formData.subject) || template.headerTitle}`,
      htmlBody: fullHtml,
      cc: cc,
      bcc: bcc,
      senderName: config.senderName || template.senderName,
      senderAlias: config.senderAlias || template.senderAlias,
      attachments: rowData.attachments || []
    });

    if (result.success) {
      showAlert('Prueba Enviada', `Se ha enviado con éxito un correo de prueba a:\n${targetEmail}`);
    } else {
      showAlert('Error en Prueba', `No se pudo enviar el correo de prueba: ${result.error}`);
    }
  } catch (e) {
    showAlert('Error en Prueba', e.message);
  }
}

/**
 * Server-side function called from SendDialog.html to fetch pre-flight data.
 * Returns quota, sender alias, batch warning threshold, processable row count, and active user email.
 * @returns {Object|null}
 */
function getPreflightData() {
  var resolved = _getSelectedTemplate();
  if (!resolved) return null;

  var config = resolved.config;
  var template = resolved.template;
  var sheet = _getDataSheet(config.dataSheet);
  if (!sheet) return null;

  var headers = mapHeaders(sheet);
  var statusColName = template.statusColumn || 'Estado_Envio';
  var statusIdx = headers[statusColName.trim().toLowerCase()];

  // Count processable rows (empty status or ERROR status)
  var lastRow = sheet.getLastRow();
  var processableCount = 0;
  var totalDataRows = lastRow - 1;

  if (totalDataRows > 0 && statusIdx !== undefined) {
    var statusValues = sheet.getRange(2, statusIdx + 1, totalDataRows, 1).getValues();
    for (var r = 0; r < statusValues.length; r++) {
      var st = String(statusValues[r][0] || '').toLowerCase();
      // Processable: empty (never sent) or error (fixable). Terminal states are excluded.
      if (!st || st.includes('error')) {
        processableCount++;
      }
    }
  } else {
    // No status column yet means all rows are processable
    processableCount = totalDataRows;
  }

  var userEmail = '';
  try {
    userEmail = Session.getActiveUser().getEmail();
  } catch (e) {
    // In some restricted environments getEmail might be empty
  }

  return {
    quota: MailApp.getRemainingDailyQuota(),
    senderAlias: config.senderAlias || template.senderAlias || '',
    batchThreshold: parseInt(config.extras.batch_warning_threshold) || 50,
    processableRows: processableCount,
    totalRows: totalDataRows,
    userEmail: userEmail
  };
}

/**
 * Displays the statistics and campaign dashboard in a Google Sheets sidebar.
 */
function showDashboard() {
  const html = HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setTitle('Dashboard Correos PUCV')
    .setWidth(390);

  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Server-side function called by Dashboard.html to fetch campaign metrics and status distribution.
 * @returns {Object}
 */
function getDashboardStats() {
  const quota = MailApp.getRemainingDailyQuota();
  const resolved = _getSelectedTemplate();

  if (!resolved) {
    return {
      hasConfig: false,
      quota: quota,
      error: 'No se encontró una plantilla configurada en la hoja "Config".'
    };
  }

  const { template, config } = resolved;
  const sheet = _getDataSheet(config.dataSheet);

  if (!sheet) {
    return {
      hasConfig: true,
      templateId: template.id,
      templateName: template.name,
      quota: quota,
      error: 'No se encontró la hoja de datos "' + (config.dataSheet || 'Datos') + '".'
    };
  }

  const headers = mapHeaders(sheet);
  const statusColName = template.statusColumn || 'Estado_Envio';
  const statusIdx = headers[statusColName.trim().toLowerCase()];

  const lastRow = sheet.getLastRow();
  const totalRows = Math.max(0, lastRow - 1);

  let sentCount = 0;
  let draftCount = 0;
  let errorCount = 0;
  let pendingCount = 0;

  if (totalRows > 0 && statusIdx !== undefined) {
    const statusValues = sheet.getRange(2, statusIdx + 1, totalRows, 1).getValues();
    for (let i = 0; i < statusValues.length; i++) {
      const st = String(statusValues[i][0] || '').toLowerCase().trim();
      if (!st) {
        pendingCount++;
      } else if (st.includes('enviado')) {
        sentCount++;
      } else if (st.includes('borrador')) {
        draftCount++;
      } else if (st.includes('error')) {
        errorCount++;
      } else if (st.includes('saltado')) {
        // Saltado = terminal (template skipped). Count alongside sent for progress purposes.
        sentCount++;
      } else {
        pendingCount++;
      }
    }
  } else {
    pendingCount = totalRows;
  }

  // Load recent log entries from the "Log" sheet
  const recentLogs = [];
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Log');
  if (logSheet && logSheet.getLastRow() > 1) {
    const logData = logSheet.getDataRange().getValues();
    const startIdx = Math.max(1, logData.length - 4);
    for (let j = logData.length - 1; j >= startIdx; j--) {
      const row = logData[j];
      recentLogs.push({
        timestamp: row[0] ? formatDateEs(row[0]) : '',
        templateName: row[2] || row[1] || 'Envío',
        sent: row[5] || 0,
        errors: row[6] || 0,
        isDraft: row[7] === true || String(row[7]).toLowerCase() === 'true'
      });
    }
  }

  const processedCount = sentCount + draftCount;
  const progressPct = totalRows > 0 ? Math.round((processedCount / totalRows) * 100) : 0;

  return {
    hasConfig: true,
    templateId: template.id,
    templateName: template.name,
    dataSheetName: sheet.getName(),
    totalRows: totalRows,
    sentCount: sentCount,
    draftCount: draftCount,
    errorCount: errorCount,
    pendingCount: pendingCount,
    progressPct: progressPct,
    quota: quota,
    recentLogs: recentLogs,
    lastUpdate: Utilities.formatDate(new Date(), 'America/Santiago', 'HH:mm:ss')
  };
}
