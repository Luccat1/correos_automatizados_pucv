/**
 * SCRIPT DE RECORDATORIO DE PAGO - PROGRAMA IDIOMAS PUCV
 * 
 * Este script envía un aviso urgente a todos los alumnos sobre el plazo de pago.
 * - Menciona fecha límite: Viernes 19 a las 12:00.
 * - Menciona opciones Webpay y presencial (DGAI + fraccionamiento).
 * - Pide solicitar nuevo código por correo si falló.
 * - Usa una columna ESTADO_RECORDATORIO para no solaparse con el envío anterior.
 */

/***** CONFIGURACIÓN *****/
const CFG_REMIND = {
    spreadsheetId: "1vZBk-Q24tHOVkmv-QGi9r3vzpbWJE787--blDe-pTVA", // ID del Sheet original
    sheetName: "Confirmaciones", // Nombre de la hoja de datos

    senderName: "Programa Idiomas PUCV",
    subject: "IMPORTANTE: Plazo de Pago y Reserva de Cupo - Programa Idiomas",
    
    // Configuración del plazo
    deadlineText: "viernes 19 de diciembre a las 12:00 hrs",
    paymentBaseUrl: "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=1521",
    
    // CC para todos los correos
    ccEmail: "idiomas@pucv.cl",
    
    // Correo para pruebas
    testEmail: "luciano.cataldo@pucv.cl" 
};

/***** COLUMNAS *****/
const HEADERS_REMIND = {
    nombre: "nombre",
    correo: "correo",
    idioma: "idioma",
    nivel: "nivel",
    
    // Nueva columna de estado exclusiva para este proceso
    statusColName: "ESTADO_RECORDATORIO" 
};

/***** FUNCIONES PRINCIPALES *****/

/**
 * ENVÍO MASIVO DE RECORDATORIOS
 */
function sendPaymentReminders() {
    const sh = getSheet_Remind_();
    const { headers, col } = getHeaderIndexes_Remind_(sh);
    const statusColIdx = ensureStatusColumn_Remind_(sh, headers, HEADERS_REMIND.statusColName);

    const data = sh.getDataRange().getValues();

    if (col.correo === -1 || col.nombre === -1) {
        Logger.log("--- ERROR DE CONFIGURACIÓN ---");
        Logger.log(`Cabeceras encontradas: ${JSON.stringify(headers)}`);
        Logger.log(`Índices detectados: nombre=${col.nombre}, correo=${col.correo}`);
        Logger.log("Error: No se encuentran columnas 'nombre' o 'correo'. Verifica que los nombres en la fila 1 coincidan.");
        return;
    }

    let processed = 0;
    const updates = [];

    // Iterar filas (saltando encabezado)
    for (let r = 1; r < data.length; r++) {
        const row = data[r];
        // Revisar ESTADO_RECORDATORIO, no el estado general
        const status = (row[statusColIdx - 1] || "").toString().toLowerCase();

        if (status.includes("enviado") || status.includes("error")) {
            updates.push([row[statusColIdx - 1]]);
            continue;
        }

        try {
            const nombre = safeCell_Remind_(row, col.nombre);
            const correo = safeCell_Remind_(row, col.correo);
            const idioma = safeCell_Remind_(row, col.idioma);
            const nivel = safeCell_Remind_(row, col.nivel);
            const cursoInfo = `${idioma} ${nivel}`;

            if (!correo || !nombre) {
                updates.push(["Error: Faltan datos"]);
                continue;
            }

            // Construir contenido
            const htmlBody = buildHtmlBody_Remind_({
                nombre, 
                curso: cursoInfo,
                paymentUrl: CFG_REMIND.paymentBaseUrl
            });
            const plainBody = buildPlainTextBody_Remind_({
                nombre, 
                curso: cursoInfo,
                paymentUrl: CFG_REMIND.paymentBaseUrl
            });

            // Enviar
            GmailApp.sendEmail(correo, CFG_REMIND.subject, plainBody, {
                htmlBody: htmlBody,
                name: CFG_REMIND.senderName,
                cc: CFG_REMIND.ccEmail
            });

            updates.push([`Recordatorio Enviado ${new Date().toLocaleString()}`]);
            processed++;

        } catch (e) {
            updates.push([`Error: ${e.message}`]);
        }
    }

    // Guardar estados
    if (updates.length > 0) {
        sh.getRange(2, statusColIdx, updates.length, 1).setValues(updates);
    }
    Logger.log(`Recordatorios enviados: ${processed}`);
}

/**
 * CORREO DE PRUEBA
 * Envía un ejemplo a luciano.cataldo@pucv.cl
 */
function sendTestReminder() {
    const activeTestUser = CFG_REMIND.testEmail;
    
    Logger.log(`Enviando prueba a ${activeTestUser}...`);

    const fakeData = {
        nombre: "Estudiante de Prueba",
        curso: "Inglés A2.1",
        paymentUrl: CFG_REMIND.paymentBaseUrl
    };

    const htmlBody = buildHtmlBody_Remind_(fakeData);
    const plainBody = buildPlainTextBody_Remind_(fakeData);
    
    GmailApp.sendEmail(activeTestUser, `[PRUEBA] ${CFG_REMIND.subject}`, plainBody, {
        htmlBody: htmlBody,
        name: CFG_REMIND.senderName,
        cc: activeTestUser // Copia a sí mismo para verificar
    });

    Logger.log("Prueba enviada.");
}

/***** HELPERS *****/

function getSheet_Remind_() {
    const ss = SpreadsheetApp.openById(CFG_REMIND.spreadsheetId);
    let sh = ss.getSheetByName(CFG_REMIND.sheetName);
    if (!sh) sh = ss.getSheets()[0];
    return sh;
}

function getHeaderIndexes_Remind_(sh) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim());
    const col = {};

    Object.keys(HEADERS_REMIND).forEach(k => {
        if (k === 'statusColName') return;
        const target = HEADERS_REMIND[k].toLowerCase();
        col[k] = headers.findIndex(h => h.includes(target));
    });
    return { headers, col };
}

function ensureStatusColumn_Remind_(sh, headersRaw, colName) {
    // headersRaw viene en minúsculas desde el helper anterior, 
    // pero necesitamos leer headers reales para ver si existe la exacta
    const actualHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    let idx = actualHeaders.findIndex(h => String(h).trim() === colName);
    
    if (idx === -1) {
        idx = actualHeaders.length;
        sh.getRange(1, idx + 1).setValue(colName);
        // Poner en negrita o color podría ser útil visualmente
        sh.getRange(1, idx + 1).setBackground("#FFF2CC"); // Color distintivo para diferenciar
    }
    return idx + 1;
}

function safeCell_Remind_(row, idx) {
    return (idx !== undefined && idx >= 0) ? (row[idx] || "").toString().trim() : "";
}

/***** PLANTILLAS *****/

function buildHtmlBody_Remind_({ nombre, curso, paymentUrl }) {
    const colorPrimary = "#d32f2f"; // Rojo urgencia
    const colorSecondary = "#003057"; // Azul Institucional
    const colorBg = "#f4f4f4";
    const firstName = nombre.split(" ")[0];

    return `
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; border: 1px solid #e0e0e0; }
        .header { background-color: ${colorSecondary}; color: white; padding: 20px; text-align: center; }
        .alert-band { background-color: ${colorPrimary}; color: white; text-align: center; padding: 10px; font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .content { padding: 30px; line-height: 1.6; }
        .box { background-color: #fff8f8; border-left: 4px solid ${colorPrimary}; padding: 15px; margin: 20px 0; }
        .btn { display: inline-block; background-color: ${colorSecondary}; color: white !important; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; }
        .footer { background-color: #f4f4f4; color: #666; font-size: 12px; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; }
    </style>
    </head>
    <body style="margin:0; padding:20px; background-color:${colorBg};">
        <div class="container">
            <div class="header">
                <h1 style="margin:0; font-size:20px;">PROGRAMA IDIOMAS PUCV</h1>
            </div>
            <div class="alert-band">
                Importante: Información de Pago
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${firstName}</strong>,</p>
                
                <p>Te escribimos en relación a tu inscripción en el curso de <strong>${curso}</strong>.</p>
                
                <p>Si ya realizaste tu pago, por favor <strong>ignora este mensaje</strong>. Si aún está pendiente, te recordamos que el plazo finaliza este:</p>
                
                <div style="text-align: center; margin: 25px 0;">
                    <strong style="color: ${colorPrimary}; font-size: 20px; text-transform: uppercase;">
                        ${CFG_REMIND.deadlineText}
                    </strong>
                </div>

                <p>Es fundamental que realices este proceso a tiempo para <strong>hacer valer tu cupo de preinscripción</strong>.</p>

                <div class="box">
                    <strong>Información sobre Códigos de Descuento:</strong><br>
                    Si tu código de descuento ha expirado o no funciona, por favor <strong>responde a este correo</strong> solicitando uno nuevo a la brevedad.
                </div>

                <h3>Opciones de Pago:</h3>
                <ul>
                    <li><strong>Webpay (Online):</strong> Puedes pagar con tarjeta de crédito o débito a través del portal de eventos.</li>
                    <li><strong>Presencial (DGAI):</strong> Si necesitas fraccionar el pago, puedes acercarte a las dependencias de la Dirección General de Asuntos Internacionales.</li>
                </ul>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="${paymentUrl}" class="btn">Ir al Portal de Pagos</a>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Programa Idiomas PUCV</strong><br>
                Dirección General de Asuntos Internacionales<br>
                Pontificia Universidad Católica de Valparaíso</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function buildPlainTextBody_Remind_({ nombre, curso, paymentUrl }) {
    return `Estimado/a ${nombre},

AVISO IMPORTANTE DE PAGO

Si ya pagaste, ignora este mensaje. Si no, te recordamos que el plazo final para confirmar tu cupo en el curso ${curso} es el:

${CFG_REMIND.deadlineText.toUpperCase()}

OPCIONES DE PAGO:
1. Webpay: Tarjeta de crédito/débito en el enlace adjunto.
2. Presencial (DGAI): Si necesitas fraccionar el pago.

Si tu código de descuento expiró, RESPONDE ESTE CORREO solicitándolo.

Enlace de pago: ${paymentUrl}

Saludos,
Programa Idiomas PUCV
    `;
}
