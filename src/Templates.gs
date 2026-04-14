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
      plazo: (plazo ? formatDateEs(plazo) : null) || extras.payment_deadline || this.defaults.paymentDeadline,
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
  description: 'Entrega de credenciales dinámicas para plataforma de test de nivel.',
  requiredHeaders: ['nombre', 'correo'],
  configKeys: ['platform_url', 'deadline_text', 'program_name', 'campos_credenciales'],
  senderName: 'PUCV',
  statusColumn: 'Reminder Status',
  headerTitle: 'CREDENCIALES PLACEMENT TEST',
  footerLines: ['Pontificia Universidad Católica de Valparaíso'],
  
  defaults: {
    platformUrl: "https://www.metritests.com/metrica/",
    deadlineText: "",
    programName: "Programa Idiomas PUCV",
    camposCredenciales: "User ID, Password"
  },

  processRow: function(row, headers, rowIndex, extraData) {
    const nombre = requiredCell(row, headers['nombre'], 'Nombre', rowIndex);
    const correo = requiredCell(row, headers['correo'], 'Correo', rowIndex);

    const extras = extraData ? extraData.configExtras : {};
    
    // Configurar qué campos vamos a extraer como credenciales (separados por coma)
    const camposColsStr = extras.campos_credenciales || this.defaults.camposCredenciales;
    const credCols = camposColsStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    const credentialsList = [];
    for (const col of credCols) {
      const colKey = col.toLowerCase();
      if (headers[colKey] !== undefined) {
        const val = requiredCell(row, headers[colKey], col, rowIndex);
        credentialsList.push({ label: col, value: val });
      } else {
        throw new Error(`Fila ${rowIndex}: En la hoja de datos no existe la columna requerida "${col}" (definida en campos_credenciales).`);
      }
    }

    return {
      nombre, correo, credentialsList,
      firstName: extractFirstName(nombre, "estudiante"),
      platformUrl: extras.platform_url || this.defaults.platformUrl,
      deadlineText: extras.deadline_text || this.defaults.deadlineText,
      programName: extras.program_name || this.defaults.programName
    };
  },

  buildHtml: function(data) {
    const greeting = data.nombre ? `Estimado/a <strong>${data.firstName}</strong>:` : "Estimado/a estudiante:";
    let content = `<p>${greeting}</p>`;
    content += `<p>Te hacemos llegar las credenciales de acceso para rendir tu <strong>Placement Test</strong> de <strong>${data.programName}</strong>.</p>`;
    
    let credentialsHtml = `<strong>Plataforma:</strong> <a href="${data.platformUrl}">${data.platformUrl}</a><br>`;
    
    data.credentialsList.forEach(cred => {
      credentialsHtml += `<strong>${cred.label}:</strong> ${cred.value}<br>`;
    });
    
    content += buildInfoBox(credentialsHtml);

    content += `<p><strong>Pasos para rendir el test:</strong></p>`;
    content += `<ol>
                  <li>Ingresa al enlace de la plataforma indicado arriba.</li>
                  <li>Inicia sesión con tus credenciales.</li>
                  <li>Sigue las instrucciones en pantalla para completar la evaluación.</li>
                </ol>`;

    content += buildButton("Acceder a la Plataforma", data.platformUrl);

    if (data.deadlineText) {
      content += buildWarningBox(`Recuerda que tienes hasta el día <strong>${data.deadlineText}</strong> para completar esta evaluación.`);
    }

    content += `<p>Si tienes problemas técnicos durante el test, por favor contáctanos a la brevedad.</p>`;
    content += `<p>Atentamente,<br>${data.programName}</p>`;

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
 * Student perception survey delivery. Survey type and certificate requirement are configurable.
 *
 * configKeys:
 *   survey_url              — URL of the survey (required in practice)
 *   program_name            — program/course name shown in the body
 *   survey_type             — label shown in the email: "inicio", "intermedia", "finalización", "otro"
 *                             Leave blank to omit the type label.
 *   deadline                — optional deadline date shown as an info box (e.g. "viernes 18 de abril")
 *   require_for_certificate — set to "si" or "true" to show the certificate-requirement warning.
 *                             Omit or set to anything else to hide it.
 *   extra_note              — optional free-text note shown in an info box
 */
const surveyTemplate = {
  id: 'survey',
  name: 'Encuesta de Percepción',
  description: 'Solicitud de feedback sobre cursos. Tipo de encuesta, fecha límite y aviso de certificación configurables.',
  requiredHeaders: ['nombre', 'correo'],
  configKeys: ['survey_url', 'program_name', 'survey_type', 'deadline', 'require_for_certificate', 'extra_note'],
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
    const requireRaw = (extras.require_for_certificate || '').trim().toLowerCase();

    return {
      nombre, correo,
      firstName: extractFirstName(nombre, "estudiante"),
      surveyUrl: extras.survey_url || this.defaults.surveyUrl,
      programName: extras.program_name || this.defaults.programName,
      surveyType: extras.survey_type ? extras.survey_type.trim() : null,
      deadline: extras.deadline ? extras.deadline.trim() : null,
      requireForCertificate: requireRaw === 'si' || requireRaw === 'true',
      extraNote: extras.extra_note || null
    };
  },

  buildHtml: function(data) {
    const url = data.surveyUrl;
    const program = data.programName;
    const greeting = data.nombre ? `Estimado/a <strong>${data.firstName}</strong>:` : "Estimado/a estudiante:";

    // Normalize survey type: strip leading "encuesta" to avoid "encuesta de percepción de Encuesta de X"
    const rawType = data.surveyType || '';
    const cleanType = rawType.replace(/^encuesta\s+(de\s+)?/i, '').trim();
    const typeContext = cleanType ? ` de <strong>${cleanType}</strong>` : '';

    let content = `<p>${greeting}</p>`;
    content += `<p>Tu opinión sobre <strong>${program}</strong> es muy importante para nosotros.</p>`;
    content += `<p>Te pedimos completar el siguiente formulario de percepción${typeContext}:</p>`;

    content += buildButton("Responder formulario", url);

    if (data.deadline) {
      content += buildInfoBox(`Te pedimos responder antes del <strong>${data.deadline}</strong>.`);
    }

    if (data.requireForCertificate) {
      content += buildWarningBox(`<strong>Nota importante:</strong> Recuerda que completar este formulario es un requisito para el envío de tus certificados de aprobación.`);
    }

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

/**
 * Class Start Announcement — Students
 * Sends individual emails to each student confirming course details and professor contact.
 */
const classStartStudentsTemplate = {
  id: 'class_start_students',
  name: 'Inicio de Clases — Estudiantes',
  description: 'Confirma a cada estudiante el inicio de su curso con sala y datos del profesor.',
  requiredHeaders: ['nombre', 'correo', 'idioma', 'nivel', 'horario', 'sala', 'fecha_inicio', 'nombre_profesor', 'correo_profesor', 'es_profesor'],
  statusColumn: 'Estado Inicio',
  senderName: 'Programa Idiomas PUCV',
  headerTitle: 'INICIO DE CLASES',
  footerLines: ['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV'],

  processRow: function(row, headers, rowIndex, extraData) {
    const esProfesor = String(safeCell(row, headers['es_profesor']) || '0').trim() === '1';
    if (esProfesor) return null;

    // nombre is required: a blank name is a data-quality error. firstName falls back to the
    // 'estudiante' literal, but we want operators to fix their data rather than silently skip.
    const nombre          = requiredCell(row, headers['nombre'],          'Nombre',          rowIndex);
    const correo          = requiredCell(row, headers['correo'],          'Correo',          rowIndex);
    const idioma          = requiredCell(row, headers['idioma'],          'Idioma',          rowIndex);
    const nivel           = requiredCell(row, headers['nivel'],           'Nivel',           rowIndex);
    const horario         = requiredCell(row, headers['horario'],         'Horario',         rowIndex);
    const sala            = requiredCell(row, headers['sala'],            'Sala',            rowIndex);
    const fechaInicio     = requiredCell(row, headers['fecha_inicio'],    'Fecha Inicio',    rowIndex);
    const nombreProfesor  = requiredCell(row, headers['nombre_profesor'], 'Nombre Profesor', rowIndex);
    const correoProfesor  = requiredCell(row, headers['correo_profesor'], 'Correo Profesor', rowIndex);

    return {
      nombre, correo, idioma, nivel, horario, sala,
      fechaInicio: formatDateEs(fechaInicio),
      nombreProfesor, correoProfesor,
      firstName: extractFirstName(nombre, 'estudiante')
    };
  },

  buildHtml: function(data) {
    const greeting = `Estimado/a <strong>${data.firstName}</strong>:`;
    let content = `<p>${greeting}</p>`;
    content += `<p>Te informamos que tu curso ya tiene fecha de inicio confirmada:</p>`;

    const courseInfo = [
      `<strong>Fecha de inicio:</strong> ${data.fechaInicio}`,
      `<strong>Idioma:</strong> ${data.idioma}`,
      `<strong>Nivel:</strong> ${data.nivel}`,
      `<strong>Horario:</strong> ${data.horario}`,
      `<strong>Sala:</strong> ${data.sala}`,
      `<strong>Profesor/a:</strong> ${data.nombreProfesor}`,
      `<strong>Contacto:</strong> <a href="mailto:${data.correoProfesor}" style="color:${COLORS.primary};">${data.correoProfesor}</a>`
    ].join('<br>');
    content += buildInfoBox(courseInfo);

    content += `<p>Si tienes alguna consulta antes del inicio, puedes escribirle directamente a tu profesor/a.</p>`;
    content += `<p>¡Te esperamos!</p>`;

    return content;
  }
};

/**
 * Test: classStartStudentsTemplate.processRow
 * Run from the GAS editor and check the Execution Log.
 */
function testClassStartStudentsProcessRow() {
  const headers = {
    nombre: 0, correo: 1, idioma: 2, nivel: 3,
    horario: 4, sala: 5, nombre_profesor: 6, correo_profesor: 7, es_profesor: 8
  };

  // Test 1: student row is processed
  const studentRow = ['Ana García', 'ana@test.com', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0];
  const r1 = classStartStudentsTemplate.processRow(studentRow, headers, 2, {});
  if (r1 === null) throw new Error('FAIL test 1: student row should not return null');
  if (r1.correo !== 'ana@test.com') throw new Error('FAIL test 1: wrong correo — got: ' + r1.correo);
  if (r1.nombreProfesor !== 'Prof. Smith') throw new Error('FAIL test 1: wrong nombreProfesor — got: ' + r1.nombreProfesor);
  if (!r1.firstName) throw new Error('FAIL test 1: firstName should not be empty — got: ' + r1.firstName);
  Logger.log('PASS test 1: student row processed correctly (correo, nombreProfesor, firstName verified)');

  // Test 2: professor row (number 1) is skipped
  const profRow = ['Prof. Smith', 'smith@pucv.cl', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 1];
  if (classStartStudentsTemplate.processRow(profRow, headers, 3, {}) !== null) {
    throw new Error('FAIL test 2: professor row should return null');
  }
  Logger.log('PASS test 2: professor row (number 1) skipped');

  // Test 3: professor row (string "1") is also skipped — GAS can return strings from Text-formatted cells
  const profRowStr = ['Prof. Smith', 'smith@pucv.cl', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', '1'];
  if (classStartStudentsTemplate.processRow(profRowStr, headers, 4, {}) !== null) {
    throw new Error('FAIL test 3: professor row with string "1" should return null');
  }
  Logger.log('PASS test 3: professor row (string "1") skipped');

  Logger.log('ALL TESTS PASSED: testClassStartStudentsProcessRow');
}

/**
 * Builds a normalized composite key for course grouping.
 * Lowercases and trims each component to prevent silent mismatches.
 * @param {string} idioma
 * @param {string} nivel
 * @param {string} horario
 * @returns {string}
 */
function _makeCourseKey(idioma, nivel, horario) {
  return [idioma, nivel, horario]
    .map(function(s) { return String(s || '').toLowerCase().trim(); })
    .join('|');
}

/**
 * Class Start Announcement — Professor
 * Sends one email per professor per course combination with the enrolled student list.
 */
const classStartProfessorTemplate = {
  id: 'class_start_professor',
  name: 'Inicio de Clases — Profesores',
  description: 'Notifica a cada profesor el inicio de su curso con la nómina de estudiantes inscritos.',
  requiredHeaders: ['nombre', 'correo', 'idioma', 'nivel', 'horario', 'sala', 'fecha_inicio', 'nombre_profesor', 'correo_profesor', 'es_profesor'],
  // nombre_profesor and correo_profesor are required here to enforce that the shared data sheet
  // is correctly set up for the students template. The professor template does not read these columns
  // from the professor row (professors use nombre/correo directly).
  statusColumn: 'Estado Inicio Profesor',
  senderName: 'Programa Idiomas PUCV',
  headerTitle: 'INICIO DE CLASES',
  footerLines: ['Programa Idiomas PUCV', 'Dirección General de Asuntos Internacionales', 'PUCV'],

  /**
   * Pre-aggregates student rows into extraData.courseGroups keyed by idioma|nivel|horario.
   * Called once before row iteration by _executeBatch, menuSendTest, and menuPreview.
   * @param {Array.<Array>} rows - All data rows (header already removed).
   * @param {Object} headers - mapHeaders result.
   * @param {Object} extraData - Mutated in-place.
   */
  prepareExtraData: function(rows, headers, extraData) {
    const groups = {};
    rows.forEach(function(row) {
      const esProfesor = String(safeCell(row, headers['es_profesor']) || '0').trim() === '1';
      if (esProfesor) return;

      const idioma  = safeCell(row, headers['idioma'])  || '';
      const nivel   = safeCell(row, headers['nivel'])   || '';
      const horario = safeCell(row, headers['horario']) || '';
      if (!idioma && !nivel && !horario) return; // skip blank trailing rows
      const key = _makeCourseKey(idioma, nivel, horario);

      if (!groups[key]) groups[key] = [];
      groups[key].push({
        nombre: safeCell(row, headers['nombre']) || '',
        correo: safeCell(row, headers['correo']) || ''
      });
    });
    extraData.courseGroups = groups;
  },

  processRow: function(row, headers, rowIndex, extraData) {
    const esProfesor = String(safeCell(row, headers['es_profesor']) || '0').trim() === '1';
    if (!esProfesor) return null;

    const nombre  = requiredCell(row, headers['nombre'],  'Nombre',  rowIndex);
    const correo  = requiredCell(row, headers['correo'],  'Correo',  rowIndex);
    const idioma  = requiredCell(row, headers['idioma'],  'Idioma',  rowIndex);
    const nivel   = requiredCell(row, headers['nivel'],   'Nivel',   rowIndex);
    const horario = requiredCell(row, headers['horario'], 'Horario', rowIndex);
    const sala        = requiredCell(row, headers['sala'],         'Sala',         rowIndex);
    const fechaInicio = requiredCell(row, headers['fecha_inicio'], 'Fecha Inicio', rowIndex);

    const key = _makeCourseKey(idioma, nivel, horario);
    const students = (extraData.courseGroups && extraData.courseGroups[key]) || [];

    if (students.length === 0) return null; // No matching students — skip this professor row

    return {
      nombre, correo, idioma, nivel, horario, sala,
      fechaInicio: formatDateEs(fechaInicio),
      firstName: extractFirstName(nombre, 'profesor'),
      students: students
    };
  },

  buildHtml: function(data) {
    let content = `<p>Estimado/a Prof. <strong>${data.firstName}</strong>:</p>`;
    content += `<p>A continuación encontrará la información de su curso y la nómina de estudiantes inscritos:</p>`;

    const courseInfo = [
      `<strong>Fecha de inicio:</strong> ${data.fechaInicio}`,
      `<strong>Idioma:</strong> ${data.idioma}`,
      `<strong>Nivel:</strong> ${data.nivel}`,
      `<strong>Horario:</strong> ${data.horario}`,
      `<strong>Sala:</strong> ${data.sala}`
    ].join('<br>');
    content += buildInfoBox(courseInfo);

    const count = data.students.length;
    content += `<p><strong>Estudiantes inscritos (${count}):</strong></p>`;
    const listItems = data.students
      .map(function(s) {
        return `<li style="margin-bottom:4px;">${s.nombre} — <a href="mailto:${s.correo}" style="color:${COLORS.primary};">${s.correo}</a></li>`;
      })
      .join('');
    content += `<ul style="padding-left:20px; margin:0 0 16px;">${listItems}</ul>`;

    content += `<p>Cualquier consulta sobre la gestión del curso puede responder directamente a este correo.</p>`;

    return content;
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
registerTemplate(classStartStudentsTemplate);
registerTemplate(classStartProfessorTemplate);

/**
 * Tests for _makeCourseKey normalization.
 */
function testMakeCourseKey() {
  const k1 = _makeCourseKey('Inglés', 'A2', 'L-J 8-9');
  const k2 = _makeCourseKey(' Inglés ', ' A2 ', ' L-J 8-9 ');
  const k3 = _makeCourseKey('INGLÉS', 'a2', 'l-j 8-9');
  if (k1 !== k2) throw new Error('FAIL: spaces not normalized — k1: ' + k1 + ' k2: ' + k2);
  if (k1 !== k3) throw new Error('FAIL: case not normalized — k1: ' + k1 + ' k3: ' + k3);
  Logger.log('PASS: _makeCourseKey normalizes correctly — key: ' + k1);
  Logger.log('ALL TESTS PASSED: testMakeCourseKey');
}

/**
 * Tests for classStartProfessorTemplate.prepareExtraData and processRow.
 */
function testClassStartProfessorTemplate() {
  const headers = {
    nombre: 0, correo: 1, idioma: 2, nivel: 3,
    horario: 4, sala: 5, nombre_profesor: 6, correo_profesor: 7, es_profesor: 8
  };

  const rows = [
    ['Ana García',   'ana@test.com',   'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0],
    ['Bob Torres',   'bob@test.com',   'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0],
    ['Prof. Smith',  'smith@pucv.cl',  'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 1],
    ['Carmen López', 'carmen@test.com','Alemán',  'B1', 'V 10-12', 'F202', 'Prof. Braun', 'braun@pucv.cl', 0],
    ['Prof. Braun',  'braun@pucv.cl',  'Alemán',  'B1', 'V 10-12', 'F202', 'Prof. Braun', 'braun@pucv.cl', 1],
  ];

  const extraData = { configExtras: {} };
  classStartProfessorTemplate.prepareExtraData(rows, headers, extraData);

  // Test 1: courseGroups has two entries (one per course)
  const groups = extraData.courseGroups;
  const keys = Object.keys(groups);
  if (keys.length !== 2) throw new Error('FAIL test 1: expected 2 course groups, got ' + keys.length);
  Logger.log('PASS test 1: two course groups built');

  // Test 2: Inglés/A2 group has 2 students
  const englishKey = _makeCourseKey('Inglés', 'A2', 'L-J 8-9');
  if (!groups[englishKey]) throw new Error('FAIL test 2: missing key ' + englishKey);
  if (groups[englishKey].length !== 2) throw new Error('FAIL test 2: expected 2 students, got ' + groups[englishKey].length);
  Logger.log('PASS test 2: Inglés A2 group has 2 students');

  // Test 3: student rows return null for the professor template
  if (classStartProfessorTemplate.processRow(rows[0], headers, 2, extraData) !== null) {
    throw new Error('FAIL test 3: student row should return null');
  }
  Logger.log('PASS test 3: student row skipped by professor template');

  // Test 3b: professor row with string "1" is also processed (not skipped) by the professor template
  const profRowStr = ['Prof. Smith', 'smith@pucv.cl', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', '1'];
  const profDataStr = classStartProfessorTemplate.processRow(profRowStr, headers, 5, extraData);
  if (profDataStr === null) throw new Error('FAIL test 3b: professor row with string "1" should NOT return null');
  Logger.log('PASS test 3b: professor row with string "1" is correctly identified as professor');

  // Test 4: professor row returns data with correct student list
  const profData = classStartProfessorTemplate.processRow(rows[2], headers, 4, extraData);
  if (profData === null) throw new Error('FAIL test 4: professor row should return data');
  if (profData.students.length !== 2) throw new Error('FAIL test 4: expected 2 students, got ' + profData.students.length);
  if (profData.idioma !== 'Inglés') throw new Error('FAIL test 4: wrong idioma — got: ' + profData.idioma);
  Logger.log('PASS test 4: professor row returns data with 2-student list');

  // Test 5: professor whose course key does not match any student rows returns null.
  // Setup: two students for Inglés/A2, one professor for a completely different course.
  // This proves the lookup is isolated by course key, not just the empty-map case.
  const rowsIsolated = [
    ['Ana García', 'ana@test.com', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0],
    ['Bob Torres', 'bob@test.com', 'Inglés', 'A2', 'L-J 8-9', 'E101', 'Prof. Smith', 'smith@pucv.cl', 0],
    ['Prof. Solo',  'solo@pucv.cl', 'Japonés', 'N1', 'S 9-11', 'G303', 'Prof. Solo',  'solo@pucv.cl',  1],
  ];
  const extraDataIsolated = { configExtras: {} };
  classStartProfessorTemplate.prepareExtraData(rowsIsolated, headers, extraDataIsolated);
  const soloResult = classStartProfessorTemplate.processRow(rowsIsolated[2], headers, 4, extraDataIsolated);
  if (soloResult !== null) throw new Error('FAIL test 5: professor with no matching students should return null');
  Logger.log('PASS test 5: professor with no matching students returns null (key isolation verified)');

  Logger.log('ALL TESTS PASSED: testClassStartProfessorTemplate');
}
