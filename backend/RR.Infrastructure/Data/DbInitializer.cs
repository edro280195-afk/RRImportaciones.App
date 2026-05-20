using Microsoft.EntityFrameworkCore;
using RR.Domain.Entities;

namespace RR.Infrastructure.Data;

public static class DbInitializer
{
    private static readonly string[] TableDeleteOrder =
    [
        "RefreshTokens",
        "AuditoriaLogs",
        "RolesPermisos",
        "CotizacionesDetalles",
        "PreciosEstimados",
        "Entregas",
        "GastosHormiga",
        "Eventos",
        "Pagos",
        "Pedimentos",
        "Cotizaciones",
        "Tramites",
        "Vehiculos",
        "Usuarios",
        "Modelos",
        "PatentesAduana",
        "Clientes",
        "Roles",
        "Marcas",
        "FraccionesArancelarias",
        "Aduanas",
        "Tramitadores",
        "PersonalCampo",
        "PartnersExternos",
        "TiposGastoHormiga",
        "ParametrosFiscales",
        "HonorariosConfig",
        "TabuladoresAmparo",
        "Permisos",
        "Tenants",
    ];

    public static async Task SeedAsync(AppDbContext db, bool forceReseed = false)
    {
        await db.Database.MigrateAsync();

        if (forceReseed)
            await ClearAllDataAsync(db);

        await EnsureSystemPermissionsAsync(db);
        await MigrateLegacyRolesAsync(db);

        // Migrar fracción provisional 8704.31.01 a la oficial 8704.31.05
        var provisional = await db.FraccionesArancelarias.FirstOrDefaultAsync(f => f.Fraccion == "8704.31.01");
        var oficial = await db.FraccionesArancelarias.FirstOrDefaultAsync(f => f.Fraccion == "8704.31.05");
        if (provisional != null)
        {
            if (oficial == null)
            {
                provisional.Fraccion = "8704.31.05";
                provisional.Descripcion = "Pick-ups";
                provisional.Igi = 0.15m;
                provisional.TipoVehiculo = "PICKUP";
            }
            else
            {
                var precios = await db.PreciosEstimados.Where(p => p.FraccionId == provisional.Id).ToListAsync();
                foreach (var precio in precios)
                {
                    precio.FraccionId = oficial.Id;
                }

                var cotizaciones = await db.Cotizaciones.Where(c => c.Fraccion == "8704.31.01").ToListAsync();
                foreach (var cotizacion in cotizaciones)
                {
                    cotizacion.Fraccion = "8704.31.05";
                }

                db.FraccionesArancelarias.Remove(provisional);
            }
            await db.SaveChangesAsync();
        }

        if (await db.Tenants.AnyAsync()) return;

        var tenantId = Guid.Parse("a0000000-0000-0000-0000-000000000001");

        // 1. Tenant
        var tenant = new Tenant
        {
            Id = tenantId,
            NombreComercial = "R&R Importaciones",
            RazonSocial = "R&R Importaciones SA de CV",
            Rfc = "PENDIENTE",
            Email = "contacto@rryrimportaciones.com",
            Telefono = "+528671234567",
            Activo = true,
        };
        db.Tenants.Add(tenant);

        // 2. Roles
        var adminRole          = new Role { Id = Guid.NewGuid(), Nombre = "ADMIN",            Descripcion = "Acceso total al sistema", EsSistema = true };
        var gerenteRole        = new Role { Id = Guid.NewGuid(), Nombre = "GERENTE",          Descripcion = "Gestión operativa sin borrado", EsSistema = true };
        var facturacionRole    = new Role { Id = Guid.NewGuid(), Nombre = "FACTURACION",      Descripcion = "Oficina · Facturación y cobros a clientes", EsSistema = true };
        var coordinadoraRole   = new Role { Id = Guid.NewGuid(), Nombre = "COORDINADORA",     Descripcion = "Oficina · Coordinación de operaciones y agenda", EsSistema = true };
        var controlTramRole    = new Role { Id = Guid.NewGuid(), Nombre = "CONTROL_TRAMITES", Descripcion = "Oficina · Seguimiento y control de trámites aduanales", EsSistema = true };
        var yarderoRole        = new Role { Id = Guid.NewGuid(), Nombre = "YARDERO",          Descripcion = "Campo · Fotos, inventario y maniobras en yarda", EsSistema = true };
        var choferRole         = new Role { Id = Guid.NewGuid(), Nombre = "CHOFER",           Descripcion = "Campo · Traslado y entrega de unidades", EsSistema = true };
        db.Roles.AddRange(adminRole, gerenteRole, facturacionRole, coordinadoraRole, controlTramRole, yarderoRole, choferRole);

        // 3. Permisos
        var permisos = new List<Permission>
        {
            new() { Id = Guid.NewGuid(), Codigo = "TRAMITES_VER", Nombre = "Ver trámites", Modulo = "TRAMITES" },
            new() { Id = Guid.NewGuid(), Codigo = "TRAMITES_CREAR", Nombre = "Crear trámites", Modulo = "TRAMITES" },
            new() { Id = Guid.NewGuid(), Codigo = "TRAMITES_EDITAR", Nombre = "Editar trámites", Modulo = "TRAMITES" },
            new() { Id = Guid.NewGuid(), Codigo = "TRAMITES_BORRAR", Nombre = "Borrar trámites", Modulo = "TRAMITES" },
            new() { Id = Guid.NewGuid(), Codigo = "TRAMITES_ASIGNAR", Nombre = "Asignar trámites", Modulo = "TRAMITES" },
            new() { Id = Guid.NewGuid(), Codigo = "CLIENTES_VER", Nombre = "Ver clientes", Modulo = "CLIENTES" },
            new() { Id = Guid.NewGuid(), Codigo = "CLIENTES_CREAR", Nombre = "Crear clientes", Modulo = "CLIENTES" },
            new() { Id = Guid.NewGuid(), Codigo = "CLIENTES_EDITAR", Nombre = "Editar clientes", Modulo = "CLIENTES" },
            new() { Id = Guid.NewGuid(), Codigo = "COTIZACIONES_VER", Nombre = "Ver cotizaciones", Modulo = "COTIZACIONES" },
            new() { Id = Guid.NewGuid(), Codigo = "COTIZACIONES_CREAR", Nombre = "Crear cotizaciones", Modulo = "COTIZACIONES" },
            new() { Id = Guid.NewGuid(), Codigo = "COTIZACIONES_EDITAR", Nombre = "Editar cotizaciones", Modulo = "COTIZACIONES" },
            new() { Id = Guid.NewGuid(), Codigo = "PAGOS_VER", Nombre = "Ver pagos", Modulo = "PAGOS" },
            new() { Id = Guid.NewGuid(), Codigo = "PAGOS_REGISTRAR", Nombre = "Registrar pagos", Modulo = "PAGOS" },
            new() { Id = Guid.NewGuid(), Codigo = "GASTOS_VER", Nombre = "Ver gastos hormiga", Modulo = "GASTOS" },
            new() { Id = Guid.NewGuid(), Codigo = "GASTOS_REGISTRAR", Nombre = "Registrar gastos hormiga", Modulo = "GASTOS" },
            new() { Id = Guid.NewGuid(), Codigo = "REPORTES_FINANCIEROS", Nombre = "Ver reportes financieros", Modulo = "REPORTES" },
            new() { Id = Guid.NewGuid(), Codigo = "USUARIOS_VER", Nombre = "Ver usuarios", Modulo = "USUARIOS" },
            new() { Id = Guid.NewGuid(), Codigo = "USUARIOS_CREAR", Nombre = "Crear usuarios", Modulo = "USUARIOS" },
            new() { Id = Guid.NewGuid(), Codigo = "USUARIOS_EDITAR", Nombre = "Editar usuarios", Modulo = "USUARIOS" },
            new() { Id = Guid.NewGuid(), Codigo = "USUARIOS_BORRAR", Nombre = "Borrar usuarios", Modulo = "USUARIOS" },
            new() { Id = Guid.NewGuid(), Codigo = "EVENTOS_CREAR", Nombre = "Crear eventos/notas", Modulo = "EVENTOS" },
            new() { Id = Guid.NewGuid(), Codigo = "CAMPO_USAR", Nombre = "Acceso al módulo campo (fotos y tareas en yarda)", Modulo = "CAMPO" },
            new() { Id = Guid.NewGuid(), Codigo = "CATALOGOS_VER", Nombre = "Ver catálogos", Modulo = "CATALOGOS" },
            new() { Id = Guid.NewGuid(), Codigo = "CATALOGOS_EDITAR", Nombre = "Editar catálogos", Modulo = "CATALOGOS" },
        };
        db.Permisos.AddRange(permisos);

        await db.SaveChangesAsync();

        // 4. Roles-Permisos mapping
        var adminPermisos = permisos.Select(p => new RolePermission { RoleId = adminRole.Id, PermissionId = p.Id }).ToList();
        var gerentePermisos = permisos
            .Where(p => p.Codigo != "TRAMITES_BORRAR" && p.Codigo != "USUARIOS_BORRAR" && p.Codigo != "USUARIOS_CREAR" && p.Codigo != "USUARIOS_EDITAR")
            .Select(p => new RolePermission { RoleId = gerenteRole.Id, PermissionId = p.Id }).ToList();

        // Permisos heredados del antiguo CAPTURISTA — los 3 roles de Oficina nacen iguales
        // (después se ajustan desde la UI según las responsabilidades reales de cada uno).
        var oficinaCodigos = new[] { "COTIZACIONES_VER", "COTIZACIONES_CREAR", "COTIZACIONES_EDITAR", "PAGOS_VER", "PAGOS_REGISTRAR", "CLIENTES_VER", "CLIENTES_CREAR", "EVENTOS_CREAR" };
        var facturacionPermisos  = permisos.Where(p => oficinaCodigos.Contains(p.Codigo)).Select(p => new RolePermission { RoleId = facturacionRole.Id,   PermissionId = p.Id }).ToList();
        var coordinadoraPermisos = permisos.Where(p => oficinaCodigos.Contains(p.Codigo)).Select(p => new RolePermission { RoleId = coordinadoraRole.Id,  PermissionId = p.Id }).ToList();
        var controlTramPermisos  = permisos.Where(p => oficinaCodigos.Contains(p.Codigo)).Select(p => new RolePermission { RoleId = controlTramRole.Id,   PermissionId = p.Id }).ToList();

        // Permisos heredados del antiguo CAMPO — Yarderos y Choferes comparten exactamente lo mismo.
        var campoCodigos = new[] { "EVENTOS_CREAR", "TRAMITES_VER", "CAMPO_USAR" };
        var yarderoPermisos = permisos.Where(p => campoCodigos.Contains(p.Codigo)).Select(p => new RolePermission { RoleId = yarderoRole.Id, PermissionId = p.Id }).ToList();
        var choferPermisos  = permisos.Where(p => campoCodigos.Contains(p.Codigo)).Select(p => new RolePermission { RoleId = choferRole.Id,  PermissionId = p.Id }).ToList();

        db.RolesPermisos.AddRange(adminPermisos);
        db.RolesPermisos.AddRange(gerentePermisos);
        db.RolesPermisos.AddRange(facturacionPermisos);
        db.RolesPermisos.AddRange(coordinadoraPermisos);
        db.RolesPermisos.AddRange(controlTramPermisos);
        db.RolesPermisos.AddRange(yarderoPermisos);
        db.RolesPermisos.AddRange(choferPermisos);

        // 5. Admin user
        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Username = "admin",
            Email = "admin@rryrimportaciones.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Stejrskal*4"),
            Nombre = "Administrador",
            Apellidos = "R&R",
            RoleId = adminRole.Id,
            Activo = true,
        };
        db.Usuarios.Add(adminUser);

        // 6. Aduana Nuevo Laredo
        var aduana = new Aduana
        {
            Id = Guid.NewGuid(),
            ClaveAduana = "240",
            Nombre = "Aduana de Nuevo Laredo",
            Ciudad = "Nuevo Laredo",
            Estado = "Tamaulipas",
        };
        db.Aduanas.Add(aduana);

        db.PatentesAduana.AddRange(
            new PatenteAduana { Id = Guid.NewGuid(), AduanaId = aduana.Id, Patente = "1785", Descripcion = "Patente 1785" },
            new PatenteAduana { Id = Guid.NewGuid(), AduanaId = aduana.Id, Patente = "3583", Descripcion = "Patente 3583" },
            new PatenteAduana { Id = Guid.NewGuid(), AduanaId = aduana.Id, Patente = "1945", Descripcion = "Patente 1945" }
        );

        // 7. Fracciones arancelarias
        db.FraccionesArancelarias.AddRange(
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8703.22.02", Descripcion = "Automóviles 1.0 a 1.5 L", Igi = 0.15m, TipoVehiculo = "AUTOMOVIL", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8703.23.02", Descripcion = "Automóviles 1.6 a 3.0 L (y camionetas inciso B)", Igi = 0.20m, TipoVehiculo = "AUTOMOVIL", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8703.24.02", Descripcion = "Automóviles 3.1+ L (y camionetas inciso B)", Igi = 0.25m, TipoVehiculo = "AUTOMOVIL", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8703.32.02", Descripcion = "Híbridos diésel", Igi = 0.10m, TipoVehiculo = "HIBRIDO", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8703.33.02", Descripcion = "Eléctricos / híbridos", Igi = 0.05m, TipoVehiculo = "ELECTRICO", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8703.40.02", Descripcion = "Híbridos enchufables", Igi = 0.05m, TipoVehiculo = "HIBRIDO", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8703.60.02", Descripcion = "Otros híbridos", Igi = 0.10m, TipoVehiculo = "HIBRIDO", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8704.21.04", Descripcion = "Camiones < 5 ton", Igi = 0.20m, TipoVehiculo = "CAMION", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8704.22.07", Descripcion = "Camiones medianos", Igi = 0.20m, TipoVehiculo = "CAMION", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8704.23.02", Descripcion = "Tractocamiones", Igi = 0.20m, TipoVehiculo = "CAMION", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8704.31.05", Descripcion = "Pick-ups", Igi = 0.15m, TipoVehiculo = "PICKUP", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8704.32.07", Descripcion = "Pick-ups pesadas", Igi = 0.20m, TipoVehiculo = "PICKUP", Activo = true },
            new FraccionArancelaria { Id = Guid.NewGuid(), Fraccion = "8701.21.01", Descripcion = "Tractores carretera", Igi = 0.15m, TipoVehiculo = "TRACTOR", Activo = true }
        );

        // 8. Tipos de gasto hormiga
        db.TiposGastoHormiga.AddRange(
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "COMBUSTIBLE", Nombre = "Gasolina", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "COMBUSTIBLE", Nombre = "Diésel", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "COMBUSTIBLE", Nombre = "Aceite", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "TRANSPORTE", Nombre = "Flete", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "TRANSPORTE", Nombre = "Pensión", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "TRANSPORTE", Nombre = "Cruce americano", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "DOCUMENTACION", Nombre = "Bill of Sale", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "DOCUMENTACION", Nombre = "Permiso", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "DOCUMENTACION", Nombre = "Copias", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "DOCUMENTACION", Nombre = "Holograma", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "SERVICIOS", Nombre = "Cerrajero", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "SERVICIOS", Nombre = "Seguro extra", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "SERVICIOS", Nombre = "Lavado", Activo = true },
            new TipoGastoHormiga { Id = Guid.NewGuid(), Categoria = "OTROS", Nombre = "Otros", Activo = true }
        );

        // 9. Parámetros fiscales — alineados al Excel TABULADOR 2026
        db.ParametrosFiscales.AddRange(
            new ParametroFiscal { Id = Guid.NewGuid(), Regimen = "POST_2017", Descripcion = "Vehículos modelo 2017 en adelante", Igi = 0.10m, Dta = 0.008m, Iva = 0.16m, PrevFijo = 161m, PrvFijo = 350m, Activo = true },
            new ParametroFiscal { Id = Guid.NewGuid(), Regimen = "PRE_2016", Descripcion = "Vehículos modelo 2016 y anteriores", Igi = 0.50m, DtaFijo = 408m, Iva = 0.16m, PrevFijo = 240m, PrvFijo = 290m, Activo = true }
        );

        await db.SaveChangesAsync();

        // 10. Marcas
        var marcas = new List<Marca>
        {
            new() { Id = Guid.NewGuid(), Nombre = "Acura", Aliases = ["ACURA"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Audi", Aliases = ["AUDI", "AUDY"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "BMW", Aliases = ["B.M.W.", "BEE EM DOUBLE U"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Buick", Aliases = ["BUICK"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Cadillac", Aliases = ["CADDY", "CADILAC"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Chevrolet", Aliases = ["CHEVY", "CHEVROLET", "CHEV"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Chrysler", Aliases = ["CRYSLER", "CRISLER"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Dodge", Aliases = ["DODGE", "DOD"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Ford", Aliases = ["FORD"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Freightliner", Aliases = ["FREIGHT", "FR8LINER"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "GMC", Aliases = ["G.M.C."], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Honda", Aliases = ["HONDA"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Hyundai", Aliases = ["HYUNDAY", "HYUNDAI"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Infiniti", Aliases = ["INFINITY", "INFINITI"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "International", Aliases = ["INTENATIONAL", "INTERNACIONAL", "INTL"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Jaguar", Aliases = ["JAGUAR"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Jeep", Aliases = ["JEEP"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "John Deere", Aliases = ["JOHNDEERE", "JOHN DEREE", "DEERE"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Kenworth", Aliases = ["KENWORTH", "KENWORT"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Kia", Aliases = ["KIA"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Lexus", Aliases = ["LEXUS"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Lincoln", Aliases = ["LINCOLN"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Mazda", Aliases = ["MAZDA"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Mercedes-Benz", Aliases = ["MERCEDES", "MB", "MERC", "MERC BENZ"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Mitsubishi", Aliases = ["MITSUBISHI", "MITSU"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Nissan", Aliases = ["NISSAN"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Peterbilt", Aliases = ["PETERBILT", "PETER"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Subaru", Aliases = ["SUBARU"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Toyota", Aliases = ["TOYOTA"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Volkswagen", Aliases = ["VW", "VOLKSWAGEN", "WOLKSWAGEN", "VOLKS"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Volvo", Aliases = ["VOLVO"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Ram", Aliases = ["RAM", "DODGE RAM"], Activo = true },
            new() { Id = Guid.NewGuid(), Nombre = "Tesla", Aliases = ["TESLA"], Activo = true },
        };
        db.Marcas.AddRange(marcas);
        await db.SaveChangesAsync();

        // 11. Clientes
        var clientes = new List<Cliente>
        {
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Ricardo Rodríguez", Apodo = "Richie", NombreCompleto = "Ricardo Rodríguez Hernández", Rfc = "ROHR920101XXX", Telefono = "+528671234501", Email = "richie@email.com", Procedencia = "Texas, USA", Direccion = "Calle 1, Col. Centro", Notas = "Cliente frecuente", FechaRegistro = DateTime.UtcNow.AddDays(-90), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "María García", Apodo = "Mary", NombreCompleto = "María García López", Rfc = "GALM850203XXX", Telefono = "+528671234502", Email = "mary@email.com", Procedencia = "California, USA", Direccion = "Av. Principal 123", FechaRegistro = DateTime.UtcNow.AddDays(-75), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Juan Pérez", Apodo = "Juancho", NombreCompleto = "Juan Pérez Martínez", Rfc = "PEMJ900504XXX", Telefono = "+528671234503", Procedencia = "Arizona, USA", Direccion = "Blvd. Industrial 456", FechaRegistro = DateTime.UtcNow.AddDays(-60), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Ana López", Apodo = "Anita", NombreCompleto = "Ana López Torres", Rfc = "LOTA950605XXX", Telefono = "+528671234504", Email = "ana@email.com", Procedencia = "Texas, USA", Notas = "Prefiere contacto por email", FechaRegistro = DateTime.UtcNow.AddDays(-50), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Carlos Sánchez", Apodo = "Charlie", NombreCompleto = "Carlos Sánchez Ramírez", Rfc = "SARC880706XXX", Telefono = "+528671234505", Procedencia = "Nevada, USA", Direccion = "Zona Industrial, Lote 7", FechaRegistro = DateTime.UtcNow.AddDays(-40), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Luisa Fernández", Apodo = "Lu", NombreCompleto = "Luisa Fernández Vargas", Rfc = "FEVL910807XXX", Email = "lu@email.com", Procedencia = "Colorado, USA", FechaRegistro = DateTime.UtcNow.AddDays(-30), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Miguel Ángel Torres", Apodo = "Miky", NombreCompleto = "Miguel Ángel Torres Ruiz", Rfc = "TORR920908XXX", Telefono = "+528671234507", Procedencia = "Texas, USA", Direccion = "Carretera Nacional Km 15", Notas = "Compra vehículos pesados", FechaRegistro = DateTime.UtcNow.AddDays(-25), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Sofía Castillo", Apodo = "Sofi", NombreCompleto = "Sofía Castillo Mendoza", Rfc = "CAMS930009XXX", Telefono = "+528671234508", Email = "sofi@email.com", Procedencia = "Nuevo México, USA", FechaRegistro = DateTime.UtcNow.AddDays(-20), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Roberto Gómez", Apodo = "Beto", NombreCompleto = "Roberto Gómez Cruz", Rfc = "GOCR940110XXX", Telefono = "+528671234509", Procedencia = "Georgia, USA", Notas = "Pago en efectivo siempre", FechaRegistro = DateTime.UtcNow.AddDays(-15), Activo = true },
            new() { Id = Guid.NewGuid(), TenantId = tenantId, Nombre = "Patricia Navarro", Apodo = "Paty", NombreCompleto = "Patricia Navarro Silva", Rfc = "NASP950211XXX", Email = "paty@email.com", Procedencia = "Florida, USA", Direccion = "Av. Reforma 890", FechaRegistro = DateTime.UtcNow.AddDays(-10), Activo = true },
        };
        db.Clientes.AddRange(clientes);
        await db.SaveChangesAsync();

        // 12. Vehiculos
        static string GenVin(string wmi, int seed)
        {
            var chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
            var r = new Random(seed);
            var mid = new char[13];
            for (int i = 0; i < 13; i++) mid[i] = chars[r.Next(chars.Length)];
            return wmi + new string(mid);
        }

        var vehiculos = new List<Vehiculo>
        {
            new() { Vin = GenVin("1HG", 100), ClienteId = clientes[0].Id, MarcaId = marcas[11].Id, Anno = 2020, CilindradaCm3 = 1998, Categoria = "AUTOMOVIL", Color = "Rojo", ValorFactura = 18500m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-60), UbicacionActual = "Patio A-1", CumplioRequisitos = true, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-60) },
            new() { Vin = GenVin("2FM", 101), ClienteId = clientes[0].Id, MarcaId = marcas[8].Id, Anno = 2021, CilindradaCm3 = 3500, Categoria = "CAMIONETA", Color = "Blanco", ValorFactura = 32000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-45), UbicacionActual = "Patio B-3", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-45) },
            new() { Vin = GenVin("3VW", 102), ClienteId = clientes[0].Id, MarcaId = marcas[29].Id, Anno = 2022, CilindradaCm3 = 1984, Categoria = "AUTOMOVIL", Color = "Azul", ValorFactura = 22500m, Moneda = "USD", FechaRegistro = DateTime.UtcNow.AddDays(-10) },
            new() { Vin = GenVin("4T1", 103), ClienteId = clientes[1].Id, MarcaId = marcas[28].Id, Anno = 2023, CilindradaCm3 = 2500, Categoria = "SUV", Color = "Gris", ValorFactura = 35000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-30), UbicacionActual = "Patio C-1", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-30) },
            new() { Vin = GenVin("5J6", 104), ClienteId = clientes[1].Id, MarcaId = marcas[13].Id, Anno = 2022, CilindradaCm3 = 2000, Categoria = "AUTOMOVIL", Color = "Negro", ValorFactura = 28000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-20), UbicacionActual = "Patio A-2", CumplioRequisitos = false, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-20) },
            new() { Vin = GenVin("6MM", 105), ClienteId = clientes[1].Id, MarcaId = marcas[24].Id, Anno = 2019, CilindradaCm3 = 2400, Categoria = "SUV", Color = "Plateado", FechaIngresoPatio = DateTime.UtcNow.AddDays(-15), UbicacionActual = "Patio B-1", CumplioRequisitos = true, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-15) },
            new() { Vin = GenVin("7FA", 106), ClienteId = clientes[2].Id, MarcaId = marcas[8].Id, Anno = 2021, CilindradaCm3 = 5000, Categoria = "CAMION", Color = "Blanco", ValorFactura = 45000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-40), UbicacionActual = "Patio D-1", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-40) },
            new() { Vin = GenVin("8HT", 107), ClienteId = clientes[2].Id, MarcaId = marcas[14].Id, Anno = 2020, CilindradaCm3 = 13000, Categoria = "TRACTOR", Color = "Rojo", ValorFactura = 85000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-35), UbicacionActual = "Patio E-1", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-35) },
            new() { Vin = GenVin("9BW", 108), ClienteId = clientes[2].Id, MarcaId = marcas[29].Id, Anno = 2022, CilindradaCm3 = 2000, Categoria = "AUTOMOVIL", Color = "Azul", ValorFactura = 19500m, Moneda = "USD", FechaRegistro = DateTime.UtcNow.AddDays(-5) },
            new() { Vin = GenVin("1N4", 109), ClienteId = clientes[3].Id, MarcaId = marcas[25].Id, Anno = 2023, CilindradaCm3 = 1500, Categoria = "AUTOMOVIL", Color = "Rojo", ValorFactura = 22000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-25), UbicacionActual = "Patio A-3", CumplioRequisitos = true, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-25) },
            new() { Vin = GenVin("2T3", 110), ClienteId = clientes[3].Id, MarcaId = marcas[28].Id, Anno = 2022, CilindradaCm3 = 3500, Categoria = "SUV", Color = "Gris", ValorFactura = 31000m, Moneda = "USD", FechaRegistro = DateTime.UtcNow.AddDays(-8) },
            new() { Vin = GenVin("3FA", 111), ClienteId = clientes[3].Id, MarcaId = marcas[8].Id, Anno = 2021, CilindradaCm3 = 2300, Categoria = "AUTOMOVIL", Color = "Negro", ValorFactura = 18500m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-12), UbicacionActual = "Patio C-2", CumplioRequisitos = true, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-12) },
            new() { Vin = GenVin("4S3", 112), ClienteId = clientes[4].Id, MarcaId = marcas[27].Id, Anno = 2023, CilindradaCm3 = 2500, Categoria = "SUV", Color = "Verde", ValorFactura = 33000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-18), UbicacionActual = "Patio B-2", CumplioRequisitos = false, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-18) },
            new() { Vin = GenVin("5YJ", 113), ClienteId = clientes[4].Id, MarcaId = marcas[32].Id, Anno = 2023, CilindradaCm3 = 0, Categoria = "AUTOMOVIL", Color = "Blanco", ValorFactura = 45000m, Moneda = "USD", FechaRegistro = DateTime.UtcNow.AddDays(-3) },
            new() { Vin = GenVin("6G2", 114), ClienteId = clientes[4].Id, MarcaId = marcas[10].Id, Anno = 2020, CilindradaCm3 = 5300, Categoria = "CAMIONETA", Color = "Rojo", ValorFactura = 38000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-50), UbicacionActual = "Patio D-2", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-50) },
            new() { Vin = GenVin("7J4", 115), ClienteId = clientes[5].Id, MarcaId = marcas[0].Id, Anno = 2022, CilindradaCm3 = 3500, Categoria = "AUTOMOVIL", Color = "Plateado", ValorFactura = 42000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-22), UbicacionActual = "Patio A-4", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-22) },
            new() { Vin = GenVin("8AN", 116), ClienteId = clientes[5].Id, MarcaId = marcas[1].Id, Anno = 2023, CilindradaCm3 = 2000, Categoria = "AUTOMOVIL", Color = "Gris", ValorFactura = 38000m, Moneda = "USD", FechaRegistro = DateTime.UtcNow.AddDays(-7) },
            new() { Vin = GenVin("9C3", 117), ClienteId = clientes[5].Id, MarcaId = marcas[4].Id, Anno = 2021, CilindradaCm3 = 3600, Categoria = "SUV", Color = "Negro", ValorFactura = 35000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-28), UbicacionActual = "Patio C-3", CumplioRequisitos = true, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-28) },
            new() { Vin = GenVin("1XP", 118), ClienteId = clientes[6].Id, MarcaId = marcas[9].Id, Anno = 2019, CilindradaCm3 = 15000, Categoria = "TRACTOR", Color = "Blanco", ValorFactura = 95000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-55), UbicacionActual = "Patio E-2", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-55) },
            new() { Vin = GenVin("2NK", 119), ClienteId = clientes[6].Id, MarcaId = marcas[18].Id, Anno = 2020, CilindradaCm3 = 13000, Categoria = "TRACTOR", Color = "Rojo", ValorFactura = 88000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-42), UbicacionActual = "Patio E-3", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-42) },
            new() { Vin = GenVin("3D7", 120), ClienteId = clientes[6].Id, MarcaId = marcas[31].Id, Anno = 2022, CilindradaCm3 = 6700, Categoria = "CAMIONETA", Color = "Negro", ValorFactura = 52000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-15), UbicacionActual = "Patio B-4", CumplioRequisitos = false, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-15) },
            new() { Vin = GenVin("4JF", 121), ClienteId = clientes[7].Id, MarcaId = marcas[2].Id, Anno = 2023, CilindradaCm3 = 3000, Categoria = "AUTOMOVIL", Color = "Azul", ValorFactura = 55000m, Moneda = "USD", FechaRegistro = DateTime.UtcNow.AddDays(-6) },
            new() { Vin = GenVin("5KB", 122), ClienteId = clientes[7].Id, MarcaId = marcas[20].Id, Anno = 2022, CilindradaCm3 = 3500, Categoria = "SUV", Color = "Gris", ValorFactura = 48000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-10), UbicacionActual = "Patio C-4", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-10) },
            new() { Vin = GenVin("6LL", 123), ClienteId = clientes[7].Id, MarcaId = marcas[22].Id, Anno = 2021, CilindradaCm3 = 2500, Categoria = "AUTOMOVIL", Color = "Rojo", ValorFactura = 22000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-33), UbicacionActual = "Patio A-5", CumplioRequisitos = true, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-33) },
            new() { Vin = GenVin("7MM", 124), ClienteId = clientes[8].Id, MarcaId = marcas[15].Id, Anno = 2020, CilindradaCm3 = 5000, Categoria = "AUTOMOVIL", Color = "Verde", ValorFactura = 25000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-38), UbicacionActual = "Patio A-6", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-38) },
            new() { Vin = GenVin("8NN", 125), ClienteId = clientes[8].Id, MarcaId = marcas[7].Id, Anno = 2021, CilindradaCm3 = 6200, Categoria = "CAMIONETA", Color = "Blanco", ValorFactura = 34000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-20), UbicacionActual = "Patio D-3", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-20) },
            new() { Vin = GenVin("9PP", 126), ClienteId = clientes[8].Id, MarcaId = marcas[17].Id, Anno = 2023, CilindradaCm3 = 1000, Categoria = "MOTO", Color = "Negro", ValorFactura = 8500m, Moneda = "USD", FechaRegistro = DateTime.UtcNow.AddDays(-2) },
            new() { Vin = GenVin("1QQ", 127), ClienteId = clientes[9].Id, MarcaId = marcas[12].Id, Anno = 2023, CilindradaCm3 = 1600, Categoria = "AUTOMOVIL", Color = "Blanco", ValorFactura = 24000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-8), UbicacionActual = "Patio A-7", CumplioRequisitos = true, TieneSelloAduanal = false, FechaRegistro = DateTime.UtcNow.AddDays(-8) },
            new() { Vin = GenVin("2RR", 128), ClienteId = clientes[9].Id, MarcaId = marcas[16].Id, Anno = 2022, CilindradaCm3 = 3600, Categoria = "SUV", Color = "Gris", ValorFactura = 29000m, Moneda = "USD", FechaIngresoPatio = DateTime.UtcNow.AddDays(-14), UbicacionActual = "Patio C-5", CumplioRequisitos = true, TieneSelloAduanal = true, FechaRegistro = DateTime.UtcNow.AddDays(-14) },
            new() { Vin = GenVin("3SS", 129), ClienteId = clientes[9].Id, MarcaId = marcas[6].Id, Anno = 2021, CilindradaCm3 = 3200, Categoria = "AUTOMOVIL", Color = "Azul", ValorFactura = 18000m, Moneda = "USD", FechaRegistro = DateTime.UtcNow.AddDays(-4) },
        };

        foreach (var v in vehiculos)
        {
            v.Id = Guid.NewGuid();
            v.TenantId = tenantId;
            v.VinCorto = v.Vin.Length >= 6 ? v.Vin[^6..] : null;
        }
        db.Vehiculos.AddRange(vehiculos);
        await db.SaveChangesAsync();

        // 13. Tramitadores
        db.Tramitadores.AddRange(
            new Tramitador { Id = Guid.NewGuid(), Nombre = "MARIO", Activo = true, ComisionTipo = "NA" },
            new Tramitador { Id = Guid.NewGuid(), Nombre = "CONO", Activo = true, ComisionTipo = "NA" }
        );
        await db.SaveChangesAsync();

        // 14. Personal de campo
        db.PersonalCampo.AddRange(
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Hector Rodriguez", Rol = "AMBOS", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Simon Juarez", Rol = "CHOFER", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Omar Torres", Rol = "AMBOS", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Andres Cavazos", Rol = "ENTREGADOR", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Angel", Rol = "CHOFER", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Luis Ricardo Santos", Rol = "ENTREGADOR", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Uriel Álvarez", Rol = "ENTREGADOR", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "OBIDIO", Rol = "ENTREGADOR", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Jair", Rol = "ENTREGADOR", Activo = true },
            new PersonalCampo { Id = Guid.NewGuid(), Nombre = "Jose", Rol = "ENTREGADOR", Activo = true }
        );
        await db.SaveChangesAsync();

        // 15. Usuarios del sistema (contraseña por defecto: RR2026!)
        var defaultHash = BCrypt.Net.BCrypt.HashPassword("RR2026!");
        db.Usuarios.AddRange(
            // Administrador
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "ricardo.carreon", Email = "r.carreon@rrimportaciones.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("RR2026!"), Nombre = "Ricardo", Apellidos = "Rodríguez Carreon", RoleId = adminRole.Id, Activo = true },
            // Dueño / Patrón
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "ricardo.herrera", Email = "r.herrera@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Ricardo", Apellidos = "Rodríguez Herrera", RoleId = gerenteRole.Id, Activo = true },
            // Oficina — Facturación
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "carmen.velarde", Email = "c.velarde@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Carmen", Apellidos = "Velarde Chavira", RoleId = facturacionRole.Id, Activo = true },
            // Oficina — Coordinadora
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "laura.aranda", Email = "l.aranda@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Laura", Apellidos = "Aranda", RoleId = coordinadoraRole.Id, Activo = true },
            // Oficina — Control de trámites
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "javier.rdz", Email = "j.rdz@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Javier", Apellidos = "Rdz", RoleId = controlTramRole.Id, Activo = true },
            // Yarderos
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "luis.santos", Email = "l.santos@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Luis Ricardo", Apellidos = "Santos", RoleId = yarderoRole.Id, Activo = true },
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "uriel.alvarez", Email = "u.alvarez@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Uriel", Apellidos = "Álvarez", RoleId = yarderoRole.Id, Activo = true },
            // Choferes
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "hector.rodriguez", Email = "h.rodriguez@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Héctor", Apellidos = "Rodríguez", RoleId = choferRole.Id, Activo = true },
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "omar.torres", Email = "o.torres@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Omar", Apellidos = "Torres", RoleId = choferRole.Id, Activo = true },
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "simon.juarez", Email = "s.juarez@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Simón", Apellidos = "Juárez", RoleId = choferRole.Id, Activo = true },
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "angel", PasswordHash = defaultHash, Nombre = "Angel", RoleId = choferRole.Id, Activo = true },
            new User { Id = Guid.NewGuid(), TenantId = tenantId, Username = "andres.cavazos", Email = "a.cavazos@rrimportaciones.com", PasswordHash = defaultHash, Nombre = "Andrés", Apellidos = "Cavazos", RoleId = choferRole.Id, Activo = true }
        );
        await db.SaveChangesAsync();

        // 16. Partners externos
        db.PartnersExternos.AddRange(
            new PartnerExterno { Id = Guid.NewGuid(), Nombre = "Don Beto", Aliases = ["BETO", "DON BETO", "beto"], Tipo = "PENSION" },
            new PartnerExterno { Id = Guid.NewGuid(), Nombre = "Aurora", Aliases = ["la güera", "la wuera", "Laura", "AURORA"], Tipo = "RECEPCION_DOCS" }
        );
        await db.SaveChangesAsync();

        // 17. HonorariosConfig — tarifas base Excel TABULADOR 2026
        // POST_2017: $18,000 base + $350 adicional administrativo
        db.HonorariosConfig.AddRange(
            new HonorarioConfig { Id = Guid.NewGuid(), TipoMercancia = "VEHICULO", Regimen = "POST_2017", Monto = 18000m, Activo = true },
            new HonorarioConfig { Id = Guid.NewGuid(), TipoMercancia = "VEHICULO", Regimen = "PRE_2016",  Monto = 22000m, Activo = true },
            new HonorarioConfig { Id = Guid.NewGuid(), TipoMercancia = "VEHICULO", Regimen = "AMPARO",    Monto = 0m,     Activo = true }
        );

        // 18. TabuladoresAmparo — precios desde TABULADOR 2026.xlsx hoja AMPARO
        // Categorías coinciden con DetermineCategoriaAmparo():
        //   4_CIL  ← ≤4 cilindros
        //   6_CIL  ← 6 cilindros
        //   8_CIL  ← ≥8 cilindros
        //   PICKUP ← cuando la clasificación base es PICKUP
        //   LUJO   ← solo cuando el admin lo selecciona explícitamente
        db.TabuladoresAmparo.AddRange(
            // 2019
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2019, Categoria = "4_CIL", PrecioMxn = 70700m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2019, Categoria = "6_CIL", PrecioMxn = 75000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2019, Categoria = "8_CIL", PrecioMxn = 76000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2019, Categoria = "PICKUP", PrecioMxn = 78000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2019, Categoria = "LUJO",  PrecioMxn = 79000m, Notas = "Confirmar con dirección" },
            // 2020
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2020, Categoria = "4_CIL", PrecioMxn = 71800m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2020, Categoria = "6_CIL", PrecioMxn = 76000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2020, Categoria = "8_CIL", PrecioMxn = 77000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2020, Categoria = "PICKUP", PrecioMxn = 80000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2020, Categoria = "LUJO",  PrecioMxn = 81000m, Notas = "Confirmar con dirección" },
            // 2021
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2021, Categoria = "4_CIL", PrecioMxn = 72000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2021, Categoria = "6_CIL", PrecioMxn = 77000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2021, Categoria = "8_CIL", PrecioMxn = 79000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2021, Categoria = "PICKUP", PrecioMxn = 82000m },
            new TabuladorAmparo { Id = Guid.NewGuid(), AnnoModelo = 2021, Categoria = "LUJO",  PrecioMxn = 83000m, Notas = "Confirmar con dirección" }
        );
        await db.SaveChangesAsync();
    }

    private static async Task EnsureSystemPermissionsAsync(AppDbContext db)
    {
        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var existingCodes = await db.Permisos.Select(p => p.Codigo).ToListAsync();

            var faltantes = new List<(string Codigo, string Nombre, string Modulo)>
            {
                ("CAMPO_USAR", "Acceso al módulo campo (fotos y tareas en yarda)", "CAMPO"),
            }.Where(x => !existingCodes.Contains(x.Codigo)).ToList();

            if (!faltantes.Any())
            {
                await tx.CommitAsync();
                return;
            }

            var nuevos = faltantes.Select(x => new Permission
            {
                Id = Guid.NewGuid(),
                Codigo = x.Codigo,
                Nombre = x.Nombre,
                Modulo = x.Modulo,
            }).ToList();

            db.Permisos.AddRange(nuevos);
            await db.SaveChangesAsync();

            // Auto-asignar CAMPO_USAR a los roles que deben tenerlo
            var campoPermiso = nuevos.FirstOrDefault(p => p.Codigo == "CAMPO_USAR");
            if (campoPermiso != null)
            {
                var rolesTarget = new[] { "CAMPO", "GERENTE" };
                var roleIds = await db.Roles
                    .Where(r => rolesTarget.Contains(r.Nombre))
                    .Select(r => r.Id)
                    .ToListAsync();

                var yaAsignados = await db.RolesPermisos
                    .Where(rp => rp.PermissionId == campoPermiso.Id)
                    .Select(rp => rp.RoleId)
                    .ToListAsync();

                var asignaciones = roleIds
                    .Where(id => !yaAsignados.Contains(id))
                    .Select(id => new RolePermission { RoleId = id, PermissionId = campoPermiso.Id })
                    .ToList();

                if (asignaciones.Any())
                {
                    db.RolesPermisos.AddRange(asignaciones);
                    await db.SaveChangesAsync();
                }
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    /// <summary>
    /// Migración idempotente de los roles legacy CAPTURISTA y CAMPO a la nueva taxonomía:
    /// FACTURACION / COORDINADORA / CONTROL_TRAMITES (oficina) + YARDERO / CHOFER (campo).
    ///
    /// Se ejecuta en cada arranque pero solo actúa si encuentra roles antiguos pendientes.
    /// </summary>
    private static async Task MigrateLegacyRolesAsync(AppDbContext db)
    {
        // Mapeo username → nombre del nuevo rol. Cualquier usuario no listado cae al fallback
        // del bloque más abajo (CAPTURISTA → FACTURACION, CAMPO → YARDERO).
        var mapeoPorUsername = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["carmen.velarde"]    = "FACTURACION",
            ["laura.aranda"]      = "COORDINADORA",
            ["javier.rdz"]        = "CONTROL_TRAMITES",
            ["luis.santos"]       = "YARDERO",
            ["uriel.alvarez"]     = "YARDERO",
            ["hector.rodriguez"]  = "CHOFER",
            ["omar.torres"]       = "CHOFER",
            ["simon.juarez"]      = "CHOFER",
            ["angel"]             = "CHOFER",
            ["andres.cavazos"]    = "CHOFER",
        };

        using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            // 1. Asegurar que los roles nuevos existan
            var nuevosRoles = new (string Nombre, string Descripcion, string[] Permisos)[]
            {
                ("FACTURACION",      "Oficina · Facturación y cobros a clientes",
                    new[] { "COTIZACIONES_VER", "COTIZACIONES_CREAR", "COTIZACIONES_EDITAR", "PAGOS_VER", "PAGOS_REGISTRAR", "CLIENTES_VER", "CLIENTES_CREAR", "EVENTOS_CREAR" }),
                ("COORDINADORA",     "Oficina · Coordinación de operaciones y agenda",
                    new[] { "COTIZACIONES_VER", "COTIZACIONES_CREAR", "COTIZACIONES_EDITAR", "PAGOS_VER", "PAGOS_REGISTRAR", "CLIENTES_VER", "CLIENTES_CREAR", "EVENTOS_CREAR" }),
                ("CONTROL_TRAMITES", "Oficina · Seguimiento y control de trámites aduanales",
                    new[] { "COTIZACIONES_VER", "COTIZACIONES_CREAR", "COTIZACIONES_EDITAR", "PAGOS_VER", "PAGOS_REGISTRAR", "CLIENTES_VER", "CLIENTES_CREAR", "EVENTOS_CREAR" }),
                ("YARDERO",          "Campo · Fotos, inventario y maniobras en yarda",
                    new[] { "EVENTOS_CREAR", "TRAMITES_VER", "CAMPO_USAR" }),
                ("CHOFER",           "Campo · Traslado y entrega de unidades",
                    new[] { "EVENTOS_CREAR", "TRAMITES_VER", "CAMPO_USAR" }),
                // Dueño: acceso total al negocio + experiencia Asistente Personal
                ("DUEÑO",            "Propietario · Acceso total con vista de Asistente Personal",
                    Array.Empty<string>()),
            };

            var nombresNuevos = nuevosRoles.Select(n => n.Nombre).ToList();
            var existentes = await db.Roles
                .Where(r => nombresNuevos.Contains(r.Nombre))
                .ToListAsync();
            var permisosAll = await db.Permisos.ToListAsync();

            foreach (var (nombre, descripcion, codigosPermisos) in nuevosRoles)
            {
                var rol = existentes.FirstOrDefault(r => r.Nombre == nombre);
                if (rol == null)
                {
                    rol = new Role { Id = Guid.NewGuid(), Nombre = nombre, Descripcion = descripcion, EsSistema = true };
                    db.Roles.Add(rol);
                    await db.SaveChangesAsync();

                    foreach (var permisoCodigo in codigosPermisos)
                    {
                        var permiso = permisosAll.FirstOrDefault(p => p.Codigo == permisoCodigo);
                        if (permiso != null)
                            db.RolesPermisos.Add(new RolePermission { RoleId = rol.Id, PermissionId = permiso.Id });
                    }
                    await db.SaveChangesAsync();
                }
            }

            // 2a. Reasignar usuarios sembrados por username (idempotente — si ya está en el rol correcto, no cambia nada).
            //     Esto cubre casos donde Laura/Javier ya migraron a OPERADOR previamente y necesitan ir a su rol específico.
            var rolesPorNombre = await db.Roles.ToDictionaryAsync(r => r.Nombre, r => r);
            var usernamesMapeo = mapeoPorUsername.Keys.ToList();
            var usuariosSembrados = await db.Usuarios
                .IgnoreQueryFilters()
                .Where(u => usernamesMapeo.Contains(u.Username))
                .ToListAsync();

            foreach (var user in usuariosSembrados)
            {
                if (mapeoPorUsername.TryGetValue(user.Username, out var nuevoNombre)
                    && rolesPorNombre.TryGetValue(nuevoNombre, out var nuevoRol)
                    && user.RoleId != nuevoRol.Id)
                {
                    user.RoleId = nuevoRol.Id;
                }
            }
            await db.SaveChangesAsync();

            // 2b. Migrar usuarios restantes que aún apunten a los roles antiguos a los nuevos
            var rolCapturista = rolesPorNombre.GetValueOrDefault("CAPTURISTA");
            var rolCampo      = rolesPorNombre.GetValueOrDefault("CAMPO");

            if (rolCapturista != null || rolCampo != null)
            {
                var idsLegacy = new List<Guid>();
                if (rolCapturista != null) idsLegacy.Add(rolCapturista.Id);
                if (rolCampo != null) idsLegacy.Add(rolCampo.Id);

                var usuariosLegacy = await db.Usuarios
                    .IgnoreQueryFilters()
                    .Where(u => idsLegacy.Contains(u.RoleId))
                    .ToListAsync();

                foreach (var user in usuariosLegacy)
                {
                    // Mapeo específico por username, si existe
                    string? nuevoNombreRol = null;
                    if (mapeoPorUsername.TryGetValue(user.Username, out var mapeado))
                        nuevoNombreRol = mapeado;
                    else if (rolCapturista != null && user.RoleId == rolCapturista.Id)
                        nuevoNombreRol = "FACTURACION";
                    else if (rolCampo != null && user.RoleId == rolCampo.Id)
                        nuevoNombreRol = "YARDERO";

                    if (nuevoNombreRol != null && rolesPorNombre.TryGetValue(nuevoNombreRol, out var nuevoRol))
                        user.RoleId = nuevoRol.Id;
                }
                await db.SaveChangesAsync();

                // 3. Borrar relaciones rol-permiso y eliminar los roles legacy
                foreach (var legacyId in idsLegacy)
                {
                    var rps = await db.RolesPermisos.Where(rp => rp.RoleId == legacyId).ToListAsync();
                    db.RolesPermisos.RemoveRange(rps);
                }
                await db.SaveChangesAsync();

                if (rolCapturista != null) db.Roles.Remove(rolCapturista);
                if (rolCampo != null) db.Roles.Remove(rolCampo);
                await db.SaveChangesAsync();
            }

            // 4. Eliminar OPERADOR si existe — rol retirado definitivamente de la taxonomía
            var rolOperador = rolesPorNombre.GetValueOrDefault("OPERADOR");
            if (rolOperador != null)
            {
                var rolGerente = rolesPorNombre.GetValueOrDefault("GERENTE");
                if (rolGerente != null)
                {
                    var usuariosOperador = await db.Usuarios
                        .IgnoreQueryFilters()
                        .Where(u => u.RoleId == rolOperador.Id)
                        .ToListAsync();
                    foreach (var user in usuariosOperador)
                        user.RoleId = rolGerente.Id;
                    await db.SaveChangesAsync();
                }
                var rpsOperador = await db.RolesPermisos.Where(rp => rp.RoleId == rolOperador.Id).ToListAsync();
                db.RolesPermisos.RemoveRange(rpsOperador);
                await db.SaveChangesAsync();
                db.Roles.Remove(rolOperador);
                await db.SaveChangesAsync();
            }

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private static async Task ClearAllDataAsync(AppDbContext db)
    {
        foreach (var table in TableDeleteOrder)
#pragma warning disable EF1002, EF1003
            await db.Database.ExecuteSqlRawAsync("DELETE FROM \"" + table + "\"");
#pragma warning restore EF1002, EF1003
    }
}
