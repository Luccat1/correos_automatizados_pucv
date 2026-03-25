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
    { label: '⚙️ Configurar Plantilla', functionName: 'menuSetupTemplate' },
    null, // separator
    {
      label: '📤 Envío',
      children: [
        { label: '📧 Enviar Correos', functionName: 'menuSendEmails' },
        { label: '📝 Crear Borradores', functionName: 'menuCreateDrafts' },
        { label: '🧪 Enviar Prueba', functionName: 'menuSendTest' }
      ]
    },
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
 * Sends test email to the current user.
 */
function menuSendTest() {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  const sheet = _getDataSheet(config.dataSheet);
  if (!sheet) return;

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

  if (!row) {
    showAlert('Sin Datos', 'La hoja de datos está vacía.');
    return;
  }

  try {
    const extraData = { configExtras: { ...config.extras } };
    if (typeof template.prepareExtraData === 'function') {
      template.prepareExtraData(rows, headers, extraData);
    }
    const rowData = template.processRow(row, headers, 2, extraData);
    if (!rowData) {
      showAlert('Error', 'No se pudo procesar la primera fila de datos.');
      return;
    }

    // Prepare HTML
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

    const testEmail = Session.getActiveUser().getEmail();
    sendEmail({
      to: testEmail,
      subject: `[PRUEBA] ${template.headerTitle}`,
      htmlBody: fullHtml,
      senderName: config.senderName || template.senderName,
      senderAlias: config.senderAlias || template.senderAlias
    });

    showAlert('Prueba Enviada', `Se ha enviado un correo de prueba a ${testEmail}`);
  } catch (e) {
    showAlert('Error en Prueba', e.message);
  }
}

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
    const rowData = template.processRow(row, headers, 2, extraData);
    if (!rowData) {
      showAlert('Error', 'No se pudo procesar la primera fila de datos.');
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
        <style>
          body { font-family: sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
          .preview-header { 
            background-color: #24588d; 
            color: white; 
            padding: 15px 20px; 
            position: sticky; 
            top: 0; 
            z-index: 100;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .preview-header h3 { margin: 0; font-size: 16px; }
          .preview-header p { margin: 5px 0 0; font-size: 12px; opacity: 0.9; }
          .preview-container { padding: 20px; display: flex; justify-content: center; }
          .email-wrapper { 
            background: white; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
            width: 100%; 
            max-width: 600px; 
          }
          .preview-footer {
            padding: 15px 20px;
            text-align: right;
            background: white;
            border-top: 1px solid #eee;
            position: sticky;
            bottom: 0;
          }
          .btn-close {
            background: #666;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="preview-header">
          <h3>Vista Previa: ${template.name}</h3>
          <p><strong>Asunto:</strong> ${template.headerTitle} | <strong>Destinatarios:</strong> ~${rowCount}</p>
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
 * Triggers mass sending of emails.
 */
function menuSendEmails() {
  _showSendDialog(false);
}

/**
 * Triggers mass creation of drafts.
 */
function menuCreateDrafts() {
  _showSendDialog(true);
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

  const processFn = (row, i) => {
    const rowIndex = i + 2;
    const currentStatus = String(row[statusCol - 1] || '').toLowerCase();
    
    // Skip if already sent/drafted or explicitly skipped (saltado)
    if (currentStatus.includes('enviado') || currentStatus.includes('borrador') || currentStatus.includes('saltado')) {
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
        bcc: bcc
      };
    } catch (e) {
      console.error(`Error en fila ${rowIndex}: ${e.message}`);
      return null;
    }
  };

  const options = {
    senderName: config.senderName || template.senderName,
    senderAlias: config.senderAlias || template.senderAlias,
    asDraft: asDraft,
    sleepEvery: 20,
    sleepMs: 1000
  };

  const results = sendBatch(rows, processFn, options);

  // Update statuses
  batchUpdateColumn(sheet, 2, statusCol, results.statuses);

  showResult(results.processed, results.errors);
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
 * Shows the pre-send customization dialog.
 * @param {boolean} asDraft
 * @private
 */
function _showSendDialog(asDraft) {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  const sheet = _getDataSheet(config.dataSheet);
  if (!sheet) return;

  const headers = mapHeaders(sheet);
  const missing = template.requiredHeaders.filter(h => headers[h] === undefined);
  if (missing.length > 0) {
    showAlert('Cabeceras Faltantes', `Faltan las siguientes columnas requeridas: ${missing.join(', ')}`);
    return;
  }

  const rowCount = sheet.getLastRow() - 1;
  if (rowCount <= 0) {
    showAlert('Sin Datos', 'La hoja de datos está vacía.');
    return;
  }

  const html = HtmlService.createTemplateFromFile('SendDialog');
  html.templateName = template.name;
  html.subject = template.headerTitle;
  html.extraNote = config.extras.extra_note || '';
  html.cc = config.cc || '';
  html.bcc = config.bcc || '';
  html.rowCount = rowCount;
  html.dataSheetName = sheet.getName();
  html.asDraft = asDraft;

  const ui = html.evaluate()
      .setWidth(500)
      .setHeight(450)
      .setTitle(asDraft ? 'Preparar Borradores' : 'Confirmar Envío Masivo');

  SpreadsheetApp.getUi().showModalDialog(ui, ' '); // Title is handled inside dialog
}

/**
 * Server-side callback from SendDialog.html.
 * @param {Object} formData
 */
function executeBatchFromDialog(formData) {
  _executeBatch(formData.asDraft, formData);
}
