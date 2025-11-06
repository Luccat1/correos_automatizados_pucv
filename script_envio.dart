// Code.gs
// Envío de códigos para libros o pruebas desde un proyecto independiente de Apps Script.
// Autor: Centro de Idiomas PUCV
// Licencia: MIT

/**********************
 * CONFIGURACIÓN
 **********************/
// Esta es la sección principal que debes modificar.
// Ajusta estas variables para que el script funcione con tu Google Sheet y tus preferencias.
const CONFIG = {
  // --- CONFIGURACIÓN ESENCIAL ---
  
  // ID de tu Google Sheet. Cópialo desde la URL de la hoja.
  // Ejemplo: si la URL es https://docs.google.com/spreadsheets/d/1AbC...xyz/edit, el ID es "1AbC...xyz".
  SHEET_ID: 'PEGAR_AQUI_EL_ID_DE_TU_HOJA',

  // Nombre de la pestaña (hoja) dentro de tu Google Sheet donde están los datos.
  SHEET_NAME: 'Listado',

  // Nombres de las columnas en tu Google Sheet.
  // Si tus columnas se llaman diferente, cambia los valores aquí.
  // Ejemplo: si tu columna para el email se llama 'Email Estudiante', cambia 'correo' por 'email estudiante'.
  HEADERS: {
    email: 'correo',          // Columna con los correos de los destinatarios.
    nombre: 'nombre',         // Columna con los nombres de los destinatarios.
    codigo: 'codigo',         // Columna para el código único que se enviará.
    enviado: 'enviado',       // Columna para marcar si el correo ya fue enviado (TRUE/FALSE).
    fechaEnvio: 'fecha_envio',// Columna para registrar la fecha y hora del envío.
    asunto: 'asunto_opcional', // Columna opcional para un asunto de correo personalizado por fila.
    cuerpo: 'cuerpo_opcional', // Columna opcional para un cuerpo de correo HTML personalizado por fila.
    tipo: 'tipo_opcional'     // Columna opcional para categorizar el envío (ej: 'libro', 'prueba').
  },

  // --- CONFIGURACIÓN DE ENVÍO DE CORREO ---

  // Nombre del remitente que aparecerá en el correo (ej: "Centro de Idiomas PUCV").
  SENDER_NAME: 'Centro de Idiomas PUCV',
  
  // Dirección de correo a la que se dirigirán las respuestas. Si se deja en blanco, usará el correo del remitente.
  REPLY_TO: '', // Ej: 'idiomas@pucv.cl'

  // --- PLANTILLAS DE CORREO POR DEFECTO ---
  // Estas plantillas se usan si no hay nada en las columnas 'asunto_opcional' o 'cuerpo_opcional'.
  // Puedes usar {{placeholders}} que serán reemplazados por los datos de la fila.
  // Placeholders disponibles: {{nombre}}, {{codigo}}, {{tipo}}, {{correo}}.

  // Asunto del correo por defecto.
  DEFAULT_SUBJECT: 'Entrega de código {{tipo}}',
  
  // Cuerpo del correo por defecto en formato HTML. Permite usar negritas, párrafos, etc.
  DEFAULT_BODY_HTML: `
  <p>Hola {{nombre}},</p>
  <p>A continuación encontrarás tu código {{tipo}}:</p>
  <p style="font-size:18px"><strong>{{codigo}}</strong></p>
  <p>Si tienes dudas, responde a este correo.</p>
  <p>Saludos,<br>Centro de Idiomas PUCV</p>`,
  
  // Cuerpo del correo alternativo en texto plano (para clientes de correo que no soportan HTML).
  DEFAULT_BODY_TEXT: `Hola {{nombre}},\n\nTu código {{tipo}} es: {{codigo}}\n\nSaludos,\nCentro de Idiomas PUCV`

  // --- CONFIGURACIÓN AVANZADA Y DE SEGURIDAD ---
  DRY_RUN: false,      // MODO SIMULACIÓN: Si es `true`, el script se ejecutará pero NO enviará correos. Útil para probar.
  FORCE_RESEND: false, // FORZAR REENVÍO: Si es `true`, reenviará correos aunque la columna 'enviado' ya diga TRUE.
  BATCH_LIMIT: 50,     // LÍMITE POR EJECUCIÓN: Número máximo de correos a enviar en una sola ejecución del script.
  SLEEP_MS_EVERY: 20,  // PAUSA CADA N CORREOS: El script hará una pausa después de enviar este número de correos.
  SLEEP_MS: 1000,      // DURACIÓN DE LA PAUSA en milisegundos (1000 ms = 1 segundo). Ayuda a no superar los límites de Google.
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

/**
 * 1) GENERAR CÓDIGOS FALTANTES
 * Función que revisa la columna de 'código' y rellena las celdas vacías con un código alfanumérico único.
 * Es útil si tienes una lista de estudiantes pero aún no has generado los códigos para ellos.
 */
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

/**
 * 2) ENVIAR CÓDIGOS
 * Esta es la función principal. Lee la hoja de cálculo, busca filas pendientes y envía los correos.
 * - No envía a filas marcadas como 'enviado = TRUE' (a menos que FORCE_RESEND sea true).
 * - Valida que el correo sea válido y que haya un código.
 * - Marca la fila como enviada y añade la fecha de envío después de mandar el correo.
 */
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

  // Verifica que las columnas obligatorias existan en la hoja.
  const required = {colEmail, colNombre, colCodigo, colEnviado, colFechaEnvio};
  Object.keys(required).forEach(k => {
    if (required[k] == null) throw new Error('Falta columna requerida en HEADERS: ' + k);
  });

  const last = sheet.getLastRow();
  if (last < 2) {
    Logger.log('No hay filas de datos.');
    return;
  }

  // Lee todos los datos de la hoja para procesarlos.
  const numRows = last - 1;
  const range = sheet.getRange(2, 1, numRows, sheet.getLastColumn());
  const data = range.getValues();

  const logs = _ensureLogsSheet_(ss);
  const toWriteEnviado = [];
  const toWriteFecha = [];

  let sent = 0;

  // Recorre cada fila de datos.
  for (let r = 0; r < data.length; r++) {
    try {
      const row = data[r];
      const email = String(row[colEmail] || '').trim();
      const nombre = String(row[colNombre] || '').trim();
      const codigo = String(row[colCodigo] || '').trim();
      const yaEnviado = String(row[colEnviado] || '').toLowerCase() === 'true' || row[colEnviado] === true;
      const tipo = (colTipo != null ? String(row[colTipo] || '').trim() : '') || 'de acceso';

      // --- VALIDACIONES ---
      // Si el email no es válido, se salta esta fila y lo anota en Logs.
      if (!_isValidEmail_(email)) {
        _log_(logs, 'SKIP', email, `Email inválido en fila ${r + 2}`);
        continue;
      }
      // Si no hay código, se salta esta fila.
      if (!codigo) {
        _log_(logs, 'SKIP', email, `Sin código en fila ${r + 2}`);
        continue;
      }
      // Si ya fue enviado y no se está forzando el reenvío, se salta.
      if (yaEnviado && !CONFIG.FORCE_RESEND) {
        _log_(logs, 'SKIP', email, `Marcado como enviado. Usa FORCE_RESEND=true para reenviar`);
        continue;
      }

      // --- PREPARACIÓN DEL CORREO ---
      // Elige la plantilla de asunto/cuerpo: la opcional de la fila si existe, o la por defecto de CONFIG.
      const subjectTpl = (colAsunto != null && row[colAsunto]) ? String(row[colAsunto]) : CONFIG.DEFAULT_SUBJECT;
      const bodyTpl = (colCuerpo != null && row[colCuerpo]) ? String(row[colCuerpo]) : CONFIG.DEFAULT_BODY_HTML;
      const bodyTxtTpl = CONFIG.DEFAULT_BODY_TEXT;

      // Reemplaza los placeholders {{nombre}}, {{codigo}}, etc., con los datos reales de la fila.
      const dict = { nombre, codigo, tipo, correo: email };
      const subject = _mergeTemplate_(subjectTpl, dict);
      const htmlBody = _mergeTemplate_(bodyTpl, dict);
      const textBody = _mergeTemplate_(bodyTxtTpl, dict);

      // --- ENVÍO Y REGISTRO ---
      if (!CONFIG.DRY_RUN) {
        GmailApp.sendEmail(email, subject, textBody, {
          name: CONFIG.SENDER_NAME,
          replyTo: CONFIG.REPLY_TO || undefined,
          htmlBody
        });
      }

      // Prepara los datos para marcar la fila como enviada.
      const stamp = _now_();
      toWriteEnviado.push([true]);
      toWriteFecha.push([stamp]);
      _log_(logs, CONFIG.DRY_RUN ? 'DRY_RUN' : 'SENT', email, `OK fila ${r + 2}`);
      sent++;

      // Si se ha configurado una pausa, la ejecuta.
      if (CONFIG.SLEEP_MS_EVERY && sent % CONFIG.SLEEP_MS_EVERY === 0) {
        Utilities.sleep(CONFIG.SLEEP_MS);
      }

      // Si se alcanza el límite de envíos por ejecución, se detiene.
      if (CONFIG.BATCH_LIMIT && sent >= CONFIG.BATCH_LIMIT) {
        _log_(logs, 'STOP', '', `Se alcanzó BATCH_LIMIT=${CONFIG.BATCH_LIMIT}`);
        break;
      }

    } catch (err) {
      _log_(logs, 'ERROR', String(data[r][colEmail] || ''), `Fila ${r + 2}: ${err.message}`);
      toWriteEnviado.push([data[r][colEnviado] || false]); // Mantiene el valor original si hay error
      toWriteFecha.push([data[r][colFechaEnvio] || '']);   // Mantiene el valor original si hay error
    }
  }

  // Escribe los estados 'enviado = TRUE' y las fechas de envío en la hoja, todo de una vez para ser más eficiente.
  const processedRows = toWriteEnviado.length;
  if (processedRows > 0) {
    sheet.getRange(2, colEnviado + 1, processedRows, 1).setValues(toWriteEnviado);
    sheet.getRange(2, colFechaEnvio + 1, processedRows, 1).setValues(toWriteFecha);
  }

  SpreadsheetApp.flush();
  Logger.log(`Procesadas ${processedRows} filas. Enviados: ${sent}.`);
  return { processedRows, sent };
}

/**
 * 3) VISTA PREVIA DEL PRIMER CORREO PENDIENTE
 * Busca la primera fila que aún no ha sido enviada y muestra en los registros (Logs) cómo se vería el correo.
 * Es muy útil para verificar que las plantillas y los datos se están combinando correctamente antes de un envío masivo.
 * No envía ningún correo.
 */
function vistaPreviaPrimeraPendiente() {
  const sheet = _getSheet_();
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(h => String(h).trim().toLowerCase());
  const idx = _headersIndex_(headers);

  // Busca la posición de cada columna según lo definido en CONFIG.HEADERS
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
  // Busca la primera fila donde 'enviado' no sea TRUE.
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

      // Muestra el resultado en la ventana de registros de Apps Script.
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

/**
 * 4) FUNCIONES DE UTILIDAD PARA EJECUTAR MANUALMENTE
 * Permiten cambiar rápidamente los modos de simulación (DRY_RUN) y reenvío forzado (FORCE_RESEND)
 * sin tener que editar el código en la sección CONFIG.
 * Para usarlas, selecciónalas en el editor de Apps Script y haz clic en 'Ejecutar'.
 */
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
