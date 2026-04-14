# Correos Automatizados PUCV 📧

Sistema unificado y extensible de automatización de correos electrónicos para el Centro de Idiomas PUCV y unidades académicas relacionadas, construido sobre Google Apps Script.

## 🚀 Descripción General

Este sistema permite gestionar campañas de comunicación institucional de alta calidad (certificados, recordatorios, encuestas, etc.) directamente desde Google Sheets. Utiliza un motor centralizado para garantizar la consistencia visual y técnica, permitiendo que cada hoja de cálculo se comporte como una aplicación independiente con su propio menú personalizado.

## 🏗️ Arquitectura

El sistema se basa en una estructura de cinco archivos principales que deben copiarse en el editor de Apps Script de cada hoja:

1.  **`Core.gs` (El Motor):** Contiene toda la lógica compartida.
    *   Manejo de hojas de cálculo y mapeo de cabeceras.
    *   Envio masivo de correos con control de cuotas y throttling.
    *   Maquetación HTML institucional (Header/Footer PUCV).
    *   Helpers para compartir archivos en Google Drive.
    *   Constructor de menús y diálogos de usuario.

2.  **`Templates.gs` (El Registro):** Centraliza la definición de los correos.
    *   Registro de plantillas mediante un patrón extensible.
    *   Definición de campos requeridos y configuraciones por defecto.
    *   Lógica específica para procesar cada fila de datos.

3.  **`Main.gs` (El Punto de Entrada):** Gestiona la interfaz y las acciones.
    *   Menú desplegable personalizado: Enviar, Prueba, Vista Previa, Borradores.
    *   Carga automática de configuración desde la hoja "Config".
    *   Orquestación de envíos masivos y creación de borradores.

4.  **Archivos HTML de UI:** Vistas para los diálogos en Google Sheets.
    *   **`SendDialog.html`:** Interfaz para personalizar asunto, copia y notas antes de enviar.
    *   **`TemplateSelector.html`:** Galería visual para la selección y configuración de nuevas plantillas.

## 📋 Plantillas Disponibles

| ID | Nombre | Propósito |
| :--- | :--- | :--- |
| `certificate` | Envío de Certificados | Entrega de archivos PDF compartidos vía Drive. |
| `confirmation` | Confirmación de Apertura | Información de inicio de cursos y códigos de descuento. |
| `payment_reminder` | Recordatorio de Pago | Avisos urgentes con bandas de alerta roja. |
| `placement_test` | Placement Test | Entrega de credenciales y links para plataformas externas. |
| `code_delivery` | Envío de Códigos | Distribución segura de códigos de acceso (libros/tests). |
| `report_delivery` | Entrega de Informes | Reportes de evaluación con búsqueda en directorio docente. |
| `survey` | Encuesta de Percepción | Invitación a completar encuestas institucionales. |
| `class_start_students` | Inicio de Clases (Estudiantes) | Notificación de fecha de inicio confirmada a estudiantes. |
| `class_start_professor` | Inicio de Clases (Profesor) | Notificación a profesores con listado de estudiantes del curso. |

## 🛠️ Guías Rápidas

*   **[Guía de Despliegue](./docs/DEPLOYMENT.md):** Cómo instalar este sistema en una nueva hoja de cálculo.
*   **[Guía de Creación de Plantillas](./docs/CREATING_TEMPLATES.md):** Instrucciones técnicas para desarrolladores que deseen añadir nuevos tipos de correo.

---
**PUCV - Centro de Idiomas**
*Desarrollado para la excelencia institucional.*
