
# Envío de códigos a estudiantes (Apps Script independiente)

Script para enviar por correo códigos de libros o pruebas a estudiantes, leyendo desde una Google Sheet. Pensado para el Centro de Idiomas PUCV. Proyecto **independiente** de Apps Script (no vinculado a un documento).

## Qué hace
- Lee una hoja de cálculo con columnas estándar.
- Genera códigos únicos si faltan.
- Envía correos con asunto y cuerpo personalizables usando `{{placeholders}}`.
- Marca `enviado = TRUE` y registra `fecha_envio`.
- Escribe un log de ejecución en la pestaña `Logs`.
- Incluye modo simulación (`DRY_RUN`).

## Requisitos
- Cuenta con acceso a Gmail y a la Google Sheet.
- Permisos de OAuth para `spreadsheets` y `gmail.send`.

## Estructura de la Sheet
Pestaña por defecto: `Listado`

Encabezados obligatorios (minúsculas recomendadas):
- `correo`
- `nombre`
- `codigo`
- `enviado` (booleano)
- `fecha_envio` (texto o fecha)

Columnas opcionales:
- `asunto_opcional` (plantilla por fila)
- `cuerpo_opcional` (plantilla HTML por fila)
- `tipo_opcional` (por ejemplo: `libro`, `prueba`...)

> Puedes cambiar nombres de columnas en `CONFIG.HEADERS`.

## Placeholders disponibles
- `{{nombre}}`
- `{{codigo}}`
- `{{tipo}}`
- `{{correo}}`

## Instrucciones rápidas de uso
1. Crea una Google Sheet con los encabezados indicados.
2. Abre [script.google.com](https://script.google.com/) y crea un **proyecto nuevo**.
3. Crea los archivos:
   - `Code.gs` → pega el contenido de este repositorio.
   - `appsscript.json` → pega el manifiesto (debes activar vista del manifiesto desde la rueda dentada).
4. En `Code.gs`, configura:
   - `CONFIG.SHEET_ID` con el ID de tu Sheet.
   - `CONFIG.SHEET_NAME` si usas otra pestaña.
   - Si quieres, ajusta plantillas, límites y opciones.
5. Da clic en **Ejecutar** por primera vez para otorgar permisos.
6. Flujo sugerido:
   - Ejecuta `generarCodigosFaltantes()` si hay celdas `codigo` vacías.
   - Ejecuta `vistaPreviaPrimeraPendiente()` para revisar la plantilla ya renderizada.
   - Opcional: ejecuta `setDryRun(true)` para simular.
   - Ejecuta `enviarCodigos()` para enviar y marcar enviados.

## Personalización de plantillas
- Asunto por defecto: `Entrega de código {{tipo}}`
- Cuerpo HTML por defecto: ver `CONFIG.DEFAULT_BODY_HTML`
- Cuerpo texto por defecto: ver `CONFIG.DEFAULT_BODY_TEXT`
- Puedes sobreescribir por fila usando las columnas `asunto_opcional` y `cuerpo_opcional`.

## Reenvíos y límites
- Por defecto no reenvía si `enviado` ya es TRUE.
- Para reenviar, ejecuta `setForceResend(true)` antes de `enviarCodigos()`.
- `BATCH_LIMIT` controla cuántos correos por corrida.
- `SLEEP_MS_EVERY` + `SLEEP_MS` ayuda a respetar cuotas.

## Errores comunes
- **ID de hoja mal pegado**: revisa `CONFIG.SHEET_ID`.
- **Encabezados no coinciden**: ajusta `CONFIG.HEADERS` o renombra columnas.
- **Correo inválido**: la fila se registra como `SKIP` en `Logs`.

## Publicación en GitHub
1. Crea un repositorio nuevo.
2. Sube `Code.gs`, `appsscript.json` y este `README.md`.
3. Opcional: añade licencia MIT.
4. Comparte el enlace en la documentación interna del Centro.

## Licencia
MIT
