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
    { label: '📧 Enviar Correos', functionName: 'menuSendEmails' },
    { label: '🧪 Enviar Prueba', functionName: 'menuSendTest' },
    { label: '👁 Vista Previa', functionName: 'menuPreview' },
    null, // separator
    { label: '📝 Crear Borradores', functionName: 'menuCreateDrafts' },
    null, // separator
    { label: 'ℹ️ Ver Configuración', functionName: 'menuShowConfig' }
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
      case 'sender_name': config.senderName = value; break;
      case 'sender_alias': config.senderAlias = value; break;
      case 'cc': config.cc = value; break;
      case 'bcc': config.bcc = value; break;
      default: config.extras[key] = value;
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const headers = mapHeaders(sheet);
  
  // Get first data row (row 2)
  const dataRange = sheet.getRange(2, 1, 1, sheet.getLastColumn());
  const row = dataRange.getValues()[0];

  try {
    const rowData = template.processRow(row, headers, 2);
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const headers = mapHeaders(sheet);
  
  const dataRange = sheet.getRange(2, 1, 1, sheet.getLastColumn());
  const row = dataRange.getValues()[0];

  try {
    const rowData = template.processRow(row, headers, 2);
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

    const htmlOutput = HtmlService.createHtmlOutput(fullHtml)
        .setWidth(800)
        .setHeight(600)
        .setTitle(`Vista Previa: ${template.name}`);
    
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Vista Previa de Correo');
  } catch (e) {
    showAlert('Error en Vista Previa', e.message);
  }
}

/**
 * Triggers mass sending of emails.
 */
function menuSendEmails() {
  _executeBatch(false);
}

/**
 * Triggers mass creation of drafts.
 */
function menuCreateDrafts() {
  _executeBatch(true);
}

/**
 * Shared execution logic for sending and drafting.
 * @param {boolean} asDraft
 * @private
 */
function _executeBatch(asDraft) {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  const sheet = SpreadsheetApp.getActiveSheet();
  const headers = mapHeaders(sheet);

  // Validate required headers
  const missing = template.requiredHeaders.filter(h => headers[h] === undefined);
  if (missing.length > 0) {
    showAlert('Cabeceras Faltantes', `Faltan las siguientes columnas requeridas: ${missing.join(', ')}`);
    return;
  }

  // Confirmation
  const actionName = asDraft ? 'crear borradores' : 'enviar correos masivos';
  if (!confirmAction('Confirmar Acción', `¿Está seguro que desea ${actionName} usando la plantilla "${template.name}"?`)) {
    return;
  }

  // Pre-load extra data for templates that need it (e.g. report_delivery)
  const extraData = {};
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

  const processFn = (row, i) => {
    const rowIndex = i + 2;
    const currentStatus = String(row[statusCol - 1] || '');
    
    // Skip if already sent/drafted
    if (currentStatus.toLowerCase().includes('enviado') || currentStatus.toLowerCase().includes('borrador')) {
      return null;
    }

    try {
      const data = template.processRow(row, headers, rowIndex, extraData);
      if (!data) return null;

      const innerHtml = template.buildHtml(data);
      const isObject = typeof innerHtml === 'object';
      const body = isObject ? innerHtml.content : innerHtml;
      const alertBand = isObject ? innerHtml.alertBand : null;

      const fullHtml = buildEmailLayout({
        content: body,
        headerTitle: template.headerTitle,
        footerLines: template.footerLines,
        alertBand: alertBand
      });

      // Special overrides from processRow (e.g. report_delivery)
      const recipient = data.to || data.correo;
      const cc = data.cc || config.cc;
      const bcc = data.bcc || config.bcc;

      return {
        to: recipient,
        subject: template.headerTitle,
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
  // statuses are already [[val], [val], ...] from sendBatch
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
