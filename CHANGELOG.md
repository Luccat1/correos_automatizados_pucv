# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Plantilla de Confirmación (`confirmationTemplate`)**: Soporte para la clave de configuración `refund_form_url` (`configKeys`). Si se define en la hoja "Config", se genera automáticamente un párrafo con enlace directo para que el estudiante pueda solicitar la devolución de su inscripción en caso de conflicto de horario.
- **Accesibilidad (a11y) en componentes de UI**:
  - Navegación completa por teclado (`tabindex="0"`, `role="button"` y gestión de teclas `Enter` / `Espacio`) en tarjetas de selección de modo en `SendDialog.html` y tarjetas de plantillas en `TemplateSelector.html`.
  - Estilos de foco accesible con `:focus-visible` y contorno destacado en botones y tarjetas de `Dashboard.html`, `SendDialog.html` y `TemplateSelector.html`.
  - Marcado de íconos decorativos con `<span aria-hidden="true">` en `Core.gs`, `Dashboard.html`, `SendDialog.html` y `TemplateSelector.html` para evitar ruido en lectores de pantalla.

### Changed
- **Menú unificado en Google Sheets (`Main.gs`)**: Reemplazo del submenú desplegable anidado `📤 Envío` por un acceso directo `📤 Gestionar Envío` (`menuSendEmails`), ya que la selección entre Envío Real, Borradores y Prueba se gestiona interactivamente dentro de `SendDialog.html`.
- **Ajustes visuales en diálogo de envío (`SendDialog.html`)**: Ajuste de tamaño de fuente en la descripción de las tarjetas de modo a 11px para mejorar la legibilidad.

### Removed
- **`Main.gs`**: Removida la función `menuCreateDrafts()` al quedar subsumida en el diálogo de envío unificado.

## [1.0.0] - 2026-10-01

### Added
- Motor centralizado de automatización y despacho en `Core.gs` con throttling, control de cuota de Gmail y maquetación visual institucional PUCV.
- Registro extensible de plantillas en `Templates.gs` con soporte inicial para:
  - `certificate` (Envío de Certificados con integración Google Drive)
  - `confirmation` (Confirmación de Apertura de Curso)
  - `payment_reminder` (Recordatorio de Pago urgente)
  - `placement_test` (Credenciales y enlaces de pruebas de diagnóstico)
  - `code_delivery` (Distribución segura de códigos de acceso)
  - `report_delivery` (Entrega de Informes con búsqueda en directorio)
  - `survey` (Encuestas de percepción institucional)
  - `class_start_students` (Anuncio de inicio a estudiantes)
  - `class_start_professor` (Anuncio de inicio a docentes con lista de inscritos)
- Vistas de interfaz de usuario en Google Apps Script:
  - `Dashboard.html`: Panel lateral de métricas y acciones rápidas.
  - `SendDialog.html`: Modal de prevuelo y configuración de envío.
  - `TemplateSelector.html`: Galería visual para configuración asistida.
- Orquestación y menú interactivo en hojas de cálculo vía `Main.gs`.
