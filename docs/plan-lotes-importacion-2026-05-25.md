# Plan: Lotes de importacion para multiples vehiculos

Fecha: 2026-05-25  
Proyecto: R&R Importaciones  
Objetivo: permitir que un cliente maneje de 3 a 15 vehiculos en una sola operacion sin romper el flujo actual de tramites individuales.

## Resumen ejecutivo

La solucion optima es agregar un **Lote de importacion** como expediente padre y mantener el modelo actual de **un tramite por vehiculo** como unidad operativa.

En palabras simples: el lote es la carpeta; cada tramite sigue siendo una hoja dentro de esa carpeta. Asi no se rompe lo ya armado, porque pagos, campo, documentos, pedimentos, portal, reportes y estados ya dependen de `TramiteId`.

No conviene convertir `Tramite` en multi-vehiculo. Eso obligaria a rehacer demasiadas reglas:

- Un VIN por tramite.
- Una tarea de campo por unidad.
- Un pedimento por unidad.
- Una entrega por unidad.
- Documentos y estados que avanzan diferente por vehiculo.
- Saldos que hoy se calculan por `TramiteId`.

La mejora real es que el usuario pueda crear, revisar, cobrar y dar seguimiento al grupo desde una pantalla de lote, mientras el sistema conserva los tramites individuales por debajo.

## Estado actual encontrado

Se encontraron artefactos previos de otro intento de implementacion:

- `backend/RR.Domain/Entities/LoteImportacion.cs` ya existe como entidad nueva.
- `backend/RR.Domain/Entities/Tramite.cs` ya tiene `LoteId` y navegacion `Lote`.
- `backend/RR.Infrastructure/Data/AppDbContext.cs` ya tiene `DbSet<LoteImportacion>`.
- `backend/RR.Application/DTOs/LotesImportacion/` ya tiene DTOs iniciales (`CreateLoteRequest`, `LoteListDto`, `LoteDetailDto`).
- Hay cambios en gastos operativos para que un gasto pueda ser general o asociado a tramite.

Estos cambios no deben tomarse como base aprobada. La idea general de un lote padre va en la direccion correcta, pero la implementacion actual esta incompleta y puede estorbar si se construye encima sin revisarla.

Antes de implementar, hay que decidir archivo por archivo si se conserva, se corrige o se elimina. El plan de abajo describe la solucion objetivo, no una validacion de ese intento previo.

Problemas del intento actual:

- No tiene configuracion EF completa para `LoteImportacion`.
- No tiene migracion de base de datos.
- No tiene servicio ni controlador.
- No define reglas de negocio para pagos, documentos, estados ni creacion masiva.
- No resuelve el flujo de captura de 3 a 15 vehiculos.
- No prueba que los tramites existentes sin lote sigan funcionando igual.
- Mezcla cambios de gastos operativos que deben revisarse aparte para evitar meter dos cambios grandes en la misma fase.

## Modelo recomendado

### Entidad padre: `LoteImportacion`

Debe representar la operacion agrupada del cliente.

Campos recomendados:

| Campo | Tipo | Uso |
|---|---|---|
| `Id` | `Guid` | Identificador interno |
| `TenantId` | `Guid` | Multi-tenant |
| `FolioLote` | `string` | Folio visible, ejemplo `LOT-202605-0001` |
| `ClienteId` | `Guid` | Cliente dueño del grupo |
| `AduanaId` | `Guid?` | Aduana comun por defecto |
| `TramitadorId` | `Guid?` | Tramitador comun por defecto |
| `TipoTramite` | `string` | Normal, express, asesoria, etc. |
| `Estado` | `string` | Estado agregado del lote |
| `FechaCruce` | `DateTime?` | Fecha comun si aplica |
| `Notas` | `string?` | Notas generales del lote |
| `FechaCreacion` | `DateTime` | Auditoria simple |
| `FechaModificacion` | `DateTime?` | Auditoria simple |
| `DeletedAt` | `DateTime?` | Recomendado para soft delete |

Estados sugeridos para lote:

- `BORRADOR`: lote capturado, sin tramites generados todavia.
- `EN_PROCESO`: tiene tramites activos.
- `PARCIALMENTE_CERRADO`: algunos vehiculos ya terminaron.
- `CERRADO`: todos los tramites hijos estan entregados/cobrados o cancelados.
- `CANCELADO`: lote cancelado administrativamente.

Importante: el estado del lote no reemplaza el estado logistico de cada tramite. El lote solo resume.

### Relacion con `Tramite`

`Tramite.LoteId` debe ser nullable para no afectar datos existentes.

Regla:

- Tramite normal existente: `LoteId = null`.
- Tramite creado dentro de lote: `LoteId = lote.Id`.

Con esto, todas las pantallas actuales siguen funcionando. La nueva pantalla de lote solo filtra y agrupa tramites.

### Documentos compartidos

Agregar una entidad nueva en fase 2:

`LoteDocumento`

Uso:

- Guardar documentos comunes una sola vez, por ejemplo INE del cliente, autorizacion, comprobantes generales o documentos compartidos.
- Mantener `TramiteDocumento` para documentos especificos por vehiculo, como titulo, factura, baja y pedimento.

Campos base:

- `Id`
- `TenantId`
- `LoteId`
- `TipoDocumento`
- `Nombre`
- `EstadoLogistico`
- `ArchivoUrl`
- `Notas`
- `FechaRecibido`
- `FechaValidado`
- `ValidadoPor`

### Pagos de lote

Regla principal: **el sistema no debe repartir automaticamente un pago de lote entre vehiculos**.

La asignacion del pago debe decidirla el usuario, porque en operacion real el cliente puede decir: "este pago es para la Tahoe" o "aplicalo al VIN que termina en 123456". Si el sistema decide solo, despues puede haber quejas o aclaraciones dificiles de defender.

Modelo recomendado:

- `PagoLote` guarda el deposito/comprobante original recibido para el lote.
- `PagoLoteAplicacion` guarda a que tramite/vehiculo se aplico cada parte del pago.
- `Pago` sigue existiendo por tramite para conservar saldos, reportes, recibos y verificacion actual.
- Cada aplicacion debe registrar usuario, fecha y nota opcional.
- Si el usuario no sabe todavia a que vehiculo aplicarlo, el pago queda como `saldoSinAplicar` del lote y no reduce el saldo de ningun tramite.

Flujo de UI recomendado:

1. El usuario registra el pago recibido en el lote: monto, moneda, banco, referencia, comprobante.
2. El sistema muestra los tramites/vehiculos del lote con VIN corto, descripcion y saldo pendiente.
3. El usuario captura cuanto se aplica a cada vehiculo.
4. El sistema valida que ninguna aplicacion exceda el saldo de ese tramite.
5. El sistema valida que la suma aplicada no exceda el monto recibido.
6. Lo no aplicado queda visible como `Sin aplicar`.
7. El usuario puede aplicar el saldo pendiente despues, con historial.

El sistema puede ofrecer un boton secundario tipo `Sugerir distribucion`, pero no debe guardar nada sin confirmacion del usuario. La accion primaria debe ser una asignacion explicita.

Esto agrega un poco mas de modelo financiero, pero evita el riesgo operativo mas caro: que R&R aplique dinero a un vehiculo distinto al que pidio el cliente.

### Gastos operativos

La mejora en curso de gastos va bien. Para lotes hay dos opciones:

Opcion recomendada en fase 1:

- Los gastos cargables se asocian al tramite especifico cuando corresponden a un vehiculo.
- Los gastos generales se quedan sin tramite y sin vehiculo.
- Si un gasto general corresponde al lote completo, se reparte manual o automaticamente a los tramites hijos cuando se necesite cobrarlo al cliente.

Opcion recomendada en fase 2:

- Agregar `LoteId` nullable a `GastoHormiga`.
- Permitir gastos generales de lote sin asignarlos de inmediato a un vehiculo.
- En saldos del lote se suman gastos por `LoteId` y por tramites hijos.

## Backend propuesto

### Nuevos DTOs

Usar la carpeta ya iniciada:

`backend/RR.Application/DTOs/LotesImportacion/`

DTOs:

- `CreateLoteRequest` (ya iniciado)
- `UpdateLoteRequest` (ya iniciado)
- `LoteListDto` (ya iniciado)
- `LoteDetailDto` (ya iniciado)
- `LoteTramiteResumenDto`
- `LoteVehiculoInputDto`
- `CreateTramitesFromLoteRequest`
- `LotePagoRequest`
- `LoteDocumentoDto`

`CreateLoteRequest` debe aceptar datos comunes:

- `ClienteId`
- `AduanaId`
- `TramitadorId`
- `TipoTramite`
- `Notas`
- Lista de vehiculos a importar

Cada vehiculo debe tener:

- `Vin`
- `MarcaId` o `MarcaTexto`
- `Modelo`
- `Anno`
- `CilindradaCm3`
- `Categoria`
- `ValorFactura`
- `DescripcionMercancia`
- `CobroTotal`
- `Honorarios`
- `Notas`

### Nuevo servicio

Crear:

- `backend/RR.Application/Interfaces/ILoteImportacionService.cs`
- `backend/RR.Infrastructure/Services/LoteImportacionService.cs`

Responsabilidades:

- Crear lote.
- Agregar vehiculos/tramites al lote.
- Listar lotes con resumen financiero.
- Obtener detalle con tramites hijos.
- Actualizar datos generales del lote.
- Aplicar pagos al lote.
- Ejecutar acciones masivas seguras.
- Recalcular estado agregado del lote.

Regla importante: cuando se creen tramites desde lote, usar una transaccion. Si falla un vehiculo, no deben quedar 7 tramites creados y 1 fallido a medias.

### Nuevo controlador

Crear:

`backend/RR.Api/Controllers/LotesImportacionController.cs`

Endpoints sugeridos:

- `GET /api/lotes`
- `GET /api/lotes/{id}`
- `POST /api/lotes`
- `PUT /api/lotes/{id}`
- `POST /api/lotes/{id}/tramites`
- `POST /api/lotes/{id}/pagos`
- `POST /api/lotes/{id}/documentos`
- `POST /api/lotes/{id}/recalcular-estado`
- `POST /api/lotes/{id}/cancelar`

### Cambios en servicios existentes

`TramiteService`

- Incluir `LoteId` y `FolioLote` en `TramiteListDto` y `TramiteDetailDto`.
- Permitir filtrar por `loteId`.
- No cambiar comportamiento cuando `LoteId` sea null.

`CotizadorService`

- Fase 1: dejar conversion individual igual.
- Fase 2: agregar conversion multiple desde varias cotizaciones aceptadas hacia un lote.

`PagoService`

- No modificar el contrato actual.
- Crear logica nueva en `LoteImportacionService` para pagos de lote con asignacion manual.
- Crear `PagoLote` y `PagoLoteAplicacion` cuando se implemente el cobro consolidado.
- Crear registros `Pago` por tramite solo cuando el usuario asigne monto a ese tramite.
- Mantener como `saldoSinAplicar` cualquier parte del pago que todavia no tenga tramite destino.
- Reutilizar validaciones actuales de saldo, moneda, banco y comprobante.

`ReporteService`

- Mantener reportes por tramite.
- Agregar vista agrupada por lote en fase 2.
- En estado de cuenta por cliente, mostrar lote como agrupador visual, pero conservar detalle de cada tramite.

`CampoService`

- No cambiar tarea de campo: sigue siendo por tramite/vehiculo.
- En lote, mostrar todas las tareas de los hijos y permitir crear tareas por seleccion multiple.

`PortalAccessService`

- Fase 1: portal por tramite queda igual.
- Fase 2: portal por lote con token propio para que el cliente vea todas sus unidades en una sola liga.

## Base de datos y migraciones

### Migracion fase 1

Crear migracion:

`AddLotesImportacion`

Debe incluir:

- Tabla `LotesImportacion`.
- Columna nullable `Tramites.LoteId`.
- FK `Tramites.LoteId -> LotesImportacion.Id`.
- Indice unico `TenantId + FolioLote`.
- Indice `TenantId + ClienteId`.
- Indice `TenantId + Estado`.
- Indice `Tramites.TenantId + LoteId`.

Config EF requerida en `AppDbContext`:

- MaxLength para `FolioLote`, `Estado`, `TipoTramite`.
- `Notas` como `text`.
- relacion con `Tenant`, `Cliente`, `Aduana`, `Tramitador`.
- query filter por tenant y `DeletedAt == null` si se agrega soft delete.
- `OnDelete(DeleteBehavior.SetNull)` o `Restrict` para `Tramite.LoteId`; no usar cascade.

### Folios

Crear un generador dedicado:

- Lote: `LOT-YYYYMM-0001`
- Tramites hijos siguen usando `RR-0001`, `RR-0002`, etc.

Riesgo actual: `GenerateTramiteNumeroAsync` usa `Max()` + 1. En creacion masiva funciona dentro de una transaccion, pero puede fallar con concurrencia real.

Recomendacion:

- Fase 1: generar numeros dentro de una transaccion y guardar todo junto.
- Fase 2: mover folios a una tabla/servicio de consecutivos por tenant y tipo de folio.

## Frontend propuesto

### Nuevo modulo/paginas Angular

Crear:

- `frontend/src/app/services/lote-importacion.service.ts`
- `frontend/src/app/pages/lotes/lotes-list.component.ts`
- `frontend/src/app/pages/lotes/lote-detail.component.ts`
- `frontend/src/app/pages/lotes/lote-form.component.ts`

Rutas:

- `/lotes`
- `/lotes/nuevo`
- `/lotes/:id`

Sidebar/topbar:

- Agregar entrada: `Lotes`
- Permiso sugerido: `LOTES_VER`, `LOTES_CREAR`, `LOTES_EDITAR`, `LOTES_PAGOS`

### Lista de lotes

Debe mostrar:

- Folio lote.
- Cliente.
- Cantidad de vehiculos.
- Avance: `8/12 completados`.
- Aduana.
- Tramitador.
- Total cobrado.
- Total pagado.
- Saldo.
- Estado agregado.
- Fecha creacion.

Filtros:

- Cliente.
- Estado.
- Aduana.
- Tramitador.
- Rango de fechas.
- Busqueda por folio, cliente, VIN o numero de tramite hijo.

### Detalle de lote

La pantalla debe ser el centro operativo para el caso multi-vehiculo.

Secciones:

1. Header del lote:
   - Folio.
   - Cliente.
   - Estado.
   - Cantidad de vehiculos.
   - Acciones principales.

2. Resumen financiero:
   - Total del lote.
   - Pagado.
   - Saldo.
   - Gastos cargables.
   - Pagos pendientes de verificar.

3. Tabla de vehiculos/tramites hijos:
   - Numero de tramite.
   - VIN corto.
   - Marca/modelo/año.
   - Estado logistico.
   - Pedimento.
   - Campo.
   - Entrega.
   - Saldo.
   - Accion: ver tramite.

4. Acciones masivas:
   - Crear tareas de campo para seleccionados.
   - Registrar documento compartido.
   - Registrar pago de lote con asignacion manual por vehiculo.
   - Cambiar tramitador/aduana para seleccionados.
   - Cancelar seleccionados.

5. Timeline de lote:
   - Eventos generales del lote.
   - Opcional: eventos importantes de hijos.

6. Documentos compartidos:
   - INE.
   - Autorizaciones.
   - Comprobantes generales.

### Alta de lote

Wizard recomendado:

Paso 1: datos generales

- Cliente.
- Aduana.
- Tramitador.
- Tipo de tramite.
- Notas.

Paso 2: vehiculos

Opciones:

- Captura manual en tabla editable.
- Pegar desde Excel.
- Agregar fila.
- Validar VIN duplicado.
- Validar vehiculo ya registrado en el sistema.

Paso 3: importes

- Permitir total por unidad.
- Permitir honorarios por unidad.
- Permitir aplicar mismo honorario a todos.
- Mostrar total general del lote.

Paso 4: confirmacion

- Vista previa de los tramites que se generaran.
- Boton: `Crear lote y tramites`.

## Integracion con cotizaciones

### Fase 1

Mantener cotizacion individual. Para casos donde ya se tiene el trato cerrado, crear lote manualmente y generar tramites hijos.

### Fase 2

Agregar cotizacion multiple:

- `CotizacionGrupo` como folio padre.
- Cada vehiculo sigue siendo una `Cotizacion` hija para no romper calculos fiscales.
- PDF de cotizacion consolidado con una tabla por vehiculo.
- Aceptar grupo.
- Convertir grupo aceptado a lote.

Modelo sugerido:

- `CotizacionGrupo`
- `Cotizacion.GrupoId` nullable
- `CotizacionGrupo.Folio`
- `CotizacionGrupo.ClienteId`
- `CotizacionGrupo.Estado`
- `CotizacionGrupo.TotalGeneral`

## Reglas de negocio clave

- Un lote puede tener de 1 a N tramites, aunque la UI lo use principalmente para 3 a 15.
- Un tramite puede existir sin lote.
- Un tramite solo puede pertenecer a un lote.
- Todos los tramites de un lote deben pertenecer al mismo cliente.
- Aduana y tramitador pueden heredarse del lote, pero un tramite hijo debe poder ajustarse si hay excepciones.
- El lote no debe permitir marcarse cerrado si hay tramites hijos con saldo pendiente o estados no terminales, salvo que sean cancelados.
- Las acciones masivas deben respetar las mismas validaciones del tramite individual.
- Un pago de lote no debe aplicarse automaticamente a ningun vehiculo.
- La suma aplicada por el usuario no debe sobrepasar el monto recibido.
- La aplicacion a un vehiculo no debe sobrepasar el saldo pendiente de ese tramite.
- El dinero sin asignar debe quedar visible como saldo del lote `sin aplicar`, no como pago del vehiculo.
- Una unidad con VIN duplicado no debe crear vehiculo duplicado.

## Plan por fases

### Fase 0: cerrar el diseño tecnico

- [ ] Confirmar si el nombre visible sera `Lote`, `Expediente`, `Grupo` o `Operacion`.
- [ ] Confirmar si R&R quiere un folio tipo `LOT-202605-0001` o algo mas cercano a su operacion.
- [ ] Confirmar si pagos de lote entran desde fase 1 o se dejan para fase 2.
- [ ] Confirmar si el pago de lote necesita recibo consolidado, recibos por vehiculo o ambos.
- [ ] Confirmar si la cotizacion multiple entra desde el inicio o se deja para fase 2.
- [ ] Revisar artefactos previos y limpiar lo que no se vaya a usar antes de crear migraciones.
- [ ] Separar el cambio de gastos operativos del cambio de lotes, salvo que se decida meterlo conscientemente en la misma fase.

### Fase 1: base sin romper nada

Objetivo: crear lotes y generar tramites hijos normales.

Backend:

- [ ] Completar entidad `LoteImportacion`.
- [ ] Configurar EF en `AppDbContext`.
- [ ] Crear migracion `AddLotesImportacion`.
- [ ] Completar DTOs existentes en `DTOs/LotesImportacion`.
- [ ] Agregar `ILoteImportacionService`.
- [ ] Crear `LoteImportacionService`.
- [ ] Crear `LotesImportacionController`.
- [ ] Agregar `LoteId` y `FolioLote` a DTOs de tramite.
- [ ] Agregar filtro `loteId` a lista de tramites.
- [ ] Crear pruebas backend de creacion de lote con multiples tramites.

Frontend:

- [ ] Crear `lote-importacion.service.ts`.
- [ ] Crear `/lotes`.
- [ ] Crear `/lotes/nuevo`.
- [ ] Crear `/lotes/:id`.
- [ ] Agregar enlace en sidebar.
- [ ] Mostrar badge de lote en lista/detalle de tramite.

Validacion:

- [ ] Crear lote con 3 vehiculos.
- [ ] Crear lote con 15 vehiculos.
- [ ] Ver que cada tramite hijo abre en pantalla actual.
- [ ] Ver que un tramite existente sin lote sigue abriendo igual.
- [ ] Ver que dashboard, pagos y campo no fallan con `LoteId = null`.

### Fase 2: operacion agrupada real

Objetivo: trabajar el lote desde una sola pantalla.

- [ ] Acciones masivas sobre tramites seleccionados.
- [ ] Pago a lote con asignacion manual por tramite/vehiculo.
- [ ] Saldo de pago de lote sin aplicar.
- [ ] Documentos compartidos del lote.
- [ ] Gastos de lote o reparto de gastos cargables.
- [ ] Resumen financiero consolidado.
- [ ] Estado agregado automatico del lote.
- [ ] Filtro por lote en pagos, gastos y campo.
- [ ] Estado de cuenta del cliente agrupado por lote.

### Fase 3: cotizacion multiple

Objetivo: cotizar 3 a 15 vehiculos desde una sola captura.

- [ ] Crear `CotizacionGrupo`.
- [ ] Agregar `GrupoId` nullable a `Cotizacion`.
- [ ] Crear cotizacion multiple desde tabla editable.
- [ ] Generar PDF consolidado.
- [ ] Enviar WhatsApp/correo con total y desglose.
- [ ] Aceptar/rechazar grupo.
- [ ] Convertir grupo aceptado a lote.

### Fase 4: portal cliente por lote

Objetivo: que el cliente vea todas sus unidades en una sola liga.

- [ ] Crear token de portal para lote.
- [ ] Crear endpoint publico de lote.
- [ ] Crear vista portal con lista de vehiculos.
- [ ] Mostrar estado por unidad.
- [ ] Mostrar documentos disponibles por unidad.
- [ ] Mostrar saldo general y pagos aplicados.

## Pruebas requeridas

Backend:

- [ ] Crear lote sin romper tramites sin lote.
- [ ] Crear lote con 15 vehiculos en una transaccion.
- [ ] Validar que no acepta VIN duplicado dentro del mismo lote.
- [ ] Validar que no acepta vehiculo de otro cliente.
- [ ] Validar calculo de total, pagado y saldo de lote.
- [ ] Validar pago a lote con asignacion manual exacta.
- [ ] Validar pago a lote parcialmente sin aplicar.
- [ ] Validar que el sistema no aplica pagos automaticamente a tramites hijos.
- [ ] Validar que una accion masiva respeta la maquina de estados.
- [ ] Validar tenant filter en lotes.

Frontend:

- [ ] Alta de lote manual.
- [ ] Pegar multiples filas tipo Excel.
- [ ] Lote detail con 15 tramites sin que la UI se vuelva incomoda.
- [ ] Navegacion lote -> tramite -> volver.
- [ ] Pago de lote con validaciones visibles.
- [ ] Mobile basico para consulta, no necesariamente captura masiva.

Regresion:

- [ ] Crear tramite individual como antes.
- [ ] Convertir cotizacion individual a tramite como antes.
- [ ] Registrar pago individual como antes.
- [ ] Subir documento de tramite como antes.
- [ ] Crear tarea de campo individual como antes.
- [ ] Portal de tramite individual como antes.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Romper pantallas actuales por asumir `LoteId` obligatorio | Alto | `LoteId` siempre nullable y DTOs compatibles |
| Duplicar vehiculos por VIN | Alto | validar VIN normalizado antes de crear |
| Pagos consolidados mal aplicados | Alto | asignacion manual obligatoria por vehiculo y saldo sin aplicar visible |
| Folios duplicados en creacion masiva | Medio | transaccion y retry; fase 2 servicio de consecutivos |
| UI demasiado pesada para 15 vehiculos | Medio | tabla densa con acciones por seleccion y resumen fijo |
| Estados de lote confundidos con estados de tramite | Medio | lote resume; tramite manda la operacion real |

## Archivos a crear

Backend:

- `backend/RR.Application/DTOs/LotesImportacion/LoteTramiteResumenDto.cs`
- `backend/RR.Application/DTOs/LotesImportacion/LotePagoRequest.cs`
- `backend/RR.Application/DTOs/LotesImportacion/LotePagoAplicacionRequest.cs`
- `backend/RR.Application/DTOs/LotesImportacion/LoteDocumentoDto.cs`
- `backend/RR.Application/Interfaces/ILoteImportacionService.cs`
- `backend/RR.Infrastructure/Services/LoteImportacionService.cs`
- `backend/RR.Api/Controllers/LotesImportacionController.cs`
- `backend/RR.Migrations/Migrations/*_AddLotesImportacion.cs`
- `backend/RR.Tests/Services/LoteImportacionServiceTests.cs`

Frontend:

- `frontend/src/app/services/lote-importacion.service.ts`
- `frontend/src/app/pages/lotes/lotes-list.component.ts`
- `frontend/src/app/pages/lotes/lote-detail.component.ts`
- `frontend/src/app/pages/lotes/lote-form.component.ts`

Fase 2, si se implementan documentos/pagos consolidados:

- `backend/RR.Domain/Entities/LoteDocumento.cs`
- `backend/RR.Domain/Entities/PagoLote.cs`
- `backend/RR.Domain/Entities/PagoLoteAplicacion.cs`
- `backend/RR.Domain/Entities/CotizacionGrupo.cs`

## Cambios a archivos existentes

Backend:

- `backend/RR.Application/DTOs/LotesImportacion/CreateLoteRequest.cs`
- `backend/RR.Application/DTOs/LotesImportacion/LoteListDto.cs`
- `backend/RR.Application/DTOs/LotesImportacion/LoteDetailDto.cs`
- `backend/RR.Domain/Entities/LoteImportacion.cs`
- `backend/RR.Domain/Entities/Tramite.cs`
- `backend/RR.Infrastructure/Data/AppDbContext.cs`
- `backend/RR.Application/DTOs/Tramites/TramiteListDto.cs`
- `backend/RR.Application/DTOs/Tramites/TramiteDetailDto.cs`
- `backend/RR.Application/Interfaces/ITramiteService.cs`
- `backend/RR.Infrastructure/Services/TramiteService.cs`
- `backend/RR.Api/Controllers/TramitesController.cs`
- `backend/RR.Api/Program.cs`

Frontend:

- `frontend/src/app/app.routes.ts`
- `frontend/src/app/layout/sidebar/sidebar.component.ts`
- `frontend/src/app/services/tramite.service.ts`
- `frontend/src/app/pages/tramites/tramites-list.component.ts`
- `frontend/src/app/pages/tramites/tramite-detail.component.ts`

## Decision final recomendada

Implementar primero `LoteImportacion` como capa padre, sin cambiar el significado actual de `Tramite`.

Esto permite capturar 3 a 15 vehiculos en una sola operacion, verlos juntos, cobrar juntos y operar por lote, pero mantiene intacta la parte delicada del sistema: cada vehiculo con su tramite, su estado, su pedimento, sus documentos, su campo, sus pagos y su entrega.

La reestructuracion existe, pero es controlada. No es tirar lo actual; es ponerle una capa arriba.
