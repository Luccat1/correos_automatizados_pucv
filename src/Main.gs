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

// --- Menu Handler Stubs ---
// (Implemented in Plan 3.2)

function menuSendEmails() {
  showAlert('En Desarrollo', 'Esta función requiere la ejecución del Plan 3.2.');
}

function menuSendTest() {
  showAlert('En Desarrollo', 'Esta función requiere la ejecución del Plan 3.2.');
}

function menuPreview() {
  showAlert('En Desarrollo', 'Esta función requiere la ejecución del Plan 3.2.');
}

function menuCreateDrafts() {
  showAlert('En Desarrollo', 'Esta función requiere la ejecución del Plan 3.2.');
}

function menuShowConfig() {
  const resolved = _getSelectedTemplate();
  if (!resolved) return;

  const { template, config } = resolved;
  let msg = `Plantilla: ${template.name} (${template.id})\n`;
  msg += `Remitente: ${config.senderName || template.senderName || 'Default'}\n`;
  if (config.senderAlias) msg += `Alias: ${config.senderAlias}\n`;
  if (config.cc) msg += `CC: ${config.cc}\n`;
  if (config.bcc) msg += `BCC: ${config.bcc}\n`;
  msg += `\nCabeceras requeridas:\n- ${template.requiredHeaders.join('\n- ')}`;

  showAlert('Configuración Actual', msg);
}
