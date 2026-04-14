# Guía de Despliegue 🚀

Siga estos pasos para implementar el Sistema de Correos Automatizados en una nueva hoja de cálculo de Google.

## 1. Preparación de la Hoja de Cálculo

1.  Cree una nueva Hoja de Cálculo de Google (o abra una existente).
2.  Acceda al editor de scripts: **Extensiones** > **Apps Script**.
3.  Asigne un nombre al proyecto (ej: "Envío Mensajes Programa").

## 2. Instalación del Código

En el editor de Apps Script, cree tres archivos de tipo "Script" (.gs) y dos archivos de tipo "HTML" (.html), luego copie el contenido correspondiente desde la carpeta `src/` de este repositorio:

1.  **`Core.gs`** (Tipo: Script): Copie el contenido de `src/Core.gs`.
2.  **`Templates.gs`** (Tipo: Script): Copie el contenido de `src/Templates.gs`.
3.  **`Main.gs`** (Tipo: Script): Copie el contenido de `src/Main.gs`.
4.  **`SendDialog.html`** (Tipo: HTML): Copie el contenido de `src/SendDialog.html`.
5.  **`TemplateSelector.html`** (Tipo: HTML): Copie el contenido de `src/TemplateSelector.html`.

*Nota: No es necesario realizar cambios en el código de estos archivos para el despliegue estándar.*

## 3. Configuración del Sistema

Para que el sistema sepa qué plantilla usar y quién envía los correos, debe crear una pestaña especial:

1.  Cree una hoja llamada **"Config"** (exactamente así).
2.  Estructure los datos en dos columnas (Clave y Valor):

| Clave (A) | Valor (B) | Descripción |
| :--- | :--- | :--- |
| `template_id` | `certificate` | El ID de la plantilla a usar (ver README). |
| `sender_name` | `Programa Idiomas` | El nombre que verán los alumnos como remitente. |
| `sender_alias` | `noreply@pucv.cl` | (Opcional) Correo electrónico de envío si tiene permisos de alias. |
| `cc` | `coordinacion@pucv.cl` | (Opcional) Correo en copia por defecto. |
| `header_title` | `Certificación` | (Opcional) Sobrescribe el título superior del correo. |

## 4. Estructura de Datos

En su hoja principal (donde están los alumnos o destinatarios), asegúrese de tener las columnas requeridas por su plantilla. Por ejemplo, para `certificate` necesita:

*   `nombre`
*   `correo`
*   `id_archivo` (o link de Google Drive)

*Consulte la [Guía de Plantillas](./CREATING_TEMPLATES.md) para ver los requisitos de cada una.*

## 5. Ejecución y Pruebas

1.  Recargue su hoja de cálculo. Aparecerá un menú llamado **"📧 Sistema de Correos"**.
2.  **IMPORTANTE:** Antes de enviar masivamente, use la opción **"🧪 Enviar Prueba"**.
    *   Esto enviará el formato de la primera fila de datos a su propia dirección de correo para verificación.
3.  Use **"👁 Vista Previa"** para ver cómo quedará el diseño HTML sin enviar nada.
4.  Cuando esté listo, use **"📧 Enviar Correos"**. El sistema marcará la columna de estado automáticamente para no repetir envíos.

---

## 🛠 Solución de Problemas Comunes

*   **No aparece el menú:** Recargue la página. Si persiste, revise que la función `onOpen` esté en el archivo `Main.gs`.
*   **Error de permisos:** La primera vez que ejecute, Google le pedirá autorizar el script. Haga clic en "Configuración Avanzada" > "Ir al proyecto (no seguro)".
*   **No se encuentran columnas:** Verifique que los nombres de las cabeceras en la primera fila coincidan exactamente (incluyendo tildes si aplica) con los requeridos por la plantilla.
