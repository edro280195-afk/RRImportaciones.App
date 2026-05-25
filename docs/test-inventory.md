# Inventario de Tests Pendientes — RR Importaciones

> Última actualización: 2026-05-25
> Tests existentes: ✅ FiscalCalculator, ✅ TramiteStateService (expandido)

## Prioridad Alta — Tests Críticos

### 1. AuthService (Login + Refresh Tokens)
**Riesgo:** Alto. Falla aquí = nadie puede entrar al sistema.

Métodos a testear:
- `LoginAsync()` — credenciales válidas vs inválidas
- `RefreshTokenAsync()` — token válido, token expirado, token revocado
- `PinLoginAsync()` — PIN de 6 dígitos, validación de formato
- `SetPinAsync()` — cambio de PIN con verificación del actual
- `LogoutAsync()` — marca refresh token como revocado

Dependencias a mockear:
- `AppDbContext` → usar `TestServer` o `Mock<DbSet<>>` con `EntityFrameworkCore.Testing`
- `IJwtService` → Moq fácil
- `IRealtimeNotifier` → Moq
- `IEmailService` → Moq

---

### 2. CotizadorService (Cálculo Fiscal)
**Riesgo:** Alto. Errores aquí = cotizaciones con valores incorrectos.

Métodos a testear:
- `CalcularCotizacion()` — integración con FiscalCalculator
- `ConvertirMoneda()` — tipo de cambio Banxico
- `GetPrecioEstimado()` — catálogo de precios por marca/año

Nota: `FiscalCalculator` ya tiene tests. El valor está en testear la capa de servicio que lo envuelve.

---

### 3. PortalAccessService (HMAC Token Clientes)
**Riesgo:** Alto. Seguridad del portal de clientes.

Métodos a testear:
- `GeneratePortalToken()` — generación de token HMAC
- `ValidatePortalToken()` — validación, expiración, manipulación

**Test edge cases:**
- Token expirado
- Firma alterada
- Datos dentro del token (tramiteId, clienteId)

---

### 4. PagoService
**Riesgo:** Alto. Maneja cobros y conciliación.

Métodos a testear:
- `RegistrarPago()` — actualización de saldo del trámite
- `VerificarPago()` — conciliación bancaria
- `GenerarReciboPdf()` → que no rompa, aunque el output visual se prueba manualmente

---

## Prioridad Media

### 5. TramiteService (Cambio de Estado)
Método `CambiarEstadoAsync()`:
- Valida la transición via `TramiteStateService`
- Guarda historial de estados
- Envía notificaciones SignalR

Nota: `TramiteStateService` (pure logic) ya tiene tests. Falta testear el servicio de aplicación que lo usa.

---

### 6. EmailService + WhatsAppCotizacionService
- Envío de cotización por email
- Envío de WhatsApp
- Plantillas de mensaje

Tests de contrato: ¿Generan el output esperado sin lanzar excepciones?

---

### 7. PDF Generators
- `CotizacionPdfService`
- `PagoReciboPdfService`

No necesitan tests de snapshot visual, pero sí:
- ¿No lanzan excepciones con datos normales?
- ¿No lanzan excepciones con datos nulos/vacíos? (edge cases)

---

## Prioridad Baja / Integraciones Externas

### 8. BanxicoService
- Tipo de cambio
- Manejo de errores de API externa

### 9. NhtsaService
- Decodificación de VIN
- Cacheo interno

### 10. FileStorageService (Cloudflare R2)
- Subir/descargar archivos
- URLs firmadas

---

## Cómo Empezar

### Opción 1: Unit Tests con Moq (rápido)
Para lógica de negocio sin EF:
```csharp
// TramiteStateService ya es ejemplo de esto
var sut = new MiServicioSinDependencias();
var result = sut.Metodo(input);
result.Should().Be(expected);
```

### Opción 2: Test con EF Core InMemory
Para servicios que usan DbContext:

1. Instalar paquete:
```
dotnet add package Microsoft.EntityFrameworkCore.InMemory --version 10.0.0
```

2. Patrón:
```csharp
var options = new DbContextOptionsBuilder<AppDbContext>()
    .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
    .Options;

using var context = new AppDbContext(options);
// Seed datos de prueba
context.Usuarios.Add(usuarioTest);
context.SaveChanges();

var sut = new AuthService(context, jwtMock.Object, ...);
// Act + Assert
```

### Opción 3: Integration Tests con WebApplicationFactory
Para tests de controladores/end-to-end:
```csharp
// Programa.cs
public partial class Program { }

// Tests
using var factory = new WebApplicationFactory<Program>();
var client = factory.CreateClient();
var response = await client.GetAsync("/api/tramites");
response.StatusCode.Should().Be(HttpStatusCode.OK);
```

---

## Coverage Actual

| Componente | Cobertura | Estado |
|---|---|---|
| FiscalCalculator | 100% aprox | ✅ Listo |
| TramiteStateService | ~90% | ✅ Expandido 2026-05-25 |
| AuthService | 0% | 🔴 Pendiente (Alta) |
| CotizadorService | 0% | 🔴 Pendiente (Alta) |
| PagoService | 0% | 🔴 Pendiente (Alta) |
| PortalAccessService | 0% | 🔴 Pendiente (Alta) |
| Todo lo demás | 0% | 🟡 Pendiente |

---

## Siguiente Paso Recomendado

1. **Instalar:** `Microsoft.EntityFrameworkCore.InMemory` en RR.Tests
2. **Escribir:** Primer test de AuthService para login con credenciales inválidas
3. **Configurar:** `coverlet` para generar reportes de cobertura en XML/HTML
