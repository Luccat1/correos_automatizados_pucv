# Correos Automatizados PUCV

## What This Is

Sistema unificado y extensible de automatización de correos institucionales para el Centro de Idiomas PUCV, construido sobre Google Apps Script y vinculado a Google Sheets. Permite gestionar campañas de comunicación de alta calidad (certificados, recordatorios, encuestas, entregas de credenciales, etc.) directamente desde hojas de cálculo, con un motor centralizado que garantiza consistencia visual y técnica a través de múltiples plantillas.

## Core Value

Cualquier funcionario del Centro de Idiomas puede enviar correos institucionales masivos, correctamente formateados y rastreados, sin conocimientos técnicos, usando solo Google Sheets.

## Requirements

### Validated

- ✓ Motor central de envío (`Core.gs`) con throttling, control de cuotas Gmail y maquetación HTML institucional — existente
- ✓ Registro de plantillas extensible (`Templates.gs`) con 7 tipos: certificate, confirmation, payment_reminder, placement_test, code_delivery, report_delivery, survey — existente
- ✓ Menú personalizado en Google Sheets con opciones: Enviar, Prueba, Vista Previa, Borradores — existente
- ✓ Diálogos HTML (`TemplateSelector.html`, `SendDialog.html`) para selección de plantilla y configuración de envío — existente
- ✓ Columna de estado de envío auto-creada y actualizada en batch — existente
- ✓ Compartir archivos Drive como viewer para plantillas de certificados/informes — existente
- ✓ Configuración por hoja via pestaña "Config" (key-value pairs) — existente

### Active

- [ ] Mejorar experiencia de usuario en los diálogos (feedback, validación, UX)
- [ ] Aumentar robustez ante errores (manejo de filas inválidas, reintentos parciales)
- [ ] Ampliar cobertura de plantillas según necesidades del Centro de Idiomas
- [ ] Documentación técnica completa para onboarding de nuevos desarrolladores

### Out of Scope

- Interfaz web independiente de Google Sheets — el sistema está diseñado para vivir bound a Sheets
- Backend propio / base de datos propia — usa GAS globals (GmailApp, SpreadsheetApp, DriveApp)
- Tests automatizados locales — GAS no tiene entorno de pruebas local; tests se ejecutan en el editor GAS

## Context

- **Runtime**: Google Apps Script (GAS) — single global scope, sin `import`/`require`, sin npm
- **Plataforma**: bound a Google Spreadsheet; el trigger `onOpen()` crea el menú automáticamente
- **Despliegue**: manual — copiar/pegar archivos `.gs` y `.html` al editor Apps Script de cada hoja
- **Cuota Gmail**: `MailApp.getRemainingDailyQuota()` verificada antes de cada envío; batch se detiene si < 5 restantes
- **Throttling**: `Utilities.sleep()` cada 20 correos para evitar límites de velocidad
- **Archivos fuente**: `src/Core.gs`, `src/Templates.gs`, `src/Main.gs`, `src/TemplateSelector.html`, `src/SendDialog.html`
- **Estado actual**: sistema funcional con 7 plantillas activas; hay margen de mejora en UX, robustez y extensibilidad

## Constraints

- **Tech Stack**: Google Apps Script obligatorio — no hay alternativa dado que el sistema vive en Google Workspace
- **Runtime GAS**: sin módulos, sin `async/await` real, sin npm; `Utilities.sleep()` para throttling
- **Despliegue**: no hay CI/CD; cada cambio requiere copiar manualmente al editor GAS
- **Cuota diaria**: Gmail limita a ~100-500 correos/día según tipo de cuenta Google; el sistema lo respeta
- **Sin tests locales**: toda validación debe realizarse ejecutando funciones de test en el editor GAS

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Arquitectura 3 archivos (Core/Templates/Main) | Separación de responsabilidades: motor genérico, registro de plantillas, UI | ✓ Good |
| Registro de plantillas con `registerTemplate()` | Extensibilidad sin modificar el motor central | ✓ Good |
| HTML dialogs con templated HTML (`<?= ?>`) | GAS no soporta frameworks modernos; `HtmlService` es la única opción | — Pending |
| `mapHeaders()` con lowercase para tolerancia | Evita errores por capitalización inconsistente en nombres de columnas | ✓ Good |
| `batchUpdateColumn()` para estado de envío | Una sola escritura al final reduce las llamadas a la API de Sheets | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25 after initialization*
