/**
 * Core.gs
 * Foundational engine for the Unified Email System PUCV.
 * This file contains generic helper functions for sheet access, utilities, and email sending.
 */

// Global cache for Gmail aliases
let _ALIASES_CACHE = null;

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
function extractFirstName(fullName) {
  if (!fullName) return "";
  const parts = fullName.toString().trim().split(/\s+/);
  return parts[0];
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

    // Throttling
    if (options.sleepEvery && (i + 1) % options.sleepEvery === 0) {
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
