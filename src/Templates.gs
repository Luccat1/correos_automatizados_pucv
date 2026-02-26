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
 * Lists all registered templates.
 * @returns {Array.<Object>} [{ id, name }]
 */
function listTemplates() {
  return Object.keys(_REGISTRY).map(id => ({
    id: id,
    name: _REGISTRY[id].name
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
  requiredHeaders: ['nombre', 'correo', 'enlace'],
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
  processRow: function(row, headers, rowIndex) {
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
      firstName: extractFirstName(nombre)
    };
  },

  /**
   * Builds the HTML content for the certificate email.
   * @param {Object} data
   * @returns {string}
   */
  buildHtml: function(data) {
    const programName = data.programName || "un programa académico";
    
    let content = `<p>Estimado(a) <strong>${data.firstName}</strong>,</p>`;
    content += `<p>Nos complace saludarte e informarte que tu certificado de finalización de <strong>${programName}</strong> ya se encuentra disponible.</p>`;
    content += buildButton("Ver Certificado", data.certificateUrl);
    content += buildInfoBox("Para una mejor visualización, te recomendamos abrir el enlace desde un computador. Si tienes problemas para acceder, asegúrate de estar usando el correo electrónico registrado.");
    content += `<p>Atentamente,<br>Equipo PUCV</p>`;

    return content;
  }
};

// Register the template
registerTemplate(certificateTemplate);
