/**
 * SCRIPT DE ENVÍO DE CERTIFICADOS - DIPLOMADO LENGUA Y CULTURA ITALIANA
 * 
 * Funcionalidades:
 * 1. Comparte el documento (Certificado) en Drive con el destinatario.
 * 2. Envía un correo con estilo institucional adjuntando el enlace.
 * 3. Maneja CCs específicos según el dominio del correo del destinatario.
 * 4. Modo de prueba para verificar sin enviar a destinatarios reales.
 */

/***** CONFIGURACIÓN *****/
const CFG_CERT = {
    spreadsheetId: "1vZBk-Q24tHOVkmv-QGi9r3vzpbWJE787--blDe-pTVA", // ¡REEMPLAZAR POR EL ID REAL SI ES DIFERENTE!
    sheetName: "Hoja 1", // Ajustar al nombre real de la hoja
    
    senderName: "Diplomado en Lengua y Cultura Italiana PUCV",
    subject: "Certificado de Finalización - Diplomado en Lengua y Cultura Italiana",

    // Correos de autoridades / CC
    ccGeneral: "esperanza.godoy@pucv.cl",
    ccScuola: "rinaldo.merlone@scuolaitalianadelloro.cl",

    // Correo de prueba
    testEmail: "luciano.cataldo@pucv.cl"
};

/***** MAPEO DE COLUMNAS *****/
// Ajustar estos índices si cambian las columnas (Base 0 para arrays interna, pero referencias visuales son A, B, C...)
const COL_CERT = {
    rut: "RUT",
    nombre: "NOMBRE",
    apellido: "APELLIDO",
    segundoApellido: "SEGUNDO APELLIDO",
    email: "CORREO ELECTRÓNICO",
    link: "CERTIFICADO",
    estado: "ESTADO" // Columna para status (se crea si no existe)
};

/***** FUNCIONES PRINCIPALES *****/

/**
 * Función Principal: Envía los certificados reales.
 * Se debe ejecutar manualmente desde el editor o mediante un botón/menú.
 */
function enviarCertificadosDiplomado() {
    const sh = getSheet_Cert_();
    const { headers, idx } = getHeaderIndexes_Cert_(sh);
    const statusColIdx = ensureStatusColumn_Cert_(sh, headers, COL_CERT.estado);

    const data = sh.getDataRange().getValues();
    
    // Validar cabeceras mínimas
    if (idx.email === undefined || idx.link === undefined) {
        Logger.log("--- ERROR DE CONFIGURACIÓN ---");
        Logger.log(`Hoja leída: "${sh.getName()}"`);
        Logger.log(`Cabeceras encontradas en fila 1: ${JSON.stringify(headers)}`);
        Logger.log("Esperaba encontrar: 'CORREO ELECTRÓNICO' y 'CERTIFICADO'");
        Logger.log("Por favor verifica que:");
        Logger.log("1. El nombre de la hoja sea correcto (Config: '" + CFG_CERT.sheetName + "')");
        Logger.log("2. Las cabeceras estén en la fila 1.");
        Logger.log("3. Los nombres sean exactos (sin espacios extra al principio/final).");
        return;
    }

    let processed = 0;
    const updates = [];

    // Empezamos desde la fila 1 (la 0 es cabecera)
    for (let r = 1; r < data.length; r++) {
        const row = data[r];
        const currentStatus = (row[statusColIdx - 1] || "").toString().toLowerCase();

        // Saltamos si ya fue enviado
        if (currentStatus.includes("enviado") || currentStatus.includes("error")) {
            updates.push([row[statusColIdx - 1]]); // Mantiene valor actual
            continue;
        }

        try {
            // Extracción de datos
            const nombre = safeCell_Cert_(row, idx.nombre);
            const apellido = safeCell_Cert_(row, idx.apellido);
            const email = safeCell_Cert_(row, idx.email);
            const link = safeCell_Cert_(row, idx.link);
            const fullName = `${nombre} ${apellido}`.trim();

            if (!email || !link) {
                updates.push(["Error: Falta correo o link"]);
                continue;
            }

            // 1. Compartir archivo en Drive
            const fileId = extractFileId_Cert_(link);
            if (fileId) {
                shareFileWithUser_Cert_(fileId, email);
            } else {
                throw new Error("Link de certificado inválido");
            }

            // 2. Determinar CCs
            const userCc = determineCCs_Cert_(email);

            // 3. Generar cuerpo del correo
            const htmlBody = buildHtmlBody_Cert_({
                nombre: fullName,
                link: link
            });
            const plainBody = buildPlainTextBody_Cert_({
                nombre: fullName,
                link: link
            });

            // 4. Enviar Correo
            GmailApp.sendEmail(email, CFG_CERT.subject, plainBody, {
                htmlBody: htmlBody,
                name: CFG_CERT.senderName,
                cc: userCc
            });

            updates.push([`Enviado ${new Date().toLocaleString()}`]);
            processed++;

        } catch (e) {
            Logger.log(`Error en fila ${r+1}: ${e.message}`);
            updates.push([`Error: ${e.message}`]);
        }
    }

    // Actualizar estados en bloque
    if (updates.length > 0) {
        sh.getRange(2, statusColIdx, updates.length, 1).setValues(updates);
    }
    Logger.log(`Proceso finalizado. Correos enviados: ${processed}`);
}

/**
 * Función de Prueba:
 * Envía un solo correo a luciano.cataldo@pucv.cl usando los datos de la primera fila pendiente (o ficticios).
 * Los CCs también se redirigen a luciano.cataldo@pucv.cl.
 */
function enviarPruebaDiplomado() {
    const sh = getSheet_Cert_();
    const { headers, idx } = getHeaderIndexes_Cert_(sh);
    const data = sh.getDataRange().getValues();

    // Buscar primera fila válida para usar de ejemplo
    let sampleRow = null;
    if (data.length > 1) {
        sampleRow = data[1]; // Usamos la primera fila de datos
    } else {
        Logger.log("No hay datos en la hoja para hacer prueba.");
        return;
    }

    const nombre = safeCell_Cert_(sampleRow, idx.nombre);
    const apellido = safeCell_Cert_(sampleRow, idx.apellido);
    const link = safeCell_Cert_(sampleRow, idx.link);
    const fullName = `${nombre} ${apellido}`.trim();
    
    // Datos forzados de prueba
    const testDestinatorio = CFG_CERT.testEmail;
    const testCc = CFG_CERT.testEmail; // "con copia no a autoridades sino que a luciano"

    Logger.log(`Iniciando prueba...`);
    Logger.log(`Datos extraídos - Nombre: ${fullName}, Link: ${link}`);
    
    // Construir contenido
    const htmlBody = buildHtmlBody_Cert_({
        nombre: fullName,
        link: link
    });
    const plainBody = buildPlainTextBody_Cert_({
        nombre: fullName,
        link: link
    });

    // Enviar
    GmailApp.sendEmail(testDestinatorio, `[PRUEBA] ${CFG_CERT.subject}`, plainBody, {
        htmlBody: htmlBody,
        name: `${CFG_CERT.senderName} (Test)`,
        cc: testCc
    });

    Logger.log(`Correo de prueba enviado a ${testDestinatorio} con copia a ${testCc}`);
}

/***** LÓGICA DE NEGOCIO Y HELPERS *****/

function determineCCs_Cert_(email) {
    let ccs = [CFG_CERT.ccGeneral];
    
    if (email.trim().toLowerCase().endsWith("@scuolaitalianadelloro.cl")) {
        ccs.push(CFG_CERT.ccScuola);
    }
    
    return ccs.join(",");
}

function extractFileId_Cert_(url) {
    // Intenta extraer ID de patrones comunes de Drive
    // 1. Path format: /d/FILE_ID
    // 2. Query param format: id=FILE_ID
    
    let match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];

    match = url.match(/id=([a-zA-Z0-9-_]+)/);
    if (match) return match[1];

    return null;
}

function shareFileWithUser_Cert_(fileId, email) {
    try {
        const file = DriveApp.getFileById(fileId);
        // Verificar si ya tiene permiso para evitar error o redundancia? 
        // DriveApp.addViewer maneja esto silenciosamente usualmente, pero mejor envolver en try.
        file.addViewer(email);
    } catch (e) {
        console.warn(`No se pudo compartir archivo ${fileId} con ${email}: ${e.message}`);
        // No bloqueamos el envío, pero lo logueamos. Podría ser que el script no tenga permiso de Edit en el archivo.
        throw new Error("Fallo al compartir Drive: " + e.message);
    }
}

/***** MANEJO DE HOJA *****/

function getSheet_Cert_() {
    const ss = SpreadsheetApp.openById(CFG_CERT.spreadsheetId);
    let sh = ss.getSheetByName(CFG_CERT.sheetName);
    if (!sh) sh = ss.getSheets()[0]; // Fallback a la primera hoja
    return sh;
}

function getHeaderIndexes_Cert_(sh) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(h => h.toString().toUpperCase().trim());
    const idx = {};
    
    // Mapeo dinámico
    for (const [key, colName] of Object.entries(COL_CERT)) {
        const i = headers.findIndex(h => h === colName.toUpperCase());
        if (i >= 0) idx[key] = i;
    }
    
    return { headers, idx };
}

function ensureStatusColumn_Cert_(sh, headers, colName) {
    let idx = headers.findIndex(h => h === colName.toUpperCase());
    if (idx === -1) {
        idx = headers.length;
        sh.getRange(1, idx + 1).setValue(colName);
    }
    return idx + 1; // 1-based
}

function safeCell_Cert_(row, idx) {
    return (idx !== undefined && idx >= 0) ? (row[idx] || "").toString().trim() : "";
}

/***** PLANTILLA HTML *****/

function buildHtmlBody_Cert_({ nombre, link }) {
    const colorPrimary = "#003057"; // Azul PUCV
    const colorBg = "#f4f4f4";

    return `
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; border: 1px solid #e0e0e0; }
        .header { background-color: ${colorPrimary}; color: white; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 30px; line-height: 1.6; }
        .btn { display: inline-block; background-color: ${colorPrimary}; color: white !important; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; margin-top: 20px; }
        .footer { background-color: #f4f4f4; color: #666; font-size: 12px; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0; }
    </style>
    </head>
    <body style="margin:0; padding:20px; background-color:${colorBg};">
        <div class="container">
            <div class="header">
                <h1>Pontificia Universidad Católica de Valparaíso</h1>
            </div>
            
            <div class="content">
                <p>Estimado/a <strong>${nombre}</strong>,</p>
                
                <p>Junto con saludar, esperamos que te encuentres muy bien.</p>
                
                <p>A través de la presente, hacemos entrega digital de tu <strong>Certificado del Diplomado en Lengua y Cultura Italiana</strong>, realizado por la Dirección General de Asuntos Internacionales.</p>
                
                <p>Puedes acceder y descargar tu documento en el siguiente enlace:</p>
                
                <div style="text-align: center;">
                    <a href="${link}" class="btn">Ver Certificado</a>
                </div>

                <p style="margin-top: 30px; font-size: 14px;">
                    Felicitaciones por este logro académico.
                </p>
            </div>
            
            <div class="footer">
                <p><strong>Dirección General de Asuntos Internacionales</strong><br>
                Pontificia Universidad Católica de Valparaíso</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function buildPlainTextBody_Cert_({ nombre, link }) {
    return `Estimado/a ${nombre},

Junto con saludar, hacemos entrega de tu Certificado del Diplomado en Lengua y Cultura Italiana.

Puedes acceder a él aquí: ${link}

Felicitaciones por este logro.

Dirección General de Asuntos Internacionales
Pontificia Universidad Católica de Valparaíso
    `;
}
