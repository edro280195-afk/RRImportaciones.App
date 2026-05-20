# RR Importaciones

Sistema SaaS multi-tenant para agencias de importación de vehículos en la frontera norte de México.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 19, standalone components, signals, Tailwind CSS v4, PrimeNG |
| Backend | .NET 10 Web API, Clean Architecture (Domain, Application, Infrastructure, API) |
| Base de datos | PostgreSQL 16 con pgcrypto y pg_trgm |
| ORM | EF Core + Dapper (híbrido) |
| Auth | JWT + refresh tokens, BCrypt |

## Requisitos

- Node.js 20+
- .NET 10 SDK
- PostgreSQL 16 (local o Docker)
- Angular CLI 19 (`npm install -g @angular/cli@19`)

## Inicio rápido

### 1. Base de datos

Con Docker:
```bash
docker compose up -d
```

Sin Docker: asegúrate de tener PostgreSQL 16 corriendo en localhost:5432.

### 2. Backend (.NET API)

```bash
cd backend
dotnet restore
dotnet ef database update --project RR.Migrations --startup-project RR.Api
dotnet run --project RR.Api
```

La API se levanta en `http://localhost:5000` con Swagger en `/swagger`.

Seed ejecutado automáticamente al iniciar:
- **Usuario admin**: `admin` / `Stejrskal*4`
- Tenant: R&R Importaciones
- Catálogos: aduanas, fracciones, tipos de gasto, roles y permisos

### 3. Frontend (Angular)

```bash
cd frontend
npm install
npm run start
```

Abre `http://localhost:4200` e inicia sesión con admin/Stejrskal*4.

## Estructura del proyecto

```
RRImportaciones/
├── backend/
│   ├── RR.Domain/          # Entidades, enums, interfaces del dominio
│   ├── RR.Application/     # DTOs, interfaces de servicio, validadores
│   ├── RR.Infrastructure/  # EF Core DbContext, Dapper, JWT, Serilog
│   ├── RR.Migrations/      # Migraciones de EF Core
│   ├── RR.Api/             # Controladores, middleware, Program.cs
│   └── RR.sln
├── frontend/               # Aplicación Angular
├── docker-compose.yml
└── README.md
```

## Endpoints de la API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Inicio de sesión |
| POST | `/api/auth/refresh` | Renovar token |
| POST | `/api/auth/logout` | Cerrar sesión |

## Convenciones

- Código en inglés, comentarios de negocio en español
- UI visible al usuario en español
- Tablas de BD en español, columnas en snake_case
- Endpoints en kebab-case inglés
- Sin AutoMapper ni MediatR — proyecciones manuales y servicios planos
