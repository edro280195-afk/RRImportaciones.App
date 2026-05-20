# Ideas — Topbar: Búsqueda ⌘K, Notificaciones y Configuración

## Búsqueda Global (⌘K / Ctrl+K)

### Funcionamiento
- Atajo `⌘K` (Mac) / `Ctrl+K` (Windows) enfoca el input de búsqueda
- Mientras se escribe, se despliega un dropdown/overlay con resultados en vivo
- Búsqueda unificada a través de: Clientes, VIN, Pedimento, Trámite (nº consecutivo)

### Backend
- Endpoint: `GET /api/buscar?q=&limit=10`
- Busca en paralelo en:
  - `Clientes.Apodo` / `Clientes.Nombre` (ILIKE)
  - `Vehiculos.Vin` / `Vehiculos.VinCorto` (ILIKE)
  - `Tramites.NumeroConsecutivo` (cast a string + ILIKE)
  - `Pedimentos.NumeroPedimento` (ILIKE)
- Resultado unificado con: `{ tipo: "cliente"|"vehiculo"|"tramite"|"pedimento", id, label, route }`
- Máximo 10 resultados, ordenados por relevancia

### Frontend
- Componente `GlobalSearchComponent` overlay con:
  - Input autofocus al abrir
  - Resultados agrupados por tipo con iconos
  - Navegación por flechas ↑↓ + Enter para ir al resultado
  - Escape para cerrar
  - Click outside para cerrar
- Se integra en el topbar reemplazando el input simple actual
- Debounce 300ms en la escritura

### UX
- Placeholder descriptivo: "Buscar cliente, VIN, pedimento, número..."
- Al abrir con ⌘K, el input se enfoca automáticamente
- Resultados con iconos distintivos por tipo
- Cada resultado es un link directo a la página correspondiente

---

## Notificaciones (Campanita)

### Funcionamiento
- Indicador visual (punto ámbar) cuando hay notificaciones no leídas
- Dropdown al hacer clic con lista de notificaciones recientes
- Marcar como leídas al abrir el dropdown o individualmente

### Backend
- Endpoint: `GET /api/notificaciones?limit=20`
  - Devuelve: id, tipo, mensaje, link, leida, created_at
- Endpoint: `POST /api/notificaciones/{id}/leer`
- Endpoint: `POST /api/notificaciones/leer-todas`
- Las notificaciones se generan automáticamente por eventos del sistema:
  - Cambio de estado en un trámite
  - Nuevo pago pendiente de verificar
  - Pedimento nuevo agregado
  - Comentario/nota en un trámite donde el usuario es participante
- Polling cada 30s o WebSocket (SignalR) para actualizaciones en vivo

### Frontend
- Componente `NotificacionesDropdown` con:
  - Lista de últimas 20 notificaciones
  - Cada una con icono según tipo, texto, timestamp relativo ("hace 5m")
  - Click en una notificación → navega al recurso y marca como leída
  - Botón "Marcar todas como leídas"
  - Badge con contador de no leídas en el icono de campana
- El punto ámbar en el icono se muestra solo si hay no leídas

### Tipos de notificación
| Tipo | Ícono | Mensaje |
|------|-------|---------|
| estado_cambiado | 🔄 | "Trámite #123 pasó a VERDE_ENTREGADO" |
| pago_pendiente | 💰 | "Nuevo pago de $5,000 MXN pendiente de verificar" |
| pedimento_nuevo | 📄 | "Pedimento 8765 agregado al trámite #123" |
| nota_agregada | 💬 | "Nuevo comentario en trámite #123" |
| cobro_completado | ✅ | "Trámite #123 ha sido cobrado en su totalidad" |

---

## Configuración (Engranaje)

### Opciones
1. **Página /configuracion** con secciones:
   - Perfil: nombre, email, avatar, cambio de contraseña
   - Preferencias: moneda predeterminada, huso horario, idioma
   - Notificaciones: qué eventos notificar, frecuencia (email/in-app)
   - Apariencia: tema claro/oscuro (a futuro)

2. **Modal rápido**: al hacer clic en el engranaje, un dropdown/modal con accesos directos a:
   - "Mi perfil" → `/configuracion/perfil`
   - "Preferencias" → `/configuracion/preferencias`
   - "Cerrar sesión"

### Recomendación MVP
- Por ahora el botón de settings puede navegar a `/configuracion` (página placeholder)
- Implementar perfil y preferencias cuando se necesite
- Lo más útil a corto plazo: configurar notificaciones y moneda predeterminada
