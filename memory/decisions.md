# Decisiones de Arquitectura y Diseño

Registro de decisiones técnicas importantes tomadas en este proyecto.

---

## Formato

Cada entrada sigue este patrón:
**[Fecha] Decisión:** descripción
**Contexto:** por qué se tomó esta decisión
**Alternativas descartadas:** qué otras opciones se consideraron

---

<!-- Añadir decisiones aquí -->

**[2026-10-01] Decisión:** Modernización del sistema visual completo (Correos HTML + Modales de UI + Sidebar Dashboard) inspirado en el proyecto `email_marketing`.
**Contexto:** Se unificó el estándar estético del sistema adoptando la tipografía `Plus Jakarta Sans`, cabeceras con degradados institucionales PUCV (`#001f3f` -> `#24588d` -> `#1d71b8`), tarjetas estilo Bento Grid con micro-animaciones, componentes de correo refinados (botones CTA con sombras suaves, llamadas y cajas de alerta), y un panel lateral Dashboard para seguimiento de métricas y cuota de Gmail en tiempo real.
**Alternativas descartadas:** Mantener estilos planos básicos o solo modificar los modales sin actualizar los correos HTML ni incorporar panel de métricas.

**[2026-10-01] Decisión:** Cuadros de selección interactivos de modo (Envío Real / Borradores / Prueba) y límite de lote en el diálogo de pre-vuelo (`SendDialog.html`).
**Contexto:** Se unificó el flujo previo al envío en una sola interfaz interactiva donde el usuario puede elegir o cambiar dinámicamente entre enviar masivamente, crear borradores en Gmail o enviar un correo de prueba individual a una dirección específica (por defecto el usuario activo), así como fijar límites opcionales de filas para envíos piloto controlados.
**Alternativas descartadas:** Mantener modales rígidos separados donde el modo no se puede cambiar dentro de la interfaz.
