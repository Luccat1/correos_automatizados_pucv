/**
 * Core.gs
 * Foundational engine for the Unified Email System PUCV.
 * This file contains generic helper functions for sheet access, utilities, and email sending.
 */

// Global cache for Gmail aliases
let _ALIASES_CACHE = null;

// PUCV 100-year anniversary palette & modern aesthetic
const COLORS = {
  navy: '#001f3f',
  primary: '#24588d',
  secondary: '#1d71b8',
  accent: '#008cba',
  light: '#36a9e1',
  lightest: '#a3d1e3',
  danger: '#e73a34',
  dangerSoft: '#ee7269',
  purple: '#9366a9',
  yellow: '#f4ce46',
  teal: '#30b6be',
  bg: '#f8fafc',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0'
};

const DEFAULT_LOGO_URL = "https://comunicacionestrategica.pucv.cl/LOGO100/7/color.png";

/**
 * Returns the active sheet from the bound spreadsheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getActiveSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

/**
 * Gets a sheet by name with error handling.
 * @param {string} name - Name of the sheet to retrieve.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null}
 */
function getSheetByName(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    console.error(`Sheet "${name}" not found.`);
    return null;
  }
  return sheet;
}

/**
 * Reads row 1 headers and returns an object mapping lowercase header names to 0-based column indexes.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object.<string, number>}
 */
function mapHeaders(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    if (header) {
      map[header.toString().trim().toLowerCase()] = index;
    }
  });
  return map;
}

/**
 * Safely reads a cell value from a row array by index.
 * @param {Array} row - Array of values for a row.
 * @param {number} colIndex - 0-based column index.
 * @returns {string} Trimmed string or empty string.
 */
function safeCell(row, colIndex) {
  if (colIndex === undefined || colIndex < 0 || colIndex >= row.length) {
    return "";
  }
  const val = row[colIndex];
  return val !== null && val !== undefined ? val.toString().trim() : "";
}

/**
 * Like safeCell but throws descriptive error if value is empty.
 * @param {Array} row - Array of values for a row.
 * @param {number} colIndex - 0-based column index.
 * @param {string} fieldName - Name of the field for the error message.
 * @param {number} rowNumber - 1-based row number for the error message.
 * @throws Error if value is empty.
 * @returns {string}
 */
function requiredCell(row, colIndex, fieldName, rowNumber) {
  const val = safeCell(row, colIndex);
  if (!val) {
    throw new Error(`Falta el campo requerido "${fieldName}" en la fila ${rowNumber}.`);
  }
  return val;
}

/**
 * Checks if a column exists; if not, creates it at the end. Returns 1-based column index.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {Object.<string, number>} headers - Current header map.
 * @param {string} columnName - Name of the column to find or create.
 * @returns {number} 1-based column index.
 */
function ensureColumn(sheet, headers, columnName) {
  const cleanName = columnName.trim().toLowerCase();
  if (headers[cleanName] !== undefined) {
    return headers[cleanName] + 1;
  }
  
  // Create column
  const lastCol = sheet.getLastColumn();
  sheet.getRange(1, lastCol + 1).setValue(columnName);
  return lastCol + 1;
}

/**
 * Writes a 2D array of values to a single column starting at startRow.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {number} startRow - 1-based start row.
 * @param {number} colIndex1Based - 1-based column index.
 * @param {Array.<Array>} values2DArray - 2D array [[val1], [val2], ...].
 */
function batchUpdateColumn(sheet, startRow, colIndex1Based, values2DArray) {
  if (values2DArray.length === 0) return;
  sheet.getRange(startRow, colIndex1Based, values2DArray.length, 1).setValues(values2DArray);
}

/**
 * Returns formatted timestamp string using America/Santiago timezone.
 * @returns {string}
 */
function now() {
  return Utilities.formatDate(new Date(), "America/Santiago", "yyyy-MM-dd HH:mm:ss");
}

/**
 * Validates email format with regex.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase().trim());
}

/**
 * Parses a comma/semicolon-separated string of emails into a clean array.
 * @param {string} input
 * @returns {Array.<string>} Clean array of email addresses.
 */
function parseEmailList(input) {
  if (!input) return [];
  const normalized = String(input).replace(/;/g, ",");
  return normalized.split(",")
    .map(e => e.trim())
    .filter(e => e.length > 0 && e.includes("@"));
}

/**
 * Extracts first name from a full name string.
 * @param {string} fullName
 * @returns {string}
 */
function extractFirstName(fullName, fallback) {
  if (!fullName || !fullName.toString().trim()) return fallback || "";
  const parts = fullName.toString().trim().split(/\s+/);
  return parts[0];
}

/**
 * Formats a Date object as a readable Spanish date string (e.g. "18 de marzo de 2026").
 * If the value is not a Date, returns it unchanged as a string.
 * @param {Date|string|*} value
 * @returns {string}
 */
function formatDateEs(value) {
  if (!(value instanceof Date)) return String(value);
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return `${value.getDate()} de ${months[value.getMonth()]} de ${value.getFullYear()}`;
}

/**
 * Extracts Google Drive file ID from various URL formats (/d/ID, id=ID).
 * @param {string} url
 * @returns {string|null}
 */
function extractFileId(url) {
  if (!url) return null;
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

/**
 * Returns remaining daily email quota.
 * @returns {number}
 */
function checkQuota() {
  return MailApp.getRemainingDailyQuota();
}

/**
 * Wrapper for Utilities.sleep().
 * @param {number} ms - Milliseconds to sleep.
 */
function sleep(ms) {
  Utilities.sleep(ms);
}

/**
 * Main email dispatch function.
 * @param {Object} options
 * @param {string} options.to - Recipient.
 * @param {string} options.subject - Subject line.
 * @param {string} options.htmlBody - Rendered HTML.
 * @param {string} [options.plainBody] - Plain text fallback.
 * @param {string} [options.cc] - Comma-separated CC list.
 * @param {string} [options.bcc] - Comma-separated BCC list.
 * @param {string} [options.senderName] - Display name.
 * @param {string} [options.senderAlias] - Optional alias email.
 * @param {boolean} [options.asDraft] - If true, create draft instead of sending.
 * @returns {Object} { success: boolean, mode: 'sent'|'draft'|'error', timestamp: string, error?: string }
 */
function sendEmail(options) {
  try {
    const emailOptions = {
      htmlBody: options.htmlBody,
      name: options.senderName || "PUCV"
    };

    if (options.plainBody) emailOptions.body = options.plainBody;
    if (options.cc) emailOptions.cc = options.cc;
    if (options.bcc) emailOptions.bcc = options.bcc;
    if (options.attachments && options.attachments.length > 0) {
      emailOptions.attachments = options.attachments;
    }

    // Handle Alias
    if (options.senderAlias) {
      const aliases = _getAliasesCache();
      if (aliases.includes(options.senderAlias)) {
        emailOptions.from = options.senderAlias;
      } else {
        console.warn(`Alias ${options.senderAlias} no encontrado. Se usará la cuenta principal.`);
      }
    }

    if (options.asDraft) {
      GmailApp.createDraft(options.to, options.subject, options.plainBody || "", emailOptions);
      return { success: true, mode: 'draft', timestamp: now() };
    } else {
      GmailApp.sendEmail(options.to, options.subject, options.plainBody || "", emailOptions);
      return { success: true, mode: 'sent', timestamp: now() };
    }
  } catch (e) {
    console.error("Error en sendEmail:", e);
    return { success: false, mode: 'error', timestamp: now(), error: e.toString() };
  }
}

/**
 * Private helper to cache Gmail aliases.
 * @private
 * @returns {Array.<string>}
 */
function _getAliasesCache() {
  if (_ALIASES_CACHE === null) {
    try {
      _ALIASES_CACHE = GmailApp.getAliases();
    } catch (e) {
      console.warn("No se pudieron obtener los alias del remitente.");
      _ALIASES_CACHE = [];
    }
  }
  return _ALIASES_CACHE;
}

/**
 * Orchestrates batch sending with throttling and quota protection.
 * @param {Array.<Array>} rows - Data rows to process.
 * @param {Function} processFn - Callback (row, index) => { to, subject, htmlBody, plainBody, cc, bcc } | null
 * @param {Object} options - Config options.
 * @param {Function} [options.onProgress] - Callback(current, total, sent, errors) called at each throttle interval.
 * @returns {Object} { processed: number, errors: number, statuses: Array.<Array> }
 */
function sendBatch(rows, processFn, options) {
  let processed = 0;
  let errors = 0;
  const statuses = [];

  for (let i = 0; i < rows.length; i++) {
    // Check batch limit
    if (options.batchLimit && processed >= options.batchLimit) {
      console.info("Batch limit reached.");
      statuses.push(["LÍMITE ALCANZADO"]);
      continue;
    }

    // Check quota protection
    if (checkQuota() < 5) {
      console.error("Quota nearly exhausted. Stopping batch.");
      statuses.push(["ERROR: QUOTA INSUFICIENTE"]);
      continue;
    }

    const rowData = processFn(rows[i], i);
    if (!rowData) {
      statuses.push(["SALTADO"]);
      continue;
    }

    const result = sendEmail({
      ...rowData,
      senderName: options.senderName,
      senderAlias: options.senderAlias,
      asDraft: options.asDraft
    });

    if (result.success) {
      const statusText = result.mode === 'draft' ? "BORRADOR CREADO" : "ENVIADO";
      statuses.push([`${statusText} (${result.timestamp})`]);
      processed++;
    } else {
      statuses.push([`ERROR: ${result.error}`]);
      errors++;
    }

    // Throttling + progress callback (LOG-02)
    if (options.sleepEvery && (i + 1) % options.sleepEvery === 0) {
      if (typeof options.onProgress === 'function') {
        options.onProgress(i + 1, rows.length, processed, errors);
      }
      sleep(options.sleepMs || 1000);
    }
  }

  return { processed, errors, statuses };
}

/**
 * Shares a Google Drive file with the given email as viewer.
 * @param {string} fileId - ID of the file to share.
 * @param {string} email - Recipient email.
 * @returns {Object} { success: boolean, error?: string }
 */
function shareFileAsViewer(fileId, email) {
  try {
    if (!fileId || !email) return { success: false, error: "Falta ID de archivo o email" };
    const file = DriveApp.getFileById(fileId);
    file.addViewer(email.trim());
    return { success: true };
  } catch (e) {
    console.error(`Error compartiendo archivo ${fileId} con ${email}:`, e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Shares a Google Drive file with multiple emails.
 * @param {string} fileId - ID of the file to share.
 * @param {Array.<string>} emailList - Array of emails.
 * @returns {Array.<Object>} Array of results.
 */
function shareFileWithMultiple(fileId, emailList) {
  if (!emailList || !Array.isArray(emailList)) return [];
  return emailList.map(email => shareFileAsViewer(fileId, email));
}

/**
 * Master HTML layout function with institutional branding and modern email aesthetic.
 * @param {Object} options
 * @returns {string} Fully rendered HTML string.
 */
function buildEmailLayout(options) {
  const logoUrl = options.logoUrl || DEFAULT_LOGO_URL;
  const logoAlt = options.logoAlt || "PUCV";
  const headerTitle = options.headerTitle || "UNIDAD DE EVALUACIÓN DOCENTE CELE";
  const footerLines = options.footerLines || ["Pontificia Universidad Católica de Valparaíso", "Dirección General de Asuntos Internacionales"];
  const headerColor = options.headerColor || COLORS.primary;

  const logoHtml = options.logoLink 
    ? `<a href="${options.logoLink}" target="_blank" style="text-decoration: none;"><img src="${logoUrl}" alt="${logoAlt}" style="max-width: 240px; height: auto; border: 0; outline: none; display: block; margin: 0 auto;"></a>`
    : `<img src="${logoUrl}" alt="${logoAlt}" style="max-width: 240px; height: auto; border: 0; outline: none; display: block; margin: 0 auto;">`;

  const alertBandHtml = options.alertBand 
    ? `<tr>
         <td style="background: linear-gradient(135deg, ${COLORS.danger} 0%, #c62828 100%); color: ${COLORS.white}; padding: 13px 20px; text-align: center; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; letter-spacing: 0.3px;">
           ${options.alertBand}
         </td>
       </tr>`
    : "";

  const extraNoteHtml = options.extraNote
    ? `<div style="background-color: #fefce8; border: 1px solid #fef08a; border-left: 4px solid #eab308; border-radius: 0 8px 8px 0; padding: 16px 18px; margin-top: 25px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #713f12; line-height: 1.55; box-shadow: 0 1px 3px rgba(234,179,8,0.05);">
         <strong style="color: #854d0e; display: inline-block; margin-bottom: 4px;">📌 Nota adicional:</strong><br>${options.extraNote}
       </div>`
    : "";

  const footerHtml = footerLines.map(line => `<p style="margin: 4px 0;"><strong>${line}</strong></p>`).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    p { margin: 0 0 16px 0; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: ${COLORS.bg}; color: ${COLORS.text};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.bg}; padding: 28px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: ${COLORS.white}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07); border: 1px solid ${COLORS.border}; max-width: 600px; width: 100%;">
          
          <!-- Top Logo Banner -->
          <tr>
            <td align="center" style="padding: 24px 20px 20px; background-color: #ffffff;">
              ${logoHtml}
            </td>
          </tr>

          <!-- Main Institutional Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.navy} 0%, ${headerColor} 55%, ${COLORS.secondary} 100%); padding: 26px 24px; text-align: center; color: ${COLORS.white};">
              <p style="margin: 0 0 6px 0; color: rgba(255,255,255,0.85); font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
                Pontificia Universidad Católica de Valparaíso
              </p>
              <h1 style="color: #ffffff; margin: 0; font-size: 21px; font-weight: 700; letter-spacing: 0.4px; line-height: 1.35;">
                ${headerTitle}
              </h1>
            </td>
          </tr>

          ${alertBandHtml}

          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px; line-height: 1.65; color: #334155; font-size: 15.5px;">
              ${options.content}
              ${extraNoteHtml}
            </td>
          </tr>

          <!-- Institutional Footer -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.primary} 100%); padding: 26px 24px; text-align: center; color: #ffffff;">
              <div style="color: #ffffff; font-size: 13.5px; font-weight: 600; line-height: 1.55;">
                ${footerHtml}
              </div>
              <div style="border-top: 1px solid rgba(255,255,255,0.18); margin: 16px auto 12px; max-width: 480px;"></div>
              <p style="color: rgba(255,255,255,0.65); margin: 0; font-size: 11.5px; line-height: 1.45;">
                Este es un comunicado oficial emitido por la Pontificia Universidad Católica de Valparaíso.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Returns an HTML button string with modern gradient and shadow.
 * @param {string} text
 * @param {string} url
 * @param {string} [color]
 * @returns {string}
 */
function buildButton(text, url, color) {
  const bg = color || "linear-gradient(135deg, #24588d 0%, #1d71b8 100%)";
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" target="_blank" style="background: ${bg}; color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 30px; font-weight: 700; font-size: 15px; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 15px rgba(36, 88, 141, 0.35); letter-spacing: 0.3px;">${text}</a>
    </div>
  `;
}

/**
 * Returns a styled callout/info box HTML string with modern accents.
 * @param {string} content
 * @param {string} [borderColor]
 * @returns {string}
 */
function buildInfoBox(content, borderColor) {
  const border = borderColor || COLORS.primary;
  return `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid ${border}; border-radius: 0 10px 10px 0; padding: 18px 20px; margin: 22px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #1e293b; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
      ${content}
    </div>
  `;
}

/**
 * Returns a styled warning box HTML string with modern amber aesthetics.
 * @param {string} content
 * @returns {string}
 */
function buildWarningBox(content) {
  return `
    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 10px 10px 0; padding: 18px 20px; margin: 22px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14.5px; line-height: 1.6; color: #92400e; box-shadow: 0 2px 6px rgba(245,158,11,0.04);">
      ${content}
    </div>
  `;
}

/**
 * Creates a custom menu in Google Sheets.
 * @param {Array.<Object>} menuItems - Array of {label, functionName} or {separator: true}.
 */
function buildMenu(menuItems) {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('📧 Correos PUCV');
  
  menuItems.forEach(item => {
    if (!item || item.separator) {
      menu.addSeparator();
    } else if (item.children && Array.isArray(item.children)) {
      const subMenu = ui.createMenu(item.label);
      item.children.forEach(child => {
        if (!child || child.separator) {
          subMenu.addSeparator();
        } else {
          subMenu.addItem(child.label, child.functionName);
        }
      });
      menu.addSubMenu(subMenu);
    } else {
      menu.addItem(item.label, item.functionName);
    }
  });
  
  menu.addToUi();
}

/**
 * Shows a YES/NO confirmation dialog.
 * @param {string} title
 * @param {string} message
 * @returns {boolean}
 */
function confirmAction(title, message) {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(title, message, ui.ButtonSet.YES_NO);
  return response === ui.Button.YES;
}

/**
 * Shows an info alert dialog.
 * @param {string} title
 * @param {string} message
 */
function showAlert(title, message) {
  SpreadsheetApp.getUi().alert(title, message, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Shows a formatted results summary dialog.
 * @param {number} processed
 * @param {number} errors
 */
function showResult(processed, errors) {
  const title = "Proceso Finalizado";
  const message = `✅ Resumen del envío:\n\n` +
                  `• Procesados con éxito: ${processed}\n` +
                  `• Errores encontrados: ${errors}\n\n` +
                  `Revisa la columna de estado para más detalles.`;
  showAlert(title, message);
}
