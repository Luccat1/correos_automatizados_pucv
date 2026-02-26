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
