# Kit de Arranque — Sistema R&R Importaciones
## Prompts estructurados para construcción con Claude Code

> Este documento contiene los **5 prompts** que vas a pasar secuencialmente a Claude Code para construir el MVP completo del sistema R&R. Cada prompt está diseñado para una sesión independiente con contexto autocontenido.
>
> **Stack confirmado:** Angular 19 + .NET 8 Web API + PostgreSQL 16.
> **Modelo:** Multi-tenant desde el día uno, operación single-tenant.
> **Ruta del proyecto:** `C:\Codigos\RRImportaciones\`

---

## Mapa de fases

```
FASE 0 — SETUP INICIAL                            (1 sesión Claude Code)
├─ Estructura del proyecto (Angular + API)
├─ Base de datos PostgreSQL multi-tenant
├─ Autenticación JWT + roles
├─ Layout principal (sidebar + topbar + dashboard vacío)
└─ Seeds de catálogos base
        ▼
CAMINO A — TRÁMITES                               (3 sesiones Claude Code)
├─ A1: Clientes + Vehículos
├─ A2: Trámites + Pedimentos + Estados
└─ A3: Pagos + Gastos hormiga + Migración histórica
        ▼
CAMINO B — COTIZADOR                              (2 sesiones Claude Code)
├─ B1: NHTSA + Banxico + Búsqueda en tabuladores
└─ B2: Cálculo fiscal + PDF + Envío WhatsApp/Email
        ▼
INTEGRACIÓN A+B                                   (1 sesión Claude Code)
└─ Cotización aceptada → conversión automática a trámite
```

**Tiempo total estimado:** 6-7 sesiones de Claude Code, ~6-8 semanas calendario asumiendo iteración y QA después de cada sesión.

---

## Cómo usar este documento

1. Lee este documento completo antes de pasar ningún prompt.
2. Crea la carpeta `C:\Codigos\RRImportaciones\` vacía.
3. Pega el **Prompt 0** completo a Claude Code y déjalo correr hasta el final. Revisa lo que construyó.
4. Cuando estés conforme con la Fase 0, pasa el **Prompt A1**. Repite.
5. Las fases A1, A2, A3 son secuenciales. No saltes orden.
6. Las fases B1, B2 también son secuenciales. Puedes hacerlas **después** de toda A o **en paralelo** después de A1 (porque B no depende de pagos ni gastos hormiga, solo de clientes y vehículos).
7. La **Integración A+B** se hace al final, cuando ambos caminos están operativos.

---

# PROMPT 0 — Setup inicial del proyecto

Copia este bloque completo a Claude Code:

---

```
Vas a inicializar el proyecto "RR Importaciones" — un sistema SaaS multi-tenant para 
agencias de importación de vehículos en la frontera norte de México. Cliente fundador: 
R&R Importaciones (Nuevo Laredo). Arquitectura multi-tenant pero operación inicial 
single-tenant.

## STACK Y RUTAS

- Frontend: Angular 19, standalone components, signals, Tailwind CSS, 
  PrimeNG (componentes), JetBrains Mono + Inter como fuentes base.
- Backend: .NET 8 Web API en C#, arquitectura limpia (Domain, Application, 
  Infrastructure, API), Dapper + EF Core híbrido (Dapper para queries de lectura 
  intensiva, EF Core para escrituras y migrations).
- DB: PostgreSQL 16 con extensiones pgcrypto y pg_trgm.
- Auth: JWT con refresh tokens, BCrypt para hashing.
- Ruta: C:\Codigos\RRImportaciones\
  ├─ frontend\        (Angular)
  └─ backend\         (.NET solution)
       ├─ RR.Api\
       ├─ RR.Application\
       ├─ RR.Domain\
       ├─ RR.Infrastructure\
       └─ RR.Migrations\  (proyecto separado para EF Core migrations)

## CONVENCIONES DE CÓDIGO (NO NEGOCIABLES)

- Variables, métodos y nombres de archivos: en INGLÉS (ej: GetTramitesByCliente, 
  customerRepository, tramite-list.component.ts).
- Comentarios en código: en ESPAÑOL natural cuando agreguen contexto de negocio.
- Strings de UI visibles al usuario: en ESPAÑOL.
- Mensajes de commit: en ESPAÑOL natural.
- Tablas de DB: en español (clientes, tramites, vehiculos), columnas en 
  snake_case en español (fecha_inicio, numero_consecutivo).
- Endpoints API: en inglés, kebab-case (/api/tramites, /api/cotizaciones/draft).
- NO usar AutoMapper. Usa proyecciones manuales en LINQ.
- NO usar MediatR. Servicios planos con interfaces.
- Validación: FluentValidation.
- Logs: Serilog estructurado a archivo + consola.

## MULTI-TENANCY

Cada tabla de negocio tiene columna tenant_id (UUID, FK a tenants). Los catálogos 
GLOBALES (aduanas, fracciones_arancelarias, marcas, precios_estimados) NO tienen 
tenant_id — son compartidos por todos los tenants.

El tenant_id se extrae del JWT en cada request y se inyecta automáticamente vía 
filtro global de EF Core (HasQueryFilter) y middleware para queries Dapper. 
Crear servicio ITenantContext que expone el tenant_id activo.

## BASE DE DATOS — Schema completo

Crear migration inicial con TODO este schema. PostgreSQL, no MySQL.

[Schema SQL completo — ver sección "SCHEMA SQL COMPLETO" al final de este prompt]

## SEED INICIAL

Insertar:

1. Tenant "R&R Importaciones" (UUID fijo: a0000000-0000-0000-0000-000000000001) con 
   razón social "R&R Importaciones SA de CV", RFC pendiente.

2. Usuario admin inicial:
   - username: admin
   - password: Stejrskal*4 (BCrypt hash en el seed)
   - rol: ADMIN
   - tenant: el de R&R

3. Catálogo aduanas con patente (extraído del análisis del CSV histórico):
   Aduana: 240 - Patentes: 1785, 3583 y 1945 - Ciudad: Nuevo Laredo - Estado: Tamaulipas

4. Catálogo fracciones arancelarias (de los TABULADORES):
   8703.22.02 - Automóviles 1.0 a 1.5 L
   8703.23.02 - Automóviles 1.6 a 3.0 L (y camionetas inciso B)
   8703.24.02 - Automóviles 3.1+ L (y camionetas inciso B)
   8703.32.02 - Híbridos diésel
   8703.33.02 - Eléctricos / híbridos
   8703.40.02 - Híbridos enchufables
   8703.60.02 - Otros híbridos
   8704.21.04 - Camiones < 5 ton
   8704.22.07 - Camiones medianos
   8704.23.02 - Tractocamiones
   8704.31.05 - Pick-ups
   8704.32.07 - Pick-ups pesadas
   8701.21.01 - Tractores carrete.

5. Catálogo tipos de gasto hormiga:
   COMBUSTIBLE: Gasolina, Diésel, Aceite
   TRANSPORTE: Flete, Pensión, Cruce americano
   DOCUMENTACION: Bill of Sale, Permiso, Copias, Holograma
   SERVICIOS: Cerrajero, Seguro extra, Lavado
   OTROS: (catch-all)

6. Roles + permisos base:
   - ADMIN: todo
   - GERENTE: todo excepto borrar trámites y modificar usuarios
   - OPERADOR: ver y editar trámites, pagos, cotizaciones; no ve reportes financieros 
     totales
   - CAPTURISTA: solo crear cotizaciones y registrar pagos
   - CAMPO: solo crear eventos (notas, fotos) en trámites asignados; sin acceso a 
     montos

7. Parámetros fiscales iniciales (dos regímenes, tomados del TABULADOR 2026):
   - POST_2017: igi=0.10, dta=0.008, iva=0.16, prev_fijo=0, prv_fijo=0
   - PRE_2016: igi=0.50, dta_fijo=408, iva=0.16, prev_fijo=240, prv_fijo=290

   Importante: el MVP debe respetar los cálculos actuales de R&R tal como vienen en
   la pestaña TABULADOR del Excel. El IGI NO se busca por fracción en esta fase.
   Los porcentajes se guardan en `parametros_fiscales` para que un ADMIN pueda
   modificarlos y conservar histórico por vigencia. La comparación contra DOF puede
   agregarse después como referencia para el administrador, no como regla automática
   del cálculo inicial.

## AUTENTICACIÓN

- POST /api/auth/login → email/username + password → JWT (15 min) + refresh token 
  (7 días).
- POST /api/auth/refresh → refresh token → nuevo JWT.
- POST /api/auth/logout → invalida refresh token.
- Middleware que valida JWT en endpoints protegidos.
- El JWT contiene: user_id, tenant_id, rol, exp.
- Refresh tokens guardados en tabla con hash, revocables por user_id.

## LAYOUT PRINCIPAL ANGULAR

Crear shell de aplicación con:

1. **Login page** (/login):
   - Logo R&R (texto estilizado: R&R en rojo, ampersand en negro itálica)
   - Formulario simple username + password
   - Tema claro, profesional (NO oscuro, NO con efectos de gaming)
   - Paleta: blanco roto #faf9f7 fondo, blanco surface, rojo #B0181F como acento, 
     negro #1c1917 texto

2. **App shell** (rutas protegidas):
   - Sidebar izquierdo (240px) con módulos:
     OPERACIÓN: Inicio, Clientes, Vehículos, Trámites, Pedimentos, Inventario
     COTIZACIONES: Nueva cotización, Histórico
     FINANZAS: Pagos, Gastos hormiga
     CATÁLOGOS: Marcas, Aduanas, Tramitadores, Personal, Partners
     ADMINISTRACIÓN: Usuarios, Roles, Auditoría, Parámetros fiscales
   - Topbar (56px) con: breadcrumb, búsqueda global (Cmd+K), notificaciones, 
     selector de usuario
   - Tipografía: Source Serif 4 para títulos de sección, Inter para body, 
     JetBrains Mono para datos numéricos (montos, VIN, fechas).
   - Sidebar y topbar fijos, contenido scrolleable.

3. **Inicio (/inicio)**:
   - Placeholder con 4 tarjetas: "Trámites activos", "Cobrado del mes", 
     "Por cobrar", "Vehículos en patio". Por ahora con datos mock (0, $0, $0, 0).
   - Sección "Requiere atención" vacía con texto "No hay asuntos pendientes".

## ENTREGABLES DE ESTA FASE

1. Solución .NET con 5 proyectos compilando sin errores.
2. Proyecto Angular 19 corriendo en http://localhost:4200.
3. API corriendo en http://localhost:5000 con Swagger en /swagger.
4. PostgreSQL con migration inicial aplicada y seed ejecutado.
5. Login funcional: con admin/ChangeMe2026! el usuario entra y ve el dashboard.
6. README.md en la raíz con instrucciones de cómo correr todo localmente.
7. docker-compose.yml para levantar PostgreSQL local.

## CRITERIOS DE ACEPTACIÓN

- npm run start en /frontend levanta Angular sin errores.
- dotnet run en /backend/RR.Api levanta la API sin errores.
- dotnet ef database update aplica las migrations correctamente.
- Postman/Swagger puede hacer login y obtener un JWT válido.
- Los catálogos seed están en la BD (verificable con SELECT desde psql).
- El layout Angular se ve correcto en escritorio (1280px+) y razonable en móvil.

## SCHEMA SQL COMPLETO

[Insertar aquí el contenido del archivo `schema-rr.sql` que está al final de 
este documento. Es el schema final ya consolidado con todos los hallazgos 
del análisis previo.]

NO programes los módulos de negocio en esta fase. Solo el setup base, autenticación, 
layout y seeds. Los módulos vienen en los prompts siguientes.

Al terminar, ejecuta los criterios de aceptación y reporta qué funciona y qué no.
```

---

# PROMPT A1 — Clientes y Vehículos

Pasa este prompt **después** de que Fase 0 esté operativa y validada:

---

```
Vas a construir los módulos de Clientes y Vehículos del sistema RR Importaciones, 
sobre la base que ya creaste en Fase 0.

## CONTEXTO RECORDATORIO

- Clientes se identifican por APODO (no por nombre completo necesariamente). 
  Ejemplos reales: "DOMINGO", "LUIS LDO TX", "KIKO", "JM", "R&R" (ellos mismos 
  como cliente).
- Vehículos tienen VIN de 17 caracteres. El sistema viejo guardaba solo los 
  últimos 6; el nuevo guarda los 17. Existe el concepto vin_corto = 
  últimos 6-8 caracteres para búsqueda visual.
- Un cliente puede tener N vehículos. Un vehículo siempre pertenece a un cliente 
  (puede reasignarse pero no quedar huérfano).
- Marcas tienen typos comunes en datos viejos: "WOLKSWAGEN", "INTENATIONAL", 
  "JOHN DEREE". El sistema normaliza con tabla de aliases.

## MÓDULO CLIENTES

### Backend

**Endpoints REST en /api/clientes**:

- GET /api/clientes?search=&page=&pageSize=&orderBy=&filterProcedencia=
  - Lista paginada (default 50/page). Filtros: search en apodo + nombre_completo + 
    rfc, procedencia.
  - Ordenable por apodo, fecha de alta, total facturado.
  - Devuelve dto con: id, apodo, nombre_completo, telefono, email, procedencia, 
    total_vehiculos, total_tramites, total_facturado.

- GET /api/clientes/{id}
  - Detalle completo + listado de sus vehículos + últimos 10 trámites + saldo 
    pendiente total.

- POST /api/clientes
  - Body: apodo (required, unique por tenant), nombre_completo, rfc, telefono, 
    email, procedencia, notas.
  - Validar apodo único (case-insensitive) por tenant.

- PUT /api/clientes/{id}
  - Mismo body. No permite cambiar apodo si ya tiene trámites (validación dura).

- DELETE /api/clientes/{id}
  - Soft delete (campo deleted_at). No permitido si tiene trámites activos.

- GET /api/clientes/search-autocomplete?q=
  - Para inputs de selección rápida en otras pantallas. Devuelve top 10 matches.

### Frontend

**Pantalla /clientes (lista)**:
- Tabla con: apodo, nombre completo, teléfono, procedencia, # vehículos, 
  total facturado, último trámite.
- Búsqueda en topbar de la tabla. Filtro por procedencia (dropdown).
- Botón "Nuevo cliente" arriba derecha.
- Row click → /clientes/{id}.
- Hover row muestra acciones rápidas: editar, ver vehículos, nueva cotización.

**Pantalla /clientes/{id} (detalle)**:
- Header con apodo grande, nombre completo abajo más pequeño.
- Tarjeta resumen: # vehículos, # trámites totales, total facturado, saldo pendiente.
- Tabs: General | Vehículos | Trámites | Pagos | Notas.
- Tab General: datos editables inline.
- Tab Vehículos: tabla con marca, modelo, año, VIN corto, último trámite.

**Modal /clientes/nuevo o /clientes/{id}/editar**:
- Form con todos los campos. Validación inline.

## MÓDULO VEHÍCULOS

### Backend

**Endpoints en /api/vehiculos**:

- GET /api/vehiculos?search=&cliente_id=&marca_id=&año_min=&año_max=&en_patio=true
  - en_patio=true filtra solo los que no tienen trámite activo (están en inventario).
  - search busca en VIN completo, VIN corto, marca, modelo.
  - Devuelve dto con: id, vin, vin_corto, marca, modelo, año, cliente_apodo, 
    fecha_ingreso_patio, ubicacion_actual, tiene_tramite_activo, cumplio_requisitos, 
    tiene_sello_aduanal.

- GET /api/vehiculos/{id} — detalle completo + historial trámites.

- POST /api/vehiculos
  - Body: vin (puede ser null si es mercancía), marca_id, modelo, año, 
    cilindrada_cm3, categoria, cliente_id (required).
  - Si vin tiene 17 caracteres, auto-calcular vin_corto = últimos 6.
  - Auto-clasificar fraccion_arancelaria según cilindrada + categoria.

- PUT /api/vehiculos/{id}
- DELETE /api/vehiculos/{id} (soft, no permitido con trámites)

- POST /api/vehiculos/{id}/inventario
  - Body: ubicacion_actual, notas_estado, cumplio_requisitos, tiene_sello_aduanal, 
    fecha_pedimento_proforma.
  - Esto actualiza los campos de "pre-trámite" del vehículo. Es lo que sustituye 
    la hoja INVENTARIO CARROS del Excel viejo.

- GET /api/vehiculos/inventario-actual
  - Vista del inventario: vehículos sin trámite activo, con sus 3 checkpoints 
    (cumplio, sello, pedimento_proforma).

### Frontend

**Pantalla /vehiculos**:
- Toggle arriba: "Todos" / "En patio (inventario)" / "Con trámite activo" / "Liberados"
- Tabla con columnas: marca, modelo, año, VIN corto, cliente, fecha ingreso, 
  ubicación, estado checkpoints (3 iconos: cumplió ✓, sello ✓, proforma ✓), 
  trámite activo.
- Filtros laterales: cliente, marca, rango año, fracción arancelaria.
- Botón "Nuevo vehículo".

**Pantalla /vehiculos/{id}**:
- Header: MARCA MODELO grande, año + VIN completo abajo.
- Tarjeta cliente vinculado.
- Tabs: General | Inventario (pre-trámite) | Trámites | Cotizaciones.
- Tab Inventario: 3 checkboxes grandes (cumplio_requisitos, tiene_sello_aduanal, 
  fecha_pedimento_proforma), campo ubicación, notas estado.

**Modal /vehiculos/nuevo**:
- Campo VIN con validación 17 chars.
- Marca con autocomplete (busca en alias también).
- Cliente con autocomplete (busca por apodo).
- Auto-llenar fracción arancelaria al elegir categoría + cilindrada.

## MARCAS — Catálogo con normalización

**Tabla marcas** ya está creada en Fase 0. Endpoints CRUD básicos.

**Importante**: implementar lógica de normalización al crear vehículos:
- Si usuario escribe "WOLKSWAGEN" o "VOLKWAGEN" o "VW", el sistema busca en la 
  columna `aliases` (TEXT[]) y resuelve al ID de Volkswagen.
- Si no encuentra ni en nombre ni en aliases, sugiere las top 3 similares (usando 
  pg_trgm similarity) antes de permitir crear nueva marca.

**Seed inicial de marcas** (extraídas del análisis de los archivos, top 30):
TOYOTA, FORD, CHEVROLET, HONDA, KENWORTH, INTERNATIONAL, GMC, JEEP, CATERPILLAR, 
GREAT DANE, NISSAN, WABASH NATIONAL, UTILITY, UTILITY TRAILER, RAM, HYUNDAI, 
PETERBILT, FREIGHTLINER, MAZDA, DODGE, VOLKSWAGEN (aliases: WOLKSWAGEN, VOLKWAGEN, 
VW), MERCEDES-BENZ, BMW, AUDI, VOLVO, MITSUBISHI, SUBARU, JOHN DEERE (aliases: 
JOHN DEREE, JHON DEERE), MACK, INTERNATIONAL (aliases: INTENATIONAL), STERLING.

## REGLAS DE NEGOCIO

1. No se puede crear un vehículo sin cliente asociado.
2. Un VIN debe ser único por tenant. Si ya existe, el sistema sugiere el vehículo 
   existente en lugar de duplicar.
3. Vehículos en estado "inventario" (sin trámite activo) son visibles en /inventario 
   automáticamente.
4. Al cambiar el cliente de un vehículo, se registra en auditoría con quién y cuándo.
5. La eliminación de cliente/vehículo es siempre soft delete. Nunca DELETE FROM.

## ENTREGABLES

- Endpoints API documentados en Swagger.
- Pantallas Angular funcionales con datos reales (no mocks).
- Búsqueda con autocompletado en menos de 200ms con 250 clientes seed.
- Migración de prueba: crear 10 clientes y 30 vehículos manualmente para validar UX.

NO toques trámites todavía. Eso viene en Prompt A2.
```

---

# PROMPT A2 — Trámites, Pedimentos y Estados

Pasa este prompt **después** de A1:

---

```
Vas a construir el módulo de Trámites. Este es el núcleo operativo del sistema.

## CONTEXTO RECORDATORIO

- Un trámite es el proceso de importación de UN vehículo (o mercancía) específico, 
  para un cliente específico, por una aduana específica.
- Un trámite puede tener MÚLTIPLES pedimentos: 1 original + N rectificaciones 
  (R1, R2, R3).
- Estados posibles, en máquina de estados:
  PENDIENTE_TRAMITE → EN_PROCESO → ROJO_DESADUANADO → VERDE_ENTREGADO → 
  AMARILLO_PENDIENTE_PAGO → COBRADO
  (con CANCELADO como estado terminal alterno)
- Cada cambio de estado se registra en tramite_eventos con timestamp y usuario.
- Los tramitadores (MARIO, CONO, etc.) son personas que llevan trámites. 
  Cada trámite tiene UN tramitador asignado.
- Tipos de trámite: NORMAL, EXPRESS (con cargo adicional), ASESORIA_LOGISTICA.
- El campo ENTREGAS del sistema viejo se materializa como tabla "entregas" 
  con personal_campo_id, partner_externo_id, descripcion.

## MÓDULO TRÁMITES

### Backend

**Endpoints en /api/tramites**:

- GET /api/tramites?estado=&tramitador_id=&cliente_id=&aduana=&fecha_desde=&fecha_hasta=&search=
  - Listado paginado. Búsqueda en numero_consecutivo, cliente.apodo, 
    vehiculo.vin_corto, pedimento.numero.
  - Filtros múltiples. Ordenable por fecha, número, monto.
  - Devuelve dto con campos clave + cobro_total + total_pagado + saldo_pendiente.

- GET /api/tramites/{id} — detalle completo con: vehículo, cliente, todos los 
  pedimentos, timeline de eventos, todos los pagos, todas las entregas, todos los 
  gastos hormiga relacionados.

- POST /api/tramites — crear nuevo trámite.
  - Body: cliente_id, vehiculo_id (o descripcion_mercancia si es mercancía suelta), 
    aduana_codigo, tramitador_id, tipo_tramite, cobro_total, honorarios, notas.
  - El numero_consecutivo se autogenera (siguiente disponible para el tenant).
  - Estado inicial: PENDIENTE_TRAMITE.
  - Si tipo_tramite = EXPRESS, agregar cargo_express.

- PUT /api/tramites/{id} — editar datos básicos (no cambia estado, ni cobro_total 
  si ya tiene pagos).

- POST /api/tramites/{id}/cambiar-estado
  - Body: nuevo_estado, notas, fecha_evento (default now).
  - Validar transición legal según máquina de estados.
  - Genera registro en tramite_eventos.

- POST /api/tramites/{id}/pedimentos — agregar pedimento (original o rectificación).
  - Body: numero, tipo (ORIGINAL/R1/R2/R3), fecha, motivo_rectificacion (si R*), 
    responsable_error, cobro_adicional.

- POST /api/tramites/{id}/entregas — registrar entrega física.
  - Body: responsable_campo_id, recibido_por_partner_id, descripcion, 
    ubicacion_entrega, documentos_entregados[].

- POST /api/tramites/{id}/notas — agregar nota libre al timeline.
  - Body: contenido (texto). Se guarda como tramite_evento tipo NOTA.

- GET /api/tramites/dashboard
  - Métricas: total activos, total VERDE este mes, total AMARILLO 
    (pendiente pago), cobrado del mes, por cobrar, vehículos en patio.
  - Cache de 60 segundos.

### Frontend

**Pantalla /tramites**:
- Toggle arriba con tabs por estado: "Todos | Pendientes | En proceso | 
  Desaduanados (ROJO) | Entregados (VERDE) | Pendiente pago (AMARILLO) | 
  Cobrados | Cancelados".
- Tabla con: # consecutivo, fecha, cliente, vehículo (marca + modelo + año + 
  VIN corto), aduana, tramitador, cobro total, saldo, estado, días en estado actual.
- Row click → /tramites/{id}.
- Filtros laterales: tramitador, cliente, aduana, rango fechas.
- Botón "Nuevo trámite" arriba derecha.

**Pantalla /tramites/nuevo**:
- Wizard de 3 pasos o pantalla simple con secciones colapsables:
  1. Cliente + Vehículo (selección o creación rápida inline)
  2. Aduana + Tramitador + Tipo
  3. Cobro + Honorarios + Notas
- Si proviene de una cotización aceptada (parámetro ?cotizacion_id=X), pre-llenar 
  todos los datos.

**Pantalla /tramites/{id}**:
- Header: # consecutivo grande, estado actual como pill colorido, días en estado.
- Tarjetas resumen: Cliente | Vehículo | Cobro total + saldo.
- **Timeline central**: lista cronológica de tramite_eventos. Cada uno con icono 
  según tipo (cambio_estado, nota, foto_campo, pago, entrega).
- Acciones en la parte superior derecha: "Cambiar estado", "Registrar pago", 
  "Agregar pedimento", "Agregar nota", "Registrar entrega", "Imprimir".
- Tab "Pedimentos": tabla con todos los pedimentos del trámite.
- Tab "Pagos": ver Prompt A3.
- Tab "Gastos": gastos hormiga vinculados al trámite.

**Pantalla /inventario** (vista derivada):
- Lista de vehículos sin trámite activo + sus 3 checkpoints visuales.
- Cada row tiene botón "Iniciar trámite" que abre /tramites/nuevo con el vehículo 
  pre-seleccionado.

## CATÁLOGOS NUEVOS A CREAR

### Tramitadores

CRUD simple en /api/tramitadores y /catalogos/tramitadores.
Campos: nombre, activo, comision_tipo (NA/FIJO/PORCENTAJE), comision_valor.

Seed inicial:
- MARIO (activo)
- CONO (activo)

### Personal de campo

CRUD en /api/personal-campo.
Campos: nombre, rol (ENTREGADOR/CHOFER/AMBOS), telefono.

Seed inicial (detectado del Excel):
- Hector Rodriguez (AMBOS)
- Simon Juarez (CHOFER)
- Omar Torres (AMBOS)
- Andres Cavazos (ENTREGADOR)
- OBIDIO (ENTREGADOR)
- Jair (ENTREGADOR)
- Jose (ENTREGADOR)

### Partners externos

CRUD en /api/partners-externos.
Campos: nombre, aliases (multi), tipo (PENSION/RECEPCION_DOCS/OTRO), notas.

Seed:
- Don Beto (aliases: BETO, DON BETO, beto) — PENSION
- Aurora (aliases: la güera, la wuera, Laura, AURORA) — RECEPCION_DOCS

## MÁQUINA DE ESTADOS

Implementar como servicio TramiteStateService con método CanTransitionTo(estadoActual, 
nuevoEstado) que devuelve bool + razón si false.

Transiciones permitidas:
- PENDIENTE_TRAMITE → EN_PROCESO | CANCELADO
- EN_PROCESO → ROJO_DESADUANADO | CANCELADO
- ROJO_DESADUANADO → VERDE_ENTREGADO
- VERDE_ENTREGADO → AMARILLO_PENDIENTE_PAGO | COBRADO
- AMARILLO_PENDIENTE_PAGO → COBRADO
- Cualquiera → CANCELADO (con permiso ADMIN)

Las transiciones hacia atrás requieren rol ADMIN y se registran en auditoría.

## REGLAS DE NEGOCIO

1. Cobro_total no se puede modificar si el trámite ya tiene pagos (debe ser via 
   pedimento de rectificación con cobro_adicional).
2. Un trámite no puede pasar a VERDE_ENTREGADO sin al menos una entrega registrada.
3. Un trámite no puede pasar a COBRADO sin que la suma de pagos verificados >= 
   cobro_total + cargo_express + cobros_rectificaciones.
4. El estado AMARILLO_PENDIENTE_PAGO se asigna automáticamente cuando: trámite 
   está en VERDE_ENTREGADO + saldo > 0 + han pasado 7 días desde entrega.
5. Numero_consecutivo es secuencial por tenant. Generar con SELECT MAX + lock o 
   sequence dedicada por tenant.

## ENTREGABLES

- 5 endpoints principales funcionando con tests de integración.
- Pantallas Angular con datos reales.
- Timeline interactivo con scroll infinito si > 50 eventos.
- Dashboard /inicio actualizado con números reales (no más mocks).
- Validación visual de máquina de estados (botones deshabilitados si transición 
  inválida).

NO toques pagos detallados todavía. Eso viene en A3.
```

---

# PROMPT A3 — Pagos, Gastos Hormiga y Migración

Pasa este prompt **después** de A2:

---

```
Vas a construir el módulo de Pagos, Gastos Hormiga, y el importador de datos 
históricos.

## CONTEXTO RECORDATORIO

- Pagos: dinero que el CLIENTE le da a R&R por un trámite. Pueden ser parciales.
- Gastos hormiga: dinero que R&R GASTA durante un trámite (gasolina, fletes, 
  permisos, etc.). Algunos se cargan al cliente, otros son costo propio.
- Cada pago tiene comprobante obligatorio (foto/PDF).
- Cada pago necesita verificación manual por un GERENTE o ADMIN (contra el banco) 
  antes de contar como "pagado verificado".
- Manejan MXN y USD. Cuando un pago es USD, se registra el TC del día (Banxico) 
  y se calcula el equivalente MXN.

## MÓDULO PAGOS

### Backend

**Endpoints en /api/pagos**:

- GET /api/pagos?tramite_id=&fecha_desde=&fecha_hasta=&verificado=&metodo=
  - Listado paginado con join a trámite + cliente.

- POST /api/pagos
  - Body: tramite_id, fecha_pago, monto, moneda (MXN/USD), tipo_cambio (si USD), 
    metodo (TRANSFERENCIA/EFECTIVO/DEPOSITO/CHEQUE), banco, referencia, 
    comprobante_url, notas.
  - Validación dura: comprobante_url REQUERIDO (no nulo no vacío).
  - Si moneda = USD y tipo_cambio = null, jalar TC actual de Banxico API. 
    Si Banxico falla, error 422.
  - Por default verificado = false.
  - Actualizar saldo_pendiente del trámite (calculado, no almacenado).

- POST /api/pagos/{id}/verificar
  - Requiere rol GERENTE o ADMIN.
  - Marca verificado = true, verificado_por = user_id, verificado_en = now.
  - Si la suma de pagos verificados >= cobro_total del trámite, el trámite 
    pasa automáticamente a COBRADO.

- POST /api/pagos/{id}/comprobante
  - Multipart con archivo. Sube a almacenamiento local (en MVP: 
    /backend/storage/comprobantes/) con nombre <pago_id>_<timestamp>.<ext>.
  - Validar: jpg, jpeg, png, pdf. Max 10MB.
  - Actualiza comprobante_url del pago.

- DELETE /api/pagos/{id}
  - Soft delete. Solo si verificado = false. Si verificado, requiere ADMIN y 
    deja registro en auditoría.

### Frontend

**Sub-tab en /tramites/{id} → Pagos**:
- Tabla con: fecha, monto, moneda, TC, método, comprobante (icono clickable), 
  verificado (badge), acciones.
- Sección "Resumen": cobro total | total pagado | total verificado | saldo.
- Botón "Registrar pago" abre modal.

**Modal de registro de pago**:
- Campos: fecha (default hoy), monto, moneda (default MXN), TC (auto-fill desde 
  Banxico si USD), método, banco (combo con BBVA preseleccionado para R&R), 
  referencia, **archivo comprobante (drag-and-drop o click)**, notas.
- Vista previa del comprobante antes de enviar.
- Validación: monto > 0, comprobante obligatorio.

**Pantalla /pagos** (vista global):
- Tabla con todos los pagos del tenant, filtrable.
- Indicador visual de "pendientes de verificación" arriba.
- Bulk action para verificar varios pagos a la vez (rol GERENTE+).

## MÓDULO GASTOS HORMIGA

### Backend

**Endpoints en /api/gastos-hormiga**:

- GET /api/gastos-hormiga?cliente_id=&tramite_id=&vehiculo_id=&fecha_desde=&categoria=
- POST /api/gastos-hormiga
  - Body: fecha, cliente_id (opcional), vehiculo_id (opcional), tramite_id 
    (opcional), tipo_gasto_id, concepto (texto libre), monto, moneda, gasto_usd 
    (si USD), comprobante_url, se_carga_al_cliente.
- PUT, DELETE — estándar.

- GET /api/gastos-hormiga/resumen?fecha_desde=&fecha_hasta=
  - Agregado por categoría, por cliente, por tramitador.

### Frontend

**Pantalla /gastos-hormiga**:
- Tabla con: fecha, cliente, vehículo (VIN corto si aplica), tipo, concepto, 
  monto, moneda, ¿se carga al cliente?, comprobante.
- Filtros laterales.
- Botón "Nuevo gasto" + modal con autocompletado de cliente y vehículo + selector 
  de tipo desde catálogo.
- Sección de totales en footer de tabla: total del periodo, total cargable a 
  clientes, total costo propio.

**Sub-tab en /tramites/{id} → Gastos**:
- Lista solo de gastos de ese trámite. Mismo modal de creación pero con 
  trámite/cliente/vehículo pre-llenados.

## IMPORTADOR DE DATOS HISTÓRICOS

Este es un proyecto consola separado en /backend/RR.DataImporter/ que lee:
- TABULADOR_2026.xlsx (sigue para B, no se procesa aquí)
- TRAMITES_GENERAL_DE_CARROS_Y_STATUS1.xlsx

### Flujo del importador

Comando: dotnet run --project RR.DataImporter -- import-tramites 
--file "ruta/al/archivo.xlsx" --tenant "a0000000-0000-0000-0000-000000000001"

1. **Hoja "LISTA DE TRAMITES G"**:
   - Por cada fila válida (con numero_consecutivo), extraer: fecha, cliente, marca, 
     modelo, año, serie, pedimento, impuesto, status.
   - Normalizar marca (lookup en aliases).
   - Crear o reusar cliente por apodo (case-insensitive).
   - Crear o reusar vehículo por VIN corto + cliente.
   - Crear trámite. Status mapping:
     - "VERDE [fecha]" → estado COBRADO + fecha_liberado = fecha del VERDE
     - "PENDIENTE DE TRAMITE" → estado PENDIENTE_TRAMITE
   - Aduana: extraer primeros 4 dígitos del pedimento.
   - Pedimento: si tiene "R1" o "R2" en el texto, crear múltiples pedimentos.

2. **Hoja "TRAMITES CON ASERORIA LOGISTICA"** (sic):
   - Similar pero con tipo_tramite = ASESORIA_LOGISTICA.
   - Campo TRAMITADOR → buscar o crear tramitador.
   - Campo ENTREGAS → parsear con regex `^([A-Z]+):(.+?)(?:Vin|VIN|vin):\s*(\*?\w+)` 
     → crear registro en tabla entregas con responsable_campo_id (buscando por 
     nombre del responsable).

3. **Hoja "INVENTARIO CARROS"**:
   - Por cada vehículo sin trámite activo, actualizar campos pre-trámite del 
     vehículo: fecha_ingreso_patio, ubicacion_actual, notas_estado, 
     cumplio_requisitos, tiene_sello_aduanal, fecha_pedimento_proforma.

4. **Hoja "GASTOS HORMIGA"**:
   - Por cada fila: crear gasto vinculado a cliente (por apodo) y vehículo 
     (por VIN corto si está).
   - tipo_gasto_id: matchear tipo de gasto del catálogo (fuzzy match en nombre).

### Reglas del importador

- **Idempotente**: si se vuelve a correr, NO duplica. Validar por:
  - tramite: tenant_id + numero_legacy (el N° del Excel)
  - cliente: tenant_id + apodo
  - vehiculo: tenant_id + vin_corto + cliente_id
- **Reporta** al final: cuántos insertados, cuántos saltados (ya existían), 
  cuántos rechazados (con razón).
- **Transaccional**: si algo falla a mitad, hace rollback.
- **Logs**: cada paso en archivo data-import-yyyymmdd-hhmmss.log.

### Pantalla /admin/importador (frontend)

- Solo accesible para rol ADMIN.
- Upload de archivo Excel.
- Botón "Validar" (corre el importer en modo dry-run, no inserta).
- Resultado de validación: # registros detectados, # warnings, # errores.
- Botón "Importar" (corre real).
- Log de importación visible en pantalla con progreso.

## REGLAS DE NEGOCIO ADICIONALES

1. Un pago sin comprobante NUNCA se acepta, ni por admin. Excepción cero.
2. Un pago en USD sin tipo de cambio registrado nunca se acepta.
3. Gastos hormiga con se_carga_al_cliente=true aparecen en el saldo pendiente 
   del trámite (suman al cobro_total).
4. La importación NO sobreescribe trámites existentes; si encuentra duplicado, 
   los reporta para revisión manual.

## ENTREGABLES

- Módulos Pagos y Gastos Hormiga 100% funcionales.
- Importador funciona con el archivo TRAMITES_GENERAL_DE_CARROS_Y_STATUS1.xlsx 
  real y produce reporte completo.
- Pantalla /admin/importador funcional con dry-run y ejecución real.
- Dashboard /inicio ahora muestra datos REALES post-importación.

Al terminar A3, el Camino A está completo. El sistema puede operar el negocio 
existente. El cotizador (Camino B) viene como mejora encima.
```

---

# PROMPT B1 — NHTSA, Banxico y Búsqueda en Tabuladores

Pasa este prompt **en paralelo después de A1 (no requiere A2/A3)**:

---

```
Vas a construir el núcleo del cotizador automatizado. Este prompt cubre las 
integraciones externas y la lógica de búsqueda de precios.

## CONTEXTO RECORDATORIO

- El primo de R&R hoy recibe un VIN del cliente, consulta una página web manualmente 
  para obtener datos del vehículo, va al Excel TABULADOR para buscar el precio 
  según marca/modelo/año, y aplica una fórmula fiscal según el año del vehículo.
- El sistema debe AUTOMATIZAR todo este flujo.

## INTEGRACIONES EXTERNAS

### 1. NHTSA API (datos del vehículo por VIN)

Endpoint público gratuito:
https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{VIN}?format=json

Crear servicio INhtsaService con método DecodeVinAsync(string vin) que:
- Llama al API
- Mapea respuesta a DTO VehicleDecodedDto:
  - vin, make (marca), model, modelYear, manufacturer, vehicleType, bodyClass, 
    engineCylinders, displacementCC, fuelTypePrimary, plantCountry, etc.
- Cachea respuesta en BD (tabla nhtsa_cache con vin como PK, respuesta JSONB, 
  fetched_at) por 30 días.
- Si NHTSA falla, devuelve null y registra el error en logs.

### 2. Banxico API (tipo de cambio)

Endpoint oficial:
https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno

Requiere token (gratuito, registro en sitio Banxico). Se configura en appsettings.json 
como BanxicoApiToken.

Crear servicio IBanxicoService con método GetTipoCambioFixAsync(DateTime? fecha = null):
- fecha = null → TC del día (oportuno)
- fecha específica → TC histórico (endpoint /datos/{fecha}/{fecha})
- Cachea por día en tabla tipos_cambio_cache (fecha PK, tc decimal, fuente, 
  fetched_at).
- Si Banxico falla, devuelve el último cacheado con flag is_stale=true.

## BÚSQUEDA EN TABULADORES

### Importar tabuladores ANAM al sistema

Comando del importador (dentro de RR.DataImporter):
dotnet run --project RR.DataImporter -- import-tabuladores 
--file "ruta/al/TABULADOR_2026.xlsx"

Por cada hoja relevante:
- AUT 1.0 A 1.5 → fraccion 8703.22.02, categoria AUTOMOVIL
- AUT 1.6 A 3.0 → fraccion 8703.23.02, categoria AUTOMOVIL
- AUT 3.1 en adelante → fraccion 8703.24.02, categoria AUTOMOVIL
- CAM 1.6 A 3.0 → fraccion 8703.23.02, categoria CAMIONETA (inciso B)
- CAM 3.1 en adelante → fraccion 8703.24.02, categoria CAMIONETA (inciso B)
- PICK UP'S → fraccion 8704.31.05, categoria PICKUP
- AMPARO → tabla tabulador_amparo

Estructura del Excel a parsear (las hojas no-AMPARO):
- Filas con número en columna A → son entradas (marca o modelo).
- Columnas B: fracción arancelaria (solo en filas de cabecera de sección).
- Columna C: marca o modelo.
- Columna D: unidad ("Pza").
- Columnas E-M: precios por antigüedad. Las cabeceras de fila dicen el año (2009, 
  2010, etc.) o "X AÑOS" — se debe normalizar a antigüedad_anios (1 a 12+).

Algoritmo:
1. Detectar header row (fila con "UNIDAD COMER-CIAL" o similar).
2. Identificar columnas de antigüedad y mapear a años (12+, 11, 10, ..., 1).
3. Identificar filas tipo "marca" (todo en C, sin precio) vs "modelo" (tiene 
   precios).
4. Por cada modelo: crear precio_estimado con marca actual + modelo + fraccion 
   + inciso. Crear N precios_por_antiguedad (uno por cada año con precio).
5. Detectar fila "genérico" (texto largo "PRECIOS ESTIMADOS APLICABLES A 
   VEHÍCULOS EN CUYO AÑO-MODELO NO SE ESTABLECE..."): marcarla con flag 
   es_generico=true.

### Algoritmo de cotización (servicio core)

Crear ICotizadorService con método CalcularCotizacionAsync(CotizacionInput input).

Input:
- vin (puede ser null si es mercancía)
- marca_id, modelo, año (si no hay VIN o NHTSA falla)
- valor_aduana_usd_override (opcional, si el primo lo da manual)
- tc_margen (default 0.30)
- tipo_tramite (NORMAL, EXPRESS)
- honorarios_override (opcional)

Output: CotizacionOutput con TODO el desglose calculado.

Lógica:

```
1. Identificar vehículo:
   - Si hay VIN → llamar a NHTSA → obtener marca, modelo, año, cilindrada, tipo
   - Si NHTSA da datos, intentar match en tabla marcas (con aliases) y proponer 
     marca_id. Si no match, dejar marca como string sin id.
   - Si no hay VIN, usar marca_id + modelo + año del input.

2. Determinar categoría y fracción arancelaria:
   - cilindrada_cm3 + tipo (auto vs pickup vs camion) → fracción + categoria
   - Tablas: 
     1.0-1.5L → 8703.22.02
     1.6-3.0L → 8703.23.02 (auto inciso A, camioneta inciso B)
     3.1+L → 8703.24.02
     Pickup → 8704.31.05
   - Para diésel/eléctrico/híbrido: usar fracciones 8703.32-40-60.02 respectivas.

3. Determinar régimen fiscal según año:
   año >= 2017 → POST_2017
   año <= 2016 → PRE_2016
   Si año entre 2019-2021 → AMPARO (sobreescribe los anteriores si aplica)

4. Buscar precio estimado en USD:
   
   CASO A: régimen AMPARO
   - Buscar en tabulador_amparo por año + categoria (4_CIL, 6_CIL, 8_CIL, PICKUP, 
     LUJO). Tipo de cambio NO aplica porque amparo ya está en MXN. 
   - valor_pesos = precio_amparo_mxn directamente.
   
   CASO B: régimen normal (POST_2017 o PRE_2016)
   - Calcular antigüedad = año_actual - año_modelo. Min 1, max 12 (cap a 12+).
   - Buscar precio: WHERE fraccion = X AND marca_id = Y AND modelo ILIKE %z% 
     AND antiguedad_anios = N → join con precios_por_antiguedad.
   - Si hay match exacto → usar ese precio_usd.
   - Si NO hay match → buscar el "genérico" (flag es_generico=true) de la 
     misma fracción + antigüedad. fuente_precio = 'GENERICO'.
   - Si tampoco hay genérico → error 422 "No se pudo determinar precio estimado".

5. Calcular tipo de cambio aplicado:
   - tc_referencia = BanxicoService.GetTipoCambioFixAsync()
   - tc_aplicado = tc_referencia + tc_margen (default 0.30)
   - Si Banxico falla y no hay cache, error 422.

6. Calcular valor_pesos (si régimen normal):
   - valor_pesos = valor_aduana_usd * tc_aplicado

7. Aplicar fórmula fiscal según régimen:

   Antes de calcular, leer el registro vigente de `parametros_fiscales` para el
   régimen aplicable. Estos valores salen del TABULADOR 2026 y deben ser
   editables por un ADMIN. No consultar `igi_por_fraccion` ni sustituir el cálculo
   por tasas DOF en el MVP.

   POST_2017:
   - igi_porcentaje = parametros_fiscales.igi_porcentaje (seed inicial 0.10)
   - igi = valor_pesos * igi_porcentaje
   - dta = valor_pesos * parametros_fiscales.dta_porcentaje (seed inicial 0.008)
   - iva = (valor_pesos + igi + dta) * parametros_fiscales.iva_porcentaje
   - prev = parametros_fiscales.prev_fijo (seed inicial 0)
   - prv = parametros_fiscales.prv_fijo (seed inicial 0)
   - impuestos_total = igi + dta + iva
   
   PRE_2016:
   - igi_porcentaje = parametros_fiscales.igi_porcentaje (seed inicial 0.50)
   - igi = valor_pesos * igi_porcentaje
   - dta = parametros_fiscales.dta_fijo (seed inicial 408)
   - prev = parametros_fiscales.prev_fijo (seed inicial 240)
   - iva = (valor_pesos + igi + dta + prev) * parametros_fiscales.iva_porcentaje
   - prv = parametros_fiscales.prv_fijo (seed inicial 290)
   - impuestos_total = igi + dta + prev + iva + prv
   
   AMPARO:
   - Sin desglose: precio_amparo es el "todo incluido". 
   - impuestos_total = precio_amparo - honorarios
   - (se invierte la fórmula: el precio_amparo ya incluye honorarios + impuestos)

8. Calcular honorarios:
   - Si honorarios_override → usar ese.
   - Si no, buscar en tabla honorarios por tipo_mercancia + régimen.

9. Calcular total final:
   - total = impuestos_total + honorarios
   - Si tipo_tramite = EXPRESS, total += cargo_express (configurable por tenant, 
     default 2000)

10. Devolver TODO el desglose para auditabilidad.
```

### Endpoints

- POST /api/cotizaciones/calcular
  - Body: CotizacionInput.
  - Response: CotizacionOutput SIN persistir aún.
  - Para usar en la UI mientras el usuario ajusta.

- POST /api/cotizaciones
  - Body: CotizacionInput + folio (auto-generado) + cliente_id (opcional) + 
    notas + fecha_expiracion (default +7 días).
  - Persiste cotización en estado BORRADOR.

- PUT /api/cotizaciones/{id}
  - Solo si estado = BORRADOR.

- GET /api/cotizaciones?cliente_id=&estado=&fecha_desde=&search=
- GET /api/cotizaciones/{id}

- POST /api/cotizaciones/{id}/marcar-enviada
  - Body: enviado_por (WHATSAPP/EMAIL), enviado_a, mensaje_personalizado.
  - Cambia estado a ENVIADA, registra timestamp.

- POST /api/cotizaciones/{id}/aceptar
  - Cambia estado a ACEPTADA. Genera nota para conversión a trámite 
    (ver Prompt INTEGRACIÓN).

- POST /api/cotizaciones/{id}/rechazar
  - Body: motivo.

### Parámetros fiscales editables

- GET /api/admin/parametros-fiscales
  - Devuelve los parámetros vigentes y el histórico por régimen.
- PUT /api/admin/parametros-fiscales/{regimen}
  - Solo rol ADMIN.
  - Body: igi_porcentaje, dta_porcentaje, dta_fijo, iva_porcentaje, prev_fijo,
    prv_fijo, vigente_desde.
  - No modifica en sitio el registro anterior: cierra su vigente_hasta y crea una
    nueva versión. Así se conserva qué cálculo estaba vigente cuando se emitió una
    cotización.

Valores seed:
- POST_2017: IGI 10%, DTA 0.8%, IVA 16%, PREV 0, PRV 0.
- PRE_2016: IGI 50%, DTA fijo 408, IVA 16%, PREV 240, PRV 290.

La integración con DOF queda fuera del MVP. Si se agrega después, debe mostrarse
como referencia para el ADMIN, no sobrescribir automáticamente los parámetros que
R&R usa para cotizar.

### Frontend (B1)

**Pantalla /cotizaciones/nueva**:
- Stepper visual de 3 pasos:
  
  PASO 1 — Vehículo:
  - Input VIN grande, con auto-detección de longitud (17 chars).
  - Botón "Decodificar" → llama NHTSA → muestra preview de marca/modelo/año.
  - Si NHTSA falla o no hay VIN: form manual de marca + modelo + año + cilindrada.
  
  PASO 2 — Cálculo:
  - Mostrar TC del día (Banxico) en grande.
  - Slider o input para ajustar margen TC (default 0.30).
  - Mostrar tc_aplicado calculado.
  - Selector "Tipo de trámite": NORMAL / EXPRESS.
  - Si quiere override de valor de aduana o honorarios, expandir sección 
    "Ajustes avanzados".
  - Botón "Calcular" → llama /api/cotizaciones/calcular → muestra preview.
  - Preview con desglose completo: valor aduana USD, valor pesos, IGI (%), DTA, 
    IVA, prev, prv, impuestos total, honorarios, **TOTAL** grande.
  - Mostrar fuente_precio: "Tabulador específico" / "Precio genérico" / "Amparo".
  
  PASO 3 — Cliente y envío:
  - Selector de cliente (autocomplete) opcional.
  - Notas internas.
  - Botón "Guardar borrador".

**Pantalla /cotizaciones**:
- Lista de cotizaciones, filtros por estado, cliente, fecha.
- Botón "Nueva cotización" arriba.

**Pantalla /cotizaciones/{id}**:
- Vista detalle con todos los datos del cálculo.
- Acciones: editar (si BORRADOR), generar PDF (viene en B2), enviar (B2), 
  marcar aceptada, marcar rechazada.

## ENTREGABLES

- Integración NHTSA funcionando con cache de 30 días.
- Integración Banxico funcionando con cache diario.
- Importación de TABULADOR_2026.xlsx completa: ~1,140 modelos + 15 entradas amparo.
- Parámetros fiscales iniciales cargados desde TABULADOR 2026:
  POST_2017 con IGI 10%, DTA 0.8%, IVA 16%; PRE_2016 con IGI 50%, DTA 408,
  PREV 240, PRV 290, IVA 16%.
- Pantalla/admin endpoint de parámetros fiscales para que ADMIN pueda modificar
  esos valores con histórico de vigencia.
- Endpoint /api/cotizaciones/calcular funciona con caso real: VIN de Kenworth T680 
  2018 → devuelve cotización completa.
- Pantalla /cotizaciones/nueva funcional de extremo a extremo.

NO incluir generación de PDF ni envío en este prompt. Eso va en B2.
```

---

# PROMPT B2 — PDF de Cotización, Envío y Plantillas

Pasa este prompt **después** de B1:

---

```
Vas a completar el módulo de cotizador con: generación de PDF profesional, envío 
por correo y WhatsApp, y plantillas configurables.

## GENERACIÓN DE PDF

Librería: QuestPDF (.NET, MIT, fluent API). NPM en backend.

Crear servicio ICotizacionPdfService con método GeneratePdfAsync(cotizacionId) que 
devuelve byte[].

### Diseño del PDF (tamaño Carta, márgenes generosos)

**Header**:
- Logo R&R (texto estilizado o imagen si está disponible) izquierda.
- Datos del tenant arriba derecha: razón social, RFC, domicilio.
- Línea horizontal roja (color tenant primario).

**Sección principal**:
- Título: "COTIZACIÓN N° {folio}" centrado.
- Fecha de emisión + fecha de expiración.
- Datos del cliente (si está vinculado).

**Datos del vehículo**:
- Marca, modelo, año destacados.
- VIN completo (17 caracteres) en monoespaciada.
- Tipo, categoría, fracción arancelaria.

**Desglose del cálculo** (tabla):
- Valor en aduana (USD)
- Tipo de cambio aplicado (con nota: "TC referencia + margen ${margen}")
- Valor en pesos
- IGI (con porcentaje aplicado)
- DTA
- Prev (si aplica)
- IVA
- Prv (si aplica)
- Subtotal impuestos
- Honorarios
- **TOTAL** grande con tipografía bold.

**Disclaimer obligatorio** (al final, recuadro destacado):
"Esta cotización es válida únicamente al tipo de cambio de referencia de 
${tc_referencia} pesos por dólar, vigente al día {fecha_referencia}. El monto 
final puede variar conforme al tipo de cambio vigente al momento de realizar el 
pago. Esta cotización tiene validez de 7 días naturales y vence el {fecha_expiracion}. 
Los precios estimados están basados en el Anexo 2 de la Resolución de Precios 
Estimados publicada por la Secretaría de Hacienda y Crédito Público."

**Footer**:
- Datos de contacto.
- Página X de Y.

### Endpoint

- GET /api/cotizaciones/{id}/pdf
  - Devuelve application/pdf con header 
    Content-Disposition: inline; filename="cotizacion-{folio}.pdf"

- GET /api/cotizaciones/{id}/pdf/download
  - Force attachment.

## ENVÍO POR EMAIL

Librería: MailKit + MimeKit.

Configurar SMTP en appsettings.json (placeholder, R&R configura sus credenciales 
después). Para desarrollo, usar https://mailtrap.io o similar.

Servicio IEmailService con método SendCotizacionAsync(cotizacionId, destinatario, 
mensaje_personalizado).

Plantilla de email (Razor template o string interpolado):
- Asunto: "Cotización R&R Importaciones — {vehiculo_resumen}"
- Cuerpo HTML con saludo, mensaje personalizado del primo, resumen breve 
  (vehículo + total), y "PDF adjunto con el desglose completo y términos".

### Endpoint

- POST /api/cotizaciones/{id}/enviar-email
  - Body: destinatario, mensaje_personalizado (opcional).
  - Adjunta el PDF generado.
  - Al éxito, marca cotización como enviada (estado = ENVIADA, enviado_por = EMAIL).

## ENVÍO POR WHATSAPP

**Decisión:** para MVP NO integrar WhatsApp Business API (es trámite con Meta). 
En su lugar, usar el método **wa.me deep link**.

### Cómo funciona

- Generar URL: https://wa.me/{telefono}?text={mensaje_url_encoded}
- El sistema NO manda el mensaje. Abre WhatsApp con el mensaje listo para que el 
  primo lo envíe manualmente con un click.
- El PDF se sube primero a almacenamiento accesible (por ejemplo, a /storage/public/ 
  con un token URL que expira) y el link al PDF se incluye en el texto.

Mensaje pre-armado tipo:
```
Hola {cliente}, te comparto la cotización para importar tu {marca} {modelo} {año}.

📋 Resumen:
• Valor aduana: ${valor_aduana_usd} USD
• Impuestos: ${impuestos_total} MXN
• Honorarios: ${honorarios} MXN
• Total: ${total} MXN

⏱️ Esta cotización tiene validez de 7 días.
📄 Detalle completo: {url_pdf}

Saludos,
R&R Importaciones
```

### Endpoint

- POST /api/cotizaciones/{id}/whatsapp-link
  - Body: telefono (con código país, ej. 528671234567).
  - Genera URL de PDF temporal (válida 7 días).
  - Devuelve { whatsapp_url: "https://wa.me/...", pdf_url: "..." }
  - Marca cotización como enviada cuando el primo confirma desde la UI.

### Frontend

En /cotizaciones/{id}:
- Botón "Enviar por correo" → modal con email + mensaje + preview.
- Botón "Enviar por WhatsApp" → modal con teléfono + preview del mensaje + 
  botón "Abrir WhatsApp" (que abre wa.me en nueva ventana).
- Después de cualquier envío, badge "Enviada el {fecha}".

## PLANTILLAS CONFIGURABLES

Crear tabla `plantillas_mensaje`:
- id, tenant_id, codigo (RECORDATORIO_PAGO, COTIZACION_WHATSAPP, etc.), 
  asunto (para email), cuerpo, variables_disponibles (JSON con metadatos).

Pantalla /admin/plantillas — CRUD simple. Permite al primo personalizar mensajes.

Variables usables con sintaxis {variable}:
- {cliente_apodo}, {cliente_nombre}, {vehiculo_marca}, {vehiculo_modelo}, 
  {vehiculo_año}, {vehiculo_vin}, {total}, {fecha_expiracion}, {url_pdf}.

## ENTREGABLES

- PDF de cotización generado, descargable, con diseño profesional.
- Envío por email funcionando contra Mailtrap (desarrollo).
- Generación de link wa.me funcionando.
- Plantillas editables.
- Flujo completo end-to-end: ingresar VIN → calcular → guardar → enviar → 
  cliente recibe PDF.

Al terminar B2, el cotizador está 100% operativo.
```

---

# PROMPT INTEGRACIÓN A+B — Conversión Cotización → Trámite

Pasa este prompt **al final**, cuando A3 y B2 ambos estén listos:

---

```
Vas a conectar los caminos A (Trámites) y B (Cotizaciones). El flujo final es:
Cotización aceptada → conversión automática a Trámite con todos los datos heredados.

## FLUJO

1. Una cotización en estado ACEPTADA puede convertirse en trámite.
2. La conversión es automática en sus campos pero requiere confirmación del usuario 
   para datos que la cotización no tenía (tramitador, aduana, etc.).
3. Después de convertida, el campo convertida_a_tramite_id de la cotización guarda 
   referencia al trámite generado. La cotización queda INMUTABLE (no se puede 
   editar).
4. El trámite generado tiene una referencia inversa al origen.

## BACKEND

### Endpoint

- POST /api/cotizaciones/{id}/convertir-a-tramite
  - Body: 
    {
      aduana_codigo: required,
      tramitador_id: required,
      tipo_tramite: required (NORMAL/EXPRESS/ASESORIA_LOGISTICA),
      notas_adicionales: optional
    }
  - Solo si cotizacion.estado = ACEPTADA y convertida_a_tramite_id = null.
  - Validar que cliente_id de la cotización no sea null (si lo es, error 422 
    "Cotización sin cliente vinculado").
  - Si vehículo no existe (cotización con datos manuales sin VIN), crearlo 
    primero.
  - Crear trámite con:
    - cliente_id, vehiculo_id de la cotización
    - aduana_codigo, tramitador_id, tipo_tramite del body
    - cobro_total = cotizacion.total
    - honorarios = cotizacion.honorarios
    - cargo_express = si tipo_tramite=EXPRESS, calcularlo
    - cotizacion_id = cotizacion.id
    - estado inicial = PENDIENTE_TRAMITE
    - numero_consecutivo autogenerado
  - Actualizar cotización: convertida_a_tramite_id = nuevo_tramite_id, 
    estado = CONVERTIDA.
  - Crear evento de timeline en trámite: "Trámite originado por cotización #{folio}".
  - Retornar el trámite creado.

## FRONTEND

### Pantalla /cotizaciones/{id}

Cuando cotización está en estado ACEPTADA y no convertida:
- Banner verde grande arriba: "Esta cotización fue aceptada por el cliente. 
  ¿Convertir en trámite formal?"
- Botón principal "Convertir a trámite" → abre modal.

### Modal de conversión

- Resumen de cotización (no editable).
- Campos a completar:
  - Aduana: dropdown con catálogo de aduanas.
  - Tramitador: dropdown con tramitadores activos.
  - Tipo de trámite: NORMAL / EXPRESS / ASESORIA_LOGISTICA.
  - Notas adicionales (textarea opcional).
- Botón "Crear trámite" → POST al endpoint → redirige a /tramites/{nuevo_id}.

### Pantalla /tramites/{id}

Si el trámite tiene cotizacion_id:
- Tarjeta lateral "Originado en cotización #{folio}" con link a la cotización.
- Mostrar fecha de cotización y de conversión.

### Pantalla /cotizaciones (lista)

- Columna nueva: "Convertida" con indicador visual si tiene trámite.
- Click en indicador navega al trámite.

## REGLAS DE NEGOCIO

1. Una cotización solo se puede convertir UNA vez. Después, queda inmutable.
2. Si la cotización expira sin convertirse, queda en estado EXPIRADA (job 
   automático corre diariamente).
3. Si el cliente cambia de opinión después de convertida, el trámite se cancela 
   pero la cotización original queda como histórico (no se restaura).

## DASHBOARD MEJORADO

Actualizar /inicio para incluir:
- Tarjeta "Cotizaciones pendientes de respuesta" (ENVIADA, no aceptada/rechazada, 
  no expirada).
- Tarjeta "Cotizaciones por expirar (próximos 2 días)".
- Lista "Últimas cotizaciones aceptadas listas para convertir".

## REPORTE DE CONVERSIÓN

Endpoint nuevo: GET /api/reportes/conversion-cotizaciones?desde=&hasta=
- Total cotizaciones emitidas en el periodo.
- Total aceptadas vs rechazadas vs expiradas.
- Tasa de conversión global.
- Tiempo promedio entre emisión y aceptación.
- Top clientes por # cotizaciones.

Pantalla /reportes/cotizaciones con gráficas (Chart.js o ngx-charts).

## ENTREGABLES

- Flujo completo cotización → trámite funcionando.
- Cotización inmutable post-conversión.
- Trámite con referencia a cotización origen.
- Dashboard ejecutivo actualizado.
- Reporte de conversión funcional.

CIERRE DEL MVP: con esto, el sistema R&R está operativo de extremo a extremo.
```

---

# SCHEMA SQL COMPLETO

> Este es el schema consolidado con todos los hallazgos. Va dentro del Prompt 0 y se ejecuta como primera migration de EF Core.

```sql
-- ============================================================
-- SCHEMA RR IMPORTACIONES - MVP COMPLETO
-- PostgreSQL 16+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============ TENANTS ============

CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          VARCHAR(120) NOT NULL,
  razon_social    VARCHAR(180),
  rfc             VARCHAR(13),
  activo          BOOLEAN DEFAULT TRUE,
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  configuracion   JSONB DEFAULT '{}'::JSONB
);

-- ============ CATÁLOGOS GLOBALES ============

CREATE TABLE aduanas (
  codigo          VARCHAR(4) PRIMARY KEY,
  nombre          VARCHAR(80) NOT NULL,
  estado          VARCHAR(60),
  activa          BOOLEAN DEFAULT TRUE
);

CREATE TABLE marcas (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(80) NOT NULL UNIQUE,
  aliases         TEXT[] DEFAULT ARRAY[]::TEXT[]
);

CREATE INDEX idx_marcas_nombre_trgm ON marcas USING gin(nombre gin_trgm_ops);

CREATE TABLE fracciones_arancelarias (
  codigo          VARCHAR(12) PRIMARY KEY,
  descripcion     TEXT NOT NULL,
  categoria       VARCHAR(40)
);

CREATE TABLE precios_estimados (
  id                       SERIAL PRIMARY KEY,
  fraccion_arancelaria     VARCHAR(12) REFERENCES fracciones_arancelarias(codigo),
  marca_id                 INTEGER REFERENCES marcas(id),
  modelo                   VARCHAR(160) NOT NULL,
  inciso                   VARCHAR(40),
  vigente_desde            DATE NOT NULL,
  vigente_hasta            DATE,
  es_generico              BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_pe_lookup ON precios_estimados(fraccion_arancelaria, marca_id, modelo);
CREATE INDEX idx_pe_generico ON precios_estimados(fraccion_arancelaria, es_generico) WHERE es_generico = TRUE;

CREATE TABLE precios_por_antiguedad (
  id                       SERIAL PRIMARY KEY,
  precio_estimado_id       INTEGER REFERENCES precios_estimados(id) ON DELETE CASCADE,
  antiguedad_anios         INTEGER NOT NULL CHECK (antiguedad_anios BETWEEN 1 AND 12),
  precio_usd               NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_ppa_lookup ON precios_por_antiguedad(precio_estimado_id, antiguedad_anios);

CREATE TABLE tabulador_amparo (
  id                       SERIAL PRIMARY KEY,
  año_modelo               INTEGER NOT NULL,
  categoria                VARCHAR(40) NOT NULL,  -- '4_CIL', '6_CIL', '8_CIL', 'PICKUP', 'LUJO'
  precio_mxn               NUMERIC(12,2) NOT NULL,
  vigente_desde            DATE NOT NULL,
  vigente_hasta            DATE
);

CREATE TABLE parametros_fiscales (
  id                       SERIAL PRIMARY KEY,
  vigente_desde            DATE NOT NULL,
  vigente_hasta            DATE,
  regimen                  VARCHAR(20) NOT NULL,
  dta_porcentaje           NUMERIC(5,4),
  dta_fijo                 NUMERIC(10,2),
  iva_porcentaje           NUMERIC(5,4) NOT NULL,
  igi_porcentaje           NUMERIC(5,4),
  prev_fijo                NUMERIC(10,2) DEFAULT 0,
  prv_fijo                 NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE catalogo_tipos_gasto (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(80) NOT NULL UNIQUE,
  categoria       VARCHAR(40)
);

-- Caches de APIs externas
CREATE TABLE nhtsa_cache (
  vin             VARCHAR(17) PRIMARY KEY,
  data            JSONB NOT NULL,
  fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tipos_cambio_cache (
  fecha           DATE PRIMARY KEY,
  tc              NUMERIC(8,4) NOT NULL,
  fuente          VARCHAR(20) DEFAULT 'BANXICO',
  fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============ TENANT-SPECIFIC ============

CREATE TABLE honorarios (
  id                       SERIAL PRIMARY KEY,
  tenant_id                UUID REFERENCES tenants(id),
  tipo_mercancia           VARCHAR(40),
  regimen                  VARCHAR(20),
  monto_mxn                NUMERIC(12,2) NOT NULL,
  vigente_desde            DATE NOT NULL,
  vigente_hasta            DATE
);

CREATE TABLE tramitadores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  nombre          VARCHAR(60) NOT NULL,
  activo          BOOLEAN DEFAULT TRUE,
  comision_tipo   VARCHAR(20),
  comision_valor  NUMERIC(10,4),
  UNIQUE(tenant_id, nombre)
);

CREATE TABLE personal_campo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  nombre          VARCHAR(60) NOT NULL,
  rol             VARCHAR(20),
  telefono        VARCHAR(20),
  activo          BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, nombre)
);

CREATE TABLE partners_externos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id),
  nombre          VARCHAR(60) NOT NULL,
  aliases         TEXT[] DEFAULT ARRAY[]::TEXT[],
  tipo            VARCHAR(30),
  notas           TEXT
);

CREATE TABLE clientes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  apodo                    VARCHAR(80) NOT NULL,
  nombre_completo          VARCHAR(180),
  rfc                      VARCHAR(13),
  telefono                 VARCHAR(20),
  email                    VARCHAR(120),
  procedencia              VARCHAR(80),
  notas                    TEXT,
  creado_en                TIMESTAMPTZ DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ,
  UNIQUE(tenant_id, apodo)
);

CREATE INDEX idx_clientes_apodo_trgm ON clientes USING gin(apodo gin_trgm_ops);

CREATE TABLE vehiculos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  cliente_id               UUID REFERENCES clientes(id),
  vin                      VARCHAR(17),
  vin_corto                VARCHAR(8),
  marca_id                 INTEGER REFERENCES marcas(id),
  modelo                   VARCHAR(120),
  año                      INTEGER,
  cilindrada_cm3           INTEGER,
  numero_cilindros         INTEGER,
  tipo_combustible         VARCHAR(20),
  categoria                VARCHAR(40),
  fraccion_arancelaria     VARCHAR(12) REFERENCES fracciones_arancelarias(codigo),
  datos_nhtsa_raw          JSONB,
  -- Estado pre-trámite (sustituye INVENTARIO CARROS del Excel viejo)
  fecha_ingreso_patio      DATE,
  ubicacion_actual         VARCHAR(60),
  notas_estado             TEXT,
  cumplio_requisitos       BOOLEAN DEFAULT FALSE,
  tiene_sello_aduanal      BOOLEAN DEFAULT FALSE,
  fecha_pedimento_proforma DATE,
  
  creado_en                TIMESTAMPTZ DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX idx_vehiculos_vin ON vehiculos(vin) WHERE vin IS NOT NULL;
CREATE INDEX idx_vehiculos_vin_corto ON vehiculos(vin_corto);
CREATE INDEX idx_vehiculos_cliente ON vehiculos(cliente_id);

CREATE TABLE cotizaciones (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  folio                    VARCHAR(20) NOT NULL,
  fecha_emision            DATE NOT NULL,
  fecha_expiracion         DATE NOT NULL,
  vehiculo_id              UUID REFERENCES vehiculos(id),
  cliente_id               UUID REFERENCES clientes(id),
  
  fuente_precio            VARCHAR(20),
  precio_estimado_id       INTEGER REFERENCES precios_estimados(id),
  valor_aduana_usd         NUMERIC(12,2),
  
  tc_referencia            NUMERIC(8,4),
  tc_margen                NUMERIC(6,4),
  tc_aplicado              NUMERIC(8,4),
  tc_fecha_referencia      DATE,
  
  regimen_fiscal           VARCHAR(20),
  valor_pesos              NUMERIC(14,2),
  igi                      NUMERIC(12,2),
  igi_porcentaje_aplicado  NUMERIC(5,4),
  dta                      NUMERIC(12,2),
  iva                      NUMERIC(12,2),
  prev                     NUMERIC(10,2),
  prv                      NUMERIC(10,2),
  impuestos_total          NUMERIC(14,2),
  honorarios               NUMERIC(12,2),
  cargo_express            NUMERIC(10,2) DEFAULT 0,
  total                    NUMERIC(14,2) NOT NULL,
  
  tipo_tramite             VARCHAR(20) DEFAULT 'NORMAL',
  estado                   VARCHAR(20) DEFAULT 'BORRADOR',
  -- BORRADOR, ENVIADA, ACEPTADA, RECHAZADA, EXPIRADA, CONVERTIDA
  
  enviado_por              VARCHAR(20),
  enviado_a                VARCHAR(120),
  enviado_en               TIMESTAMPTZ,
  
  motivo_rechazo           TEXT,
  notas                    TEXT,
  creado_por               UUID,
  creado_en                TIMESTAMPTZ DEFAULT NOW(),
  convertida_a_tramite_id  UUID,
  
  UNIQUE(tenant_id, folio)
);

CREATE INDEX idx_cotizaciones_estado ON cotizaciones(tenant_id, estado);
CREATE INDEX idx_cotizaciones_cliente ON cotizaciones(cliente_id);

CREATE TABLE tramites (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  numero_consecutivo       INTEGER NOT NULL,
  numero_legacy            VARCHAR(20),
  
  fecha_inicio             DATE NOT NULL,
  fecha_desaduanado        TIMESTAMPTZ,
  fecha_entregado          DATE,
  fecha_cobrado            DATE,
  
  cliente_id               UUID REFERENCES clientes(id),
  vehiculo_id              UUID REFERENCES vehiculos(id),
  tipo_mercancia           VARCHAR(40) DEFAULT 'VEHICULO',
  descripcion_mercancia    TEXT,
  
  aduana_codigo            VARCHAR(4) REFERENCES aduanas(codigo),
  tramitador_id            UUID REFERENCES tramitadores(id),
  tipo_tramite             VARCHAR(20) DEFAULT 'NORMAL',
  -- NORMAL, EXPRESS, ASESORIA_LOGISTICA
  
  cotizacion_id            UUID REFERENCES cotizaciones(id),
  cobro_total              NUMERIC(14,2) NOT NULL,
  honorarios               NUMERIC(12,2),
  cargo_express            NUMERIC(10,2) DEFAULT 0,
  
  estado                   VARCHAR(30) DEFAULT 'PENDIENTE_TRAMITE',
  -- PENDIENTE_TRAMITE, EN_PROCESO, ROJO_DESADUANADO, VERDE_ENTREGADO, 
  -- AMARILLO_PENDIENTE_PAGO, COBRADO, CANCELADO
  
  notas                    TEXT,
  creado_por               UUID,
  creado_en                TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, numero_consecutivo)
);

-- FK inversa después de crear tramites
ALTER TABLE cotizaciones ADD CONSTRAINT fk_cotizacion_tramite 
  FOREIGN KEY (convertida_a_tramite_id) REFERENCES tramites(id);

CREATE INDEX idx_tramites_estado ON tramites(tenant_id, estado);
CREATE INDEX idx_tramites_fecha ON tramites(tenant_id, fecha_inicio DESC);
CREATE INDEX idx_tramites_cliente ON tramites(cliente_id);
CREATE INDEX idx_tramites_tramitador ON tramites(tramitador_id);

CREATE TABLE pedimentos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id               UUID REFERENCES tramites(id) ON DELETE CASCADE,
  numero                   VARCHAR(40) NOT NULL,
  tipo                     VARCHAR(10) DEFAULT 'ORIGINAL',
  fecha                    DATE,
  motivo_rectificacion     TEXT,
  responsable_error        VARCHAR(20),
  cobro_adicional          NUMERIC(10,2) DEFAULT 0,
  notas                    TEXT
);

CREATE TABLE tramite_eventos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id               UUID REFERENCES tramites(id) ON DELETE CASCADE,
  tipo                     VARCHAR(40),
  contenido                TEXT,
  metadata                 JSONB,
  personal_campo_id        UUID REFERENCES personal_campo(id),
  partner_externo_id       UUID REFERENCES partners_externos(id),
  creado_por               UUID,
  creado_en                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_eventos_tramite ON tramite_eventos(tramite_id, creado_en DESC);

CREATE TABLE entregas (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id               UUID REFERENCES tramites(id),
  fecha                    TIMESTAMPTZ DEFAULT NOW(),
  responsable_campo_id     UUID REFERENCES personal_campo(id),
  recibido_por_partner_id  UUID REFERENCES partners_externos(id),
  descripcion              TEXT,
  ubicacion_entrega        VARCHAR(60),
  documentos_entregados    TEXT[],
  notas                    TEXT
);

CREATE TABLE pagos (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  tramite_id               UUID REFERENCES tramites(id),
  fecha_pago               DATE NOT NULL,
  monto                    NUMERIC(14,2) NOT NULL,
  moneda                   CHAR(3) DEFAULT 'MXN',
  tipo_cambio              NUMERIC(8,4) DEFAULT 1,
  monto_mxn                NUMERIC(14,2) GENERATED ALWAYS AS (monto * tipo_cambio) STORED,
  metodo                   VARCHAR(30),
  banco                    VARCHAR(40),
  referencia               VARCHAR(120),
  comprobante_url          VARCHAR(500) NOT NULL,
  
  verificado               BOOLEAN DEFAULT FALSE,
  verificado_por           UUID,
  verificado_en            TIMESTAMPTZ,
  
  capturado_por            UUID NOT NULL,
  capturado_en             TIMESTAMPTZ DEFAULT NOW(),
  notas                    TEXT,
  deleted_at               TIMESTAMPTZ
);

CREATE INDEX idx_pagos_tramite ON pagos(tramite_id);
CREATE INDEX idx_pagos_fecha ON pagos(tenant_id, fecha_pago DESC);

CREATE TABLE gastos_hormiga (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  cliente_id               UUID REFERENCES clientes(id),
  vehiculo_id              UUID REFERENCES vehiculos(id),
  tramite_id               UUID REFERENCES tramites(id),
  tipo_gasto_id            INTEGER REFERENCES catalogo_tipos_gasto(id),
  fecha                    DATE NOT NULL,
  concepto                 TEXT NOT NULL,
  monto                    NUMERIC(12,2) NOT NULL,
  moneda                   CHAR(3) DEFAULT 'MXN',
  gasto_usd                NUMERIC(12,2),
  se_carga_al_cliente      BOOLEAN DEFAULT TRUE,
  comprobante_url          VARCHAR(500),
  pagado_por               UUID,
  creado_en                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gastos_cliente ON gastos_hormiga(cliente_id);
CREATE INDEX idx_gastos_tramite ON gastos_hormiga(tramite_id);

-- ============ ACCESO ============

CREATE TABLE usuarios (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  username                 VARCHAR(40) NOT NULL,
  password_hash            VARCHAR(200) NOT NULL,
  nombre_completo          VARCHAR(120),
  email                    VARCHAR(120),
  rol                      VARCHAR(30),
  activo                   BOOLEAN DEFAULT TRUE,
  ultimo_login             TIMESTAMPTZ,
  creado_en                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, username)
);

CREATE TABLE refresh_tokens (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id               UUID REFERENCES usuarios(id),
  token_hash               VARCHAR(200) NOT NULL,
  expira_en                TIMESTAMPTZ NOT NULL,
  revocado                 BOOLEAN DEFAULT FALSE,
  creado_en                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_usuario ON refresh_tokens(usuario_id);

CREATE TABLE permisos (
  id                       SERIAL PRIMARY KEY,
  rol                      VARCHAR(30),
  modulo                   VARCHAR(40),
  campo                    VARCHAR(60),
  puede_ver                BOOLEAN DEFAULT FALSE,
  puede_crear              BOOLEAN DEFAULT FALSE,
  puede_editar             BOOLEAN DEFAULT FALSE,
  puede_eliminar           BOOLEAN DEFAULT FALSE,
  UNIQUE(rol, modulo, campo)
);

CREATE TABLE auditoria (
  id                       BIGSERIAL PRIMARY KEY,
  tenant_id                UUID,
  usuario_id               UUID,
  accion                   VARCHAR(60),
  tabla                    VARCHAR(40),
  registro_id              VARCHAR(40),
  datos_antes              JSONB,
  datos_despues            JSONB,
  ip                       INET,
  user_agent               TEXT,
  ocurrido_en              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auditoria_tenant_fecha ON auditoria(tenant_id, ocurrido_en DESC);

-- ============ PLANTILLAS MENSAJE ============

CREATE TABLE plantillas_mensaje (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id),
  codigo                   VARCHAR(40) NOT NULL,
  asunto                   VARCHAR(200),
  cuerpo                   TEXT NOT NULL,
  variables_disponibles    JSONB,
  activa                   BOOLEAN DEFAULT TRUE,
  UNIQUE(tenant_id, codigo)
);
```

---

# Notas finales

**Para ti antes de pasar a Claude Code:**

1. **Schema SQL como artifact separado**: en lugar de pegar el bloque completo dentro del Prompt 0, te recomiendo que guardes el SQL en un archivo `schema-rr.sql` aparte y referencies "el schema está en `/db/schema-rr.sql`, cárgalo como migration inicial". Es más limpio.

2. **Token de Banxico**: ANTES de empezar B1, ve a https://www.banxico.org.mx/SieAPIRest/service/v1/token y consigue un token gratuito. Sin esto, B1 no puede correr.

3. **Storage de archivos**: el MVP usa almacenamiento local. Cuando llegue el momento de producción real, considera migrar a Azure Blob Storage o S3 (no en el MVP).

4. **CFDI 4.0**: confirmaste que R&R no tiene PAC. El sistema GENERA recibos en PDF (no CFDI). Cuando contraten un PAC, agregamos integración en una fase posterior.

5. **Si Claude Code se "pierde" en una sesión**: significa que el prompt fue demasiado grande para el contexto. Divide ese prompt en sub-prompts (ej: "ahora construye solo los endpoints de Clientes" → "ahora construye solo las pantallas Angular de Clientes").

6. **Sobre la pestaña ARREGLO del Excel viejo**: confirmado que se ignora completa.

7. **Datos extraídos durante este análisis** que necesitarás para los seeds:
   - 250 clientes únicos (apodos) extraíbles del CSV
   - 80 marcas únicas detectables (con sus aliases)
   - ~2,591 trámites históricos para migración

Cuando arranques con el Prompt 0, dime cómo salió. Si Claude Code construyó algo distinto a lo esperado, lo iteramos antes de pasar a A1.
