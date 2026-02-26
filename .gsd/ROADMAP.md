# ROADMAP.md

> **Current Milestone**: v2.0 — Enhanced UX & Template Polish
> **Goal**: Mejorar la experiencia de usuario del sistema de correos mediante una interfaz GUI rica, auto-configuración de hojas, detección inteligente de datos, y redacción institucional pulida.

## Must-Haves

- [ ] Selector de plantillas desde el menú con auto-generación de hojas (Config + datos)
- [ ] Auto-detección de hoja de datos (sin depender de hoja activa)
- [ ] Diálogo HTML para personalizar envíos (nota adicional, asunto) antes de enviar
- [ ] Fallback de saludo genérico cuando no hay nombre de destinatario
- [ ] Redacción revisada: dos puntos en vocativos, sin redundancias, tono institucional PUCV
- [ ] Parámetros configurables por template visibles en Config (ej: survey_url, extra_note)

- **Current Phase**: Phase 3: Template Copy Revision (Planning)
- **Status**: Phase 2 Verified. Ready to plan Phase 3.
- **Progress**:
  - [x] Phase 1: Template Config & Auto-Sheet Generation
  - [x] Phase 2: Enhanced Menu GUI
  - [ ] Phase 3: Template Copy Revision

## Phases

### Phase 1: Template Config & Auto-Sheet Generation
**Status**: ⬜ Not Started
**Objective**: Añadir parámetros configurables a cada template (ej: `survey_url`, `extra_note`) y crear función que genere automáticamente las hojas Config + datos con cabeceras correctas al seleccionar un template.
**Delivers**:
- Cada template declara sus `configKeys` (claves configurables esperadas)
- Función `menuSetupTemplate()` que muestra lista de templates y genera hojas
- Templates leen parámetros desde Config en vez de usar solo defaults hardcodeados
- Auto-detección de hoja de datos por nombre (configurado en Config como `data_sheet`)

### Phase 2: Enhanced Menu GUI
**Status**: ✅ Complete
**Objective**: Crear diálogos HTML para personalizar envíos y aprovechar la UI de Google Sheets.
**Delivers**:
- Diálogo HTML pre-envío para editar: asunto, nota adicional, CC/BCC
- Vista previa mejorada con diálogo modal completo
- Menú reorganizado con submenús para Configuración y Herramientas

### Phase 3: Template Copy Revision
**Status**: ✅ Complete
Revision of all template copies for institutional tone. Standardized greetings and improved phrasing.
**Delivers**:
- Vocativos con dos puntos ("Estimado/a X:")
- Fallback `extractFirstName()` → "Estimado/a estudiante" si no hay nombre
- Eliminar redundancias (ej: "curso que estás cursando")
- Tono alineado con el estilo de campañas IDIOMAS PUCV
