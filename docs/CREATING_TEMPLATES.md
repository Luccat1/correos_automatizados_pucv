# Guía de Creación de Plantillas 🛠️

Esta guía detalla cómo añadir nuevos tipos de correo al sistema utilizando el patrón de "Registro de Plantillas".

## Estructura de una Plantilla

Cada plantilla es un objeto JavaScript que define su identidad, requisitos y generadores de contenido. Los campos disponibles son:

| Campo | Tipo | Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | String | Sí | Identificador único (ej: `my_template`). |
| `name` | String | Sí | Nombre amigable para el usuario. |
| `requiredHeaders` | String[] | Sí | Lista de columnas exactas que debe tener la hoja. |
| `statusColumn` | String | No | Nombre de la columna de tracking (default: `Estado_Envio`). |
| `senderName` | String | No | Nombre del remitente por defecto. |
| `senderAlias` | String | No | Correo alias por defecto (ej: `idiomas@pucv.cl`). |
| `headerTitle` | String | No | Título que aparece en la franja azul superior. |
| `footerLines` | String[] | No | Líneas de texto para el pie de página institucional. |
| `defaults` | Object | No | Valores por defecto para configuraciones extra. |
| `processRow` | Function | Sí | Extrae y valida los datos de una fila. |
| `buildHtml` | Function | Sí | Genera el contenido HTML del cuerpo del correo. |

## Paso a Paso para Crear una Plantilla

### 1. Definir el Objeto de Plantilla
Abra `src/Templates.gs` y cree una nueva constante para su plantilla:

```javascript
const miNuevaPlantilla = {
  id: 'recordatorio_examen',
  name: 'Recordatorio de Examen',
  requiredHeaders: ['nombre', 'correo', 'fecha', 'sala'],
  headerTitle: 'Recordatorio de Examen Final',
  footerLines: ['Centro de Idiomas PUCV', 'Valparaíso, Chile'],
  processRow: function(row, headers, rowIndex) {
    // 1. Extraer datos usando helpers de Core.gs
    return {
      nombre: requiredCell(row, headers, 'nombre', rowIndex),
      correo: requiredCell(row, headers, 'correo', rowIndex),
      fecha: safeCell(row, headers, 'fecha'),
      sala: safeCell(row, headers, 'sala')
    };
  },
  buildHtml: function(data) {
    // 2. Construir el cuerpo usando helpers de Core.gs
    let html = `<p>Estimado/a ${data.nombre},</p>`;
    html += `<p>Le recordamos que su examen será el <b>${data.fecha}</b> en el aula <b>${data.sala}</b>.</p>`;
    
    html += buildInfoBox('Instrucciones', 'Por favor llegue 15 minutos antes con su cédula de identidad.');
    
    html += buildButton('Ver Mapa de Salas', 'https://ejemplo.cl/mapa');
    
    return html;
  }
};
```

### 2. Registrar la Plantilla
Al final del archivo `src/Templates.gs`, añada la llamada al registro:

```javascript
registerTemplate(miNuevaPlantilla);
```

## Helpers Disponibles (`Core.gs`)

Use estas funciones dentro de su plantilla para mantener el estándar institucional:

*   `requiredCell(row, headers, columnName, rowIndex)`: Lee un valor y tira error si está vacío.
*   `safeCell(row, headers, columnName)`: Lee un valor opcional.
*   `buildButton(text, url)`: Genera un botón azul centrado.
*   `buildInfoBox(title, text)`: Caja gris de información destacada.
*   `buildWarningBox(title, text)`: Caja roja de advertencia (usada para fechas límite).
*   `extractFirstName(fullName)`: Obtiene el primer nombre para un trato más cercano.

## Pruebas

Una vez registrada, la plantilla aparecerá automáticamente en el sistema. Para probarla:
1.  En la hoja **"Config"**, cambie `template_id` por el ID de su nueva plantilla.
2.  Use **"👁 Vista Previa"** para validar el diseño visual.
3.  Use **"🧪 Enviar Prueba"** para recibir un correo real.
