/**
 * Core.gs
 * Foundational engine for the Unified Email System PUCV.
 * This file contains generic helper functions for sheet access, utilities, and email sending.
 */

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
