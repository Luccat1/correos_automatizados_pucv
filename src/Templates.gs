/**
 * Templates.gs
 * Registry of email templates for the Unified Email System PUCV.
 */

// Private registry to store templates
const _REGISTRY = {};

/**
 * Registers a template object into the system.
 * @param {Object} template
 * @param {string} template.id - Unique identifier.
 * @param {string} template.name - Display name in Spanish.
 * @param {Array.<string>} template.requiredHeaders - Array of required column names.
 * @param {Function} template.buildHtml - Function(data) => inner HTML.
 * @param {Function} template.processRow - Function(row, headers, rowIndex) => data object | null.
 */
function registerTemplate(template) {
  // Validation
  const requiredFields = ['id', 'name', 'buildHtml', 'processRow'];
  requiredFields.forEach(field => {
    if (!template[field]) {
      throw new Error(`Template missing required field: ${field}`);
    }
  });

  _REGISTRY[template.id] = template;
  console.log(`Template registered: ${template.id} (${template.name})`);
}

/**
 * Retrieves a registered template by its ID.
 * @param {string} id
 * @returns {Object|null}
 */
function getTemplate(id) {
  return _REGISTRY[id] || null;
}

/**
 * Lists all registered templates with metadata for the selector UI.
 * @returns {Array.<Object>} [{ id, name, description, requiredHeaders, configKeys }]
 */
function listTemplates() {
  return Object.keys(_REGISTRY).map(id => ({
    id: id,
    name: _REGISTRY[id].name,
    description: _REGISTRY[id].description || '',
    requiredHeaders: _REGISTRY[id].requiredHeaders || [],
    configKeys: _REGISTRY[id].configKeys || []
  }));
}

// --- TEMPLATE DEFINITIONS ---

/**
 * Certificate Template
 * Handles Drive sharing and certificate link delivery.
 */
const certificateTemplate = {
  id: 'certificate',
  name: 'Envío de Certificados',
  description: 'Envío de certificados con enlace a Google Drive y CC institucional.',
  requiredHeaders: ['nombre', 'correo', 'enlace'],
  configKeys: ['program_name'],
  senderName: 'PUCV',
  statusColumn: 'Estado',
  headerTitle: 'ENVÍO DE CERTIFICADOS',
  footerLines: ['Pontificia Universidad Católica de Valparaíso'],

  /**
   * Processes a row for the certificate template.
   * @param {Array} row - Row data.
   * @param {Object} headers - Header mapping.
   * @param {number} rowIndex - 1-based row index.
   * @returns {Object|null}
   */
  processRow: function(row, headers, rowIndex, extraData) {
    const nombre = requiredCell(row, headers['nombre'], 'Nombre', rowIndex);
    const apellido = safeCell(row, headers['apellido']);
    const correo = requiredCell(row, headers['correo'], 'Correo', rowIndex);
    const enlace = requiredCell(row, headers['enlace'], 'Enlace', rowIndex);

    // Extract file ID and share
    const fileId = extractFileId(enlace);
    if (fileId) {
      shareFileAsViewer(fileId, correo);
    }

    return {
      nombre: nombre,
      apellido: apellido,
      correo: correo,
      certificateUrl: enlace,
      firstName: extractFirstName(nombre, "estudiante"),
      programName: (extraData && extraData.configExtras && extraData.configExtras.program_name) || this.defaults?.programName
    };
  },

  /**
   * Builds the HTML content for the certificate email.
   * @param {Object} data
   * @returns {string}
   */
  buildHtml: function(data) {
    const programName = data.programName || "un programa académico";
    const greeting = data.nombre ? `Estimado/a <strong>${data.firstName}</strong>:` : "Estimado/a estudiante:";
    
    let content = `<p>${greeting}</p>`;
    content += `<p>Nos es grato informarte que tu certificado de finalización de <strong>${programName}</strong> ya se encuentra disponible.</p>`;
    content += buildButton("Ver Certificado", data.certificateUrl);
    content += buildInfoBox("Para una mejor visualización, te recomendamos abrir el enlace desde un computador. Si tienes problemas para acceder, asegúrate de estar usando el correo electrónico registrado.");
    content += `<p>Atentamente,<br>Equipo PUCV</p>`;

    return content;
  }
};

/**
 * Confirmation Template
 * Handles course opening confirmations with dynamic CCs and discount codes.
 */
const confirmationTemplate = {
  id: 'confirmation',
  name: 'Confirmación de Apertura',
  description: 'Confirmación de inicio de curso con detalles de pago y descuentos.',
  requiredHeaders: ['nombre', 'correo', 'idioma', 'nivel', 'horario'],
  configKeys: ['payment_url', 'payment_deadline', 'discount_code'],
  senderName: 'Programa Idiomas PUCV',
  statusColumn: 'Estado',
  headerTitle: 'CONFIRMACIÓN DE APERTURA DE CURSO',
  footerLines: ['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV'],
  
  // Default configurations that can be overridden by data
  defaults: {
    paymentUrl: "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=1521",
    paymentDeadline: "el domingo a las 23:59 hrs",
    ccMapping: {
      "alemán": "alina.neumeyer@pucv.cl, jana.strohbach@pucv.cl, idiomas@pucv.cl",
      "inglés": "idiomas@pucv.cl",
      "default": "idiomas@pucv.cl"
    }
  },

  processRow: function(row, headers, rowIndex, extraData) {
    const nombre = requiredCell(row, headers['nombre'], 'Nombre', rowIndex);
    const correo = requiredCell(row, headers['correo'], 'Correo', rowIndex);
    const idioma = requiredCell(row, headers['idioma'], 'Idioma', rowIndex);
    const nivel = requiredCell(row, headers['nivel'], 'Nivel', rowIndex);
    const horario = requiredCell(row, headers['horario'], 'Horario', rowIndex);
    const plazo = safeCell(row, headers['plazo']);
    const esContinuacion = safeCell(row, headers['es_continuacion']);

    // Determine CC based on language
    const langKey = idioma.toLowerCase();
    let cc = this.defaults.ccMapping['default'];
    for (const key in this.defaults.ccMapping) {
      if (langKey.includes(key)) {
        cc = this.defaults.ccMapping[key];
        break;
      }
    }

    const extras = extraData ? extraData.configExtras : {};

    return {
      nombre, correo, idioma, nivel, horario,
      plazo: plazo || extras.payment_deadline || this.defaults.paymentDeadline,
      esContinuacion,
      firstName: extractFirstName(nombre, "estudiante"),
      cc,
      paymentUrl: extras.payment_url || this.defaults.paymentUrl,
      discountCode: extras.discount_code || null
    };
  },

  buildHtml: function(data) {
    const greeting = data.nombre ? `Estimado/a <strong>${data.firstName}</strong>:` : "Estimado/a estudiante:";
    let content = `<p>${greeting}</p>`;
    content += `<p>Te informamos con gusto la <strong>apertura del curso</strong> en el cual te has preinscrito:</p>`;
    
    const courseInfo = `<strong>Idioma:</strong> ${data.idioma}<br><strong>Nivel:</strong> ${data.nivel}<br><strong>Horario:</strong> ${data.horario}`;
    content += buildInfoBox(courseInfo);

    content += `<p>Para asegurar tu cupo, te solicitamos realizar el pago correspondiente antes de <strong>${data.plazo}</strong>.</p>`;
    
    if (data.discountCode) {
      content += buildWarningBox(`<strong>Código de Descuento:</strong> ${data.discountCode}<br>Por favor, ingrésalo al momento de pagar para aplicar tu tarifa preferencial.`);
    }

    content += buildButton("Ir al Portal de Pagos", data.paymentUrl);
    content += `<p>Si tienes dificultades con el proceso de pago, por favor responde a este correo adjuntando una captura de pantalla del error.</p>`;
    content += `<p>¡Te esperamos!</p>`;

    return content;
  }
};

/**
 * Payment Reminder Template
 * Urgent notice about payment deadlines.
 */
const paymentReminderTemplate = {
  id: 'payment_reminder',
  name: 'Recordatorio de Pago',
  description: 'Recordatorio urgente de plazo de pago con estilo destacado.',
  requiredHeaders: ['nombre', 'correo', 'idioma', 'nivel'],
  configKeys: ['deadline_text', 'payment_url'],
  senderName: 'Programa Idiomas PUCV',
  statusColumn: 'Estado Recordatorio',
  headerTitle: 'RECORDATORIO DE PAGO',
  footerLines: ['Programa Idiomas PUCV', 'PUCV'],
  
  defaults: {
    deadlineText: "viernes a las 12:00 hrs",
    paymentUrl: "https://vaf.ucv.cl:8446/PortalEventos/evento.jsp?id=1521"
  },

  processRow: function(row, headers, rowIndex, extraData) {
    const nombre = requiredCell(row, headers['nombre'], 'Nombre', rowIndex);
    const correo = requiredCell(row, headers['correo'], 'Correo', rowIndex);
    const idioma = safeCell(row, headers['idioma']);
    const nivel = safeCell(row, headers['nivel']);

    const extras = extraData ? extraData.configExtras : {};

    return {
      nombre, correo, idioma, nivel,
      firstName: extractFirstName(nombre, "estudiante"),
      deadlineText: extras.deadline_text || this.defaults.deadlineText,
      paymentUrl: extras.payment_url || this.defaults.paymentUrl
    };
  },

  buildHtml: function(data) {
    const deadline = data.deadlineText;
    const url = data.paymentUrl;
    const greeting = data.nombre ? `Hola <strong>${data.firstName}</strong>:` : "Hola:";

    let content = `<p>${greeting}</p>`;
    content += `<p>Te contactamos de manera <strong>urgente</strong> para recordarte que el plazo para la reserva de tu cupo en los cursos de idiomas vence impostergablemente este <strong>${deadline}</strong>.</p>`;
    
    content += buildButton("Pagar con Webpay", url);

    content += buildWarningBox(`<strong>Importante:</strong> Si el pago no se registra antes del plazo señalado, el sistema liberará automáticamente tu cupo para los estudiantes en lista de espera.`);

    content += `<p>Si ya realizaste el pago, por favor desestima este mensaje. En caso de dudas, puedes contactarnos directamente.</p>`;
    content += `<p>Saludos cordiales,<br>Programa Idiomas PUCV</p>`;

    return {
      content: content,
      alertBand: `🚨 ¡ÚLTIMO PLAZO! Pago vence el ${deadline}`
    };
  }
};

/**
 * Placement Test Template
 * Delivery of portal credentials and instructions.
 */
const placementTestTemplate = {
  id: 'placement_test',
  name: 'Placement Test',
  description: 'Entrega de credenciales para plataforma de test de nivel.',
  requiredHeaders: ['nombre', 'correo', 'user id', 'password'],
  configKeys: ['platform_url', 'deadline_text'],
  senderName: 'Programa Idiomas PUCV',
  statusColumn: 'Reminder Status',
  headerTitle: 'PLACEMENT TEST - PROGRAMA IDIOMAS',
  footerLines: ['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV'],
  
  defaults: {
    platformUrl: "https://www.metritests.com/metrica/",
    deadlineText: ""
  },

  processRow: function(row, headers, rowIndex, extraData) {
    const nombre = requiredCell(row, headers['nombre'], 'Nombre', rowIndex);
    const correo = requiredCell(row, headers['correo'], 'Correo', rowIndex);
    const userId = requiredCell(row, headers['user id'], 'User ID', rowIndex);
    const password = requiredCell(row, headers['password'], 'Password', rowIndex);
    const institutionId = safeCell(row, headers['institutional id']);

    const extras = extraData ? extraData.configExtras : {};

    return {
      nombre, correo, userId, password, institutionId,
      firstName: extractFirstName(nombre, "estudiante"),
      platformUrl: extras.platform_url || this.defaults.platformUrl,
      deadlineText: extras.deadline_text || this.defaults.deadlineText
    };
  },

  buildHtml: function(data) {
    const greeting = data.nombre ? `Estimado/a <strong>${data.firstName}</strong>:` : "Estimado/a estudiante:";
    let content = `<p>${greeting}</p>`;
    content += `<p>Te hacemos llegar las credenciales de acceso para rendir tu <strong>Placement Test</strong> del Programa de Idiomas PUCV.</p>`;
    
    let credentials = `<strong>Plataforma:</strong> <a href="${data.platformUrl}">${data.platformUrl}</a><br>`;
    credentials += `<strong>User ID:</strong> ${data.userId}<br>`;
    credentials += `<strong>Password:</strong> ${data.password}`;
    if (data.institutionId) {
      credentials += `<br><strong>Institution ID:</strong> ${data.institutionId}`;
    }
    
    content += buildInfoBox(credentials);

    content += `<p><strong>Pasos para rendir el test:</strong></p>`;
    content += `<ol>
                  <li>Ingresa al enlace de la plataforma indicado arriba.</li>
                  <li>Inicia sesión con tu User ID y Password.</li>
                  <li>Sigue las instrucciones en pantalla para completar la evaluación.</li>
                </ol>`;

    content += buildButton("Acceder a la Plataforma", data.platformUrl);

    if (data.deadlineText) {
      content += buildWarningBox(`Recuerda que tienes hasta el día <strong>${data.deadlineText}</strong> para completar esta evaluación.`);
    }

    content += `<p>Si tienes problemas técnicos durante el test, por favor contáctanos a la brevedad.</p>`;
    content += `<p>Atentamente,<br>Programa Idiomas PUCV</p>`;

    return content;
  }
};

/**
 * Code Delivery Template
 * Prominent display of unique codes (books, tests, etc.).
 */
const codeDeliveryTemplate = {
  id: 'code_delivery',
  name: 'Envío de Códigos',
  description: 'Entrega de códigos de acceso a materiales o plataformas.',
  requiredHeaders: ['nombre', 'correo', 'codigo'],
  configKeys: ['code_type'],
  senderName: 'Centro de Idiomas PUCV',
  statusColumn: 'enviado',
  headerTitle: 'ENTREGA DE CÓDIGO',
  footerLines: ['Centro de Idiomas PUCV', 'PUCV'],

  processRow: function(row, headers, rowIndex, extraData) {
    const nombre = requiredCell(row, headers['nombre'], 'Nombre', rowIndex);
    const correo = requiredCell(row, headers['correo'], 'Correo', rowIndex);
    const codigo = requiredCell(row, headers['codigo'], 'Código', rowIndex);
    
    const extras = extraData ? extraData.configExtras : {};
    const tipo = safeCell(row, headers['tipo_opcional']) || extras.code_type || "de acceso";

    return {
      nombre, correo, codigo, tipo,
      firstName: extractFirstName(nombre, "estudiante")
    };
  },

  buildHtml: function(data) {
    const greeting = data.nombre ? `Hola <strong>${data.firstName}</strong>:` : "Hola:";
    let content = `<p>${greeting}</p>`;
    content += `<p>A continuación te hacemos entrega de tu código <strong>${data.tipo}</strong> solicitado:</p>`;
    
    content += `
      <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f4f4f4; border: 2px dashed ${COLORS.primary}; border-radius: 8px;">
        <span style="font-size: 24px; font-weight: bold; font-family: monospace; color: ${COLORS.primary}; letter-spacing: 2px;">${data.codigo}</span>
      </div>
    `;

    content += buildInfoBox("Este código es para uso personal. Te recomendamos copiarlo y pegarlo directamente en la plataforma correspondiente para evitar errores de transcripción.");
    
    content += `<p>Si el código presenta algún error al ser activado, por favor responde a este correo adjuntando una foto del problema.</p>`;
    content += `<p>Saludos,<br>Centro de Idiomas PUCV</p>`;

    return content;
  }
};

/**
 * Report Delivery Template
 * Complex template with cross-sheet lookup and alias sending.
 */
const reportDeliveryTemplate = {
  id: 'report_delivery',
  name: 'Entrega de Informes',
  description: 'Envío de informes de evaluación docente compartidos por Drive.',
  requiredHeaders: [], // Special case: uses fixed column indexes from Informe script
  configKeys: ['directory_sheet_name'],
  senderName: 'Unidad de Evaluación Docente CELE',
  senderAlias: 'cele.dgai@pucv.cl',
  statusColumn: 'Estado',
  headerTitle: 'RESULTADOS EVALUACIÓN DOCENTE',
  footerLines: ['Unidad de Evaluación Docente', 'Centro de Estudios y Enseñanza de Lenguas Extranjeras', 'PUCV'],

  /**
   * Special helper for professor lookup.
   * @param {string} professorName
   * @param {Array.<Array>} directoryRows
   * @returns {Object|null}
   */
  directoryLookup: function(professorName, directoryRows) {
    if (!professorName || !directoryRows) return null;
    const searchName = professorName.toLowerCase().trim();
    for (const dRow of directoryRows) {
      const dName = String(dRow[0] || "").toLowerCase().trim();
      if (dName === searchName) {
        return {
          email: String(dRow[1] || "").trim(),
          cc: String(dRow[2] || "").trim()
        };
      }
    }
    return null;
  },

  processRow: function(row, headers, rowIndex, extraData) {
    // Indexes based on Informe script (0-based)
    // COL_LOG_PROFESSOR: 1, COL_LOG_COURSE: 2, COL_LOG_DOC_ID: 3, COL_LOG_URL: 4
    const professorName = safeCell(row, 1);
    const course = safeCell(row, 2);
    const docId = safeCell(row, 3);
    const reportUrl = safeCell(row, 4);

    if (!professorName || !docId) return null;

    // Lookup email in directory (passed via extraData)
    const directoryData = extraData ? extraData.directoryRows : null;
    const lookup = this.directoryLookup(professorName, directoryData);
    
    if (!lookup || !lookup.email) {
      console.warn(`No se encontró correo para el profesor: ${professorName}`);
      return null;
    }

    // Share report
    shareFileAsViewer(docId, lookup.email);

    return {
      to: lookup.email,
      cc: lookup.cc,
      professorName,
      course,
      reportUrl,
      firstName: extractFirstName(professorName) // No fallback needed for professor
    };
  },

  buildHtml: function(data) {
    let content = `<p>Estimado/a docente <strong>${data.professorName}</strong>:</p>`;
    content += `<p>Junto con saludarte cordialmente, la Unidad de Evaluación Docente hace entrega de los resultados de la encuesta de percepción estudiantil para el siguiente curso:</p>`;
    
    content += buildInfoBox(`<strong>Curso:</strong> ${data.course}`);

    content += `<p>Puedes acceder al informe detallado haciendo clic en el siguiente botón:</p>`;
    content += buildButton("Ver Informe de Evaluación", data.reportUrl);

    content += `<p>Este informe es confidencial y tiene como objetivo apoyar la mejora continua de los procesos de enseñanza y aprendizaje.</p>`;
    content += `<p>Atentamente,<br>Unidad de Evaluación Docente CELE</p>`;

    return content;
  }
};

/**
 * Survey Template
 * Student perception survey delivery with certificate warning.
 */
const surveyTemplate = {
  id: 'survey',
  name: 'Encuesta de Percepción',
  description: 'Solicitud de feedback sobre cursos con aviso de certificación.',
  requiredHeaders: ['correo'],
  configKeys: ['survey_url', 'program_name', 'extra_note'],
  senderName: 'PUCV',
  statusColumn: 'Estado Encuesta',
  headerTitle: 'ENCUESTA DE PERCEPCIÓN',
  footerLines: ['Pontificia Universidad Católica de Valparaíso'],
  
  defaults: {
    surveyUrl: "https://survey.pucv.cl/example",
    programName: "tu curso actual"
  },

  processRow: function(row, headers, rowIndex, extraData) {
    const nombre = headers['nombre'] !== undefined ? safeCell(row, headers['nombre']) : '';
    const correo = requiredCell(row, headers['correo'], 'Correo', rowIndex);

    const extras = extraData ? extraData.configExtras : {};

    return {
      nombre, correo,
      firstName: extractFirstName(nombre, "estudiante"),
      surveyUrl: extras.survey_url || this.defaults.surveyUrl,
      programName: extras.program_name || this.defaults.programName,
      extraNote: extras.extra_note || null
    };
  },

  buildHtml: function(data) {
    const url = data.surveyUrl;
    const program = data.programName;
    const greeting = data.nombre ? `Estimado/a <strong>${data.firstName}</strong>:` : "Estimado/a estudiante:";

    let content = `<p>${greeting}</p>`;
    content += `<p>Para nosotros es fundamental conocer tu opinión sobre el desarrollo y calidad de <strong>${program}</strong>.</p>`;
    content += `<p>Te invitamos a completar la siguiente encuesta de percepción, la cual no te tomará más de 5 minutos:</p>`;
    
    content += buildButton("Completar Encuesta", url);

    content += buildWarningBox(`<strong>Nota importante:</strong> Recuerda que completar esta encuesta es un requisito para el envío de tus certificados de aprobación.`);

    if (data.extraNote) {
      content += buildInfoBox(data.extraNote);
    }
    
    content += `<p>Agradecemos de antemano tu tiempo y colaboración.</p>`;
    content += `<p>Atentamente,<br>Dirección General de Asuntos Internacionales PUCV</p>`;

    return {
      content: content,
      extraNote: data.extraNote // Passed to buildEmailLayout via Main.gs
    };
  }
};

// Register the templates
registerTemplate(certificateTemplate);
registerTemplate(confirmationTemplate);
registerTemplate(paymentReminderTemplate);
registerTemplate(placementTestTemplate);
registerTemplate(codeDeliveryTemplate);
registerTemplate(reportDeliveryTemplate);
registerTemplate(surveyTemplate);
