// Code.gs
// Envío de códigos para libros o pruebas desde un proyecto independiente de Apps Script.
// Autor: Centro de Idiomas PUCV
// Licencia: MIT

/**********************
 * CONFIGURACIÓN
 **********************/
const CONFIG = {
  SHEET_ID: 'PEGAR_AQUI_EL_ID_DE_TU_HOJA', // Obligatorio. Ej: 1AbC...xyz
  SHEET_NAME: 'Listado',                    // Obligatorio. Nombre de la pestaña
  HEADERS: {                                // Encabezados esperados (en español, sin tildes si prefieres)
    email: 'correo',
    nombre: 'nombre',
    codigo: 'codigo',
    enviado: 'enviado',
    fechaEnvio: 'fecha_envio',
    asunto: 'asunto_opcional',
    cuerpo: 'cuerpo_opcional',
    tipo: 'tipo_opcional'                   // p.ej., 'libro' o 'prueba' si quieres variar la plantilla
  },
  SENDER_NAME: 'Centro de Idiomas PUCV',
  REPLY_TO: '',                             // Opcional. Ej: 'idiomas@pucv.cl'
  DRY_RUN: false,                           // true = simula sin enviar
  FORCE_RESEND: false,                      // true = reenvía aunque ya figure como enviado
  BATCH_LIMIT: 50,                          // Máximo por corrida
  SLEEP_MS_EVERY: 20,                       // Pausa cada N correos
  SLEEP_MS: 1000,                           // 1000 ms = 1 s
  DEFAULT_SUBJECT: 'Entrega de código {{tipo}}',
  DEFAULT_BODY_HTML: `
  <p>Hola {{nombre}},</p>
  <p>A continuación encontrarás tu código {{tipo}}:</p>
  <p style="font-size:18px"><strong>{{codigo}}</strong></p>
  <p>Si tienes dudas, responde a este correo.</p>
  <p>Saludos,<br>Centro de Idiomas PUCV</p>`,
  DEFAULT_BODY_TEXT: `Hola {{nombre}},\n\nTu código {{tipo}} es: {{codigo}}\n\nSaludos,\nCentro de Idiomas PUCV`
};

/**********************
 * UTILIDADES
 **********************/
function _getSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  return ss.getSheetByName(CONFIG.SHEET_NAME);
}

function _headersIndex_(hdrs) {
  const map = {};
  hdrs.forEach((h, i) => map[String(h).trim().toLowerCase()] = i);
  return map;
}

function _now_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Santiago', 'yyyy-MM-dd HH:mm:ss');
}

function _isValidEmail_(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email || '').trim());
}

function _mergeTemplate_(tpl, data) {
  return String(tpl).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => data[k] ?? '');
}

function _log_(sheetLogs, status, email, message) {
  sheetLogs.appendRow([_now_(), status, email || '', message || '']);
}

function _ensureLogsSheet_(ss) {
  const name = 'Logs';
  let s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(['timestamp', 'status', 'email', 'message']);
  }
  return s;
}

function _uniqueCodesFromSheet_(sheet, colIdx) {
  const last = sheet.getLastRow();
  const codes = new Set();
  if (last < 2) return codes;
  const values = sheet.getRange(2, colIdx + 1, last - 1, 1).getValues();
  values.forEach(r => { const c = String(r[0]).trim(); if (c) codes.add(c); });
  return codes;
}

function _generateCode_() {
  // 10 caracteres alfanuméricos, sin confusiones (excluye O/0, I/1, l)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 10; i++) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return out;
}

/**********************
 * ACCIONES PRINCIPALES
 **********************/

// 1) Generar códigos faltantes en la columna HEADERS.codigo
function generarCodigosFaltantes() {
  const sheet = _getSheet_();
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  const idx = _headersIndex_(headers);

  const colCodigo = idx[CONFIG.HEADERS.codigo];
  if (colCodigo == null) throw new Error('No se encontró la columna de código en HEADERS.codigo');

  const last = sheet.getLastRow();
  if (last < 2) return;

  const codesSet = _uniqueCodesFromSheet_(sheet, colCodigo);
  const rango = sheet.getRange(2, colCodigo + 1, last - 1, 1);
  const vals = rango.getValues();
  let created = 0;

  for (let i = 0; i < vals.length; i++) {
    let c = String(vals[i][0]).trim();
    if (!c) {
      let candidate;
      do { candidate = _generateCode_(); } while (codesSet.has(candidate));
      vals[i][0] = candidate;
      codesSet.add(candidate);
      created++;
    }
  }
  rango.setValues(vals);
  SpreadsheetApp.flush();
  Logger.log(`Códigos creados: ${created}`);
  return created;
}

// 2) Enviar códigos por correo según hoja
function enviarCodigos() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('No se encontró la hoja "' + CONFIG.SHEET_NAME + '"');

  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  const idx = _headersIndex_(headers);

  const colEmail = idx[CONFIG.HEADERS.email];
  const colNombre = idx[CONFIG.HEADERS.nombre];
  const colCodigo = idx[CONFIG.HEADERS.codigo];
  const colEnviado = idx[CONFIG.HEADERS.enviado];
  const colFechaEnvio = idx[CONFIG.HEADERS.fechaEnvio];
  const colAsunto = idx[CONFIG.HEADERS.asunto];
  const colCuerpo = idx[CONFIG.HEADERS.cuerpo];
  const colTipo = idx[CONFIG.HEADERS.tipo];

  const required = {colEmail, colNombre, colCodigo, colEnviado, colFechaEnvio};
  Object.keys(required).forEach(k => {
    if (required[k] == null) throw new Error('Falta columna requerida en HEADERS: ' + k);
  });

  const last = sheet.getLastRow();
  if (last < 2) {
    Logger.log('No hay filas de datos.');
    return;
  }

  const numRows = last - 1;
  const range = sheet.getRange(2, 1, numRows, sheet.getLastColumn());
  const data = range.getValues();

  const logs = _ensureLogsSheet_(ss);
  const toWriteEnviado = [];
  const toWriteFecha = [];

  let sent = 0;

  for (let r = 0; r < data.length; r++) {
    try {
      const row = data[r];
      const email = String(row[colEmail] || '').trim();
      const nombre = String(row[colNombre] || '').trim();
      const codigo = String(row[colCodigo] || '').trim();
      const yaEnviado = String(row[colEnviado] || '').toLowerCase() === 'true' || row[colEnviado] === true;
      const tipo = (colTipo != null ? String(row[colTipo] || '').trim() : '') || 'de acceso';

      if (!_isValidEmail_(email)) {
        _log_(logs, 'SKIP', email, `Email inválido en fila ${r + 2}`);
        continue;
      }
      if (!codigo) {
        _log_(logs, 'SKIP', email, `Sin código en fila ${r + 2}`);
        continue;
      }
      if (yaEnviado && !CONFIG.FORCE_RESEND) {
        _log_(logs, 'SKIP', email, `Marcado como enviado. Usa FORCE_RESEND=true para reenviar`);
        continue;
      }

      const subjectTpl = (colAsunto != null && row[colAsunto]) ? String(row[colAsunto]) : CONFIG.DEFAULT_SUBJECT;
      const bodyTpl = (colCuerpo != null && row[colCuerpo]) ? String(row[colCuerpo]) : CONFIG.DEFAULT_BODY_HTML;
      const bodyTxtTpl = CONFIG.DEFAULT_BODY_TEXT;

      const dict = { nombre, codigo, tipo, correo: email };
      const subject = _mergeTemplate_(subjectTpl, dict);
      const htmlBody = _mergeTemplate_(bodyTpl, dict);
      const textBody = _mergeTemplate_(bodyTxtTpl, dict);

      if (!CONFIG.DRY_RUN) {
        GmailApp.sendEmail(email, subject, textBody, {
          name: CONFIG.SENDER_NAME,
          replyTo: CONFIG.REPLY_TO || undefined,
          htmlBody
        });
      }

      const stamp = _now_();
      toWriteEnviado.push([true]);
      toWriteFecha.push([stamp]);
      _log_(logs, CONFIG.DRY_RUN ? 'DRY_RUN' : 'SENT', email, `OK fila ${r + 2}`);
      sent++;

      if (CONFIG.SLEEP_MS_EVERY && sent % CONFIG.SLEEP_MS_EVERY === 0) {
        Utilities.sleep(CONFIG.SLEEP_MS);
      }

      if (CONFIG.BATCH_LIMIT && sent >= CONFIG.BATCH_LIMIT) {
        _log_(logs, 'STOP', '', `Se alcanzó BATCH_LIMIT=${CONFIG.BATCH_LIMIT}`);
        break;
      }

    } catch (err) {
      _log_(logs, 'ERROR', String(data[r][colEmail] || ''), `Fila ${r + 2}: ${err.message}`);
      toWriteEnviado.push([data[r][colEnviado] || false]); // no cambia
      toWriteFecha.push([data[r][colFechaEnvio] || '']);   // no cambia
    }
  }

  // Escritura en bloque solo sobre las filas procesadas
  const processedRows = toWriteEnviado.length;
  if (processedRows > 0) {
    sheet.getRange(2, colEnviado + 1, processedRows, 1).setValues(toWriteEnviado);
    sheet.getRange(2, colFechaEnvio + 1, processedRows, 1).setValues(toWriteFecha);
  }

  SpreadsheetApp.flush();
  Logger.log(`Procesadas ${processedRows} filas. Enviados: ${sent}.`);
  return { processedRows, sent };
}

// 3) Vista previa: muestra asunto y cuerpo renderizados de la primera fila pendiente
function vistaPreviaPrimeraPendiente() {
  const sheet = _getSheet_();
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  const idx = _headersIndex_(headers);

  const colEmail = idx[CONFIG.HEADERS.email];
  const colNombre = idx[CONFIG.HEADERS.nombre];
  const colCodigo = idx[CONFIG.HEADERS.codigo];
  const colEnviado = idx[CONFIG.HEADERS.enviado];
  const colAsunto = idx[CONFIG.HEADERS.asunto];
  const colCuerpo = idx[CONFIG.HEADERS.cuerpo];
  const colTipo = idx[CONFIG.HEADERS.tipo];

  const last = sheet.getLastRow();
  if (last < 2) throw new Error('No hay datos');

  const data = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    const yaEnviado = String(row[colEnviado] || '').toLowerCase() === 'true' || row[colEnviado] === true;
    if (!yaEnviado) {
      const email = String(row[colEmail] || '').trim();
      const nombre = String(row[colNombre] || '').trim();
      const codigo = String(row[colCodigo] || '').trim();
      const tipo = (colTipo != null ? String(row[colTipo] || '').trim() : '') || 'de acceso';

      const subjectTpl = (colAsunto != null && row[colAsunto]) ? String(row[colAsunto]) : CONFIG.DEFAULT_SUBJECT;
      const bodyTpl = (colCuerpo != null && row[colCuerpo]) ? String(row[colCuerpo]) : CONFIG.DEFAULT_BODY_HTML;
      const dict = { nombre, codigo, tipo, correo: email };

      const subject = _mergeTemplate_(subjectTpl, dict);
      const htmlBody = _mergeTemplate_(bodyTpl, dict);

      Logger.log('Asunto:', subject);
      Logger.log('HTML:', htmlBody);
      return {subject, htmlBody};
    }
  }
  Logger.log('No hay filas pendientes.');
  return null;
}

// 4) Utilidad: alternar DRY_RUN o FORCE_RESEND rápidamente
function setDryRun(valor) { CONFIG.DRY_RUN = !!valor; }
function setForceResend(valor) { CONFIG.FORCE_RESEND = !!valor; }

/**********************
 * MENÚS EN EL EDITOR
 * (Aparecen en el editor de Apps Script > Ejecutar)
 **********************/
function onOpen() {
  // En proyectos independientes no aparece un menú en Sheets,
  // pero estas funciones quedan disponibles para ejecutar:
  // - generarCodigosFaltantes
  // - vistaPreviaPrimeraPendiente
  // - enviarCodigos
  // - setDryRun(true/false)
  // - setForceResend(true/false)
}
