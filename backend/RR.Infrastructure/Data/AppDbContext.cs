using Microsoft.EntityFrameworkCore;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Domain.Interfaces;

namespace RR.Infrastructure.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public Guid CurrentTenantId => _tenantContext.HasTenant ? _tenantContext.TenantId : Guid.Empty;

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permisos => Set<Permission>();
    public DbSet<RolePermission> RolesPermisos => Set<RolePermission>();
    public DbSet<User> Usuarios => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Vehiculo> Vehiculos => Set<Vehiculo>();
    public DbSet<Tramite> Tramites => Set<Tramite>();
    public DbSet<Pedimento> Pedimentos => Set<Pedimento>();
    public DbSet<Cotizacion> Cotizaciones => Set<Cotizacion>();
    public DbSet<CotizacionDetalle> CotizacionesDetalles => Set<CotizacionDetalle>();
    public DbSet<Pago> Pagos => Set<Pago>();
    public DbSet<GastoHormiga> GastosHormiga => Set<GastoHormiga>();
    public DbSet<Evento> Eventos => Set<Evento>();
    public DbSet<TramiteDocumento> TramitesDocumentos => Set<TramiteDocumento>();
    public DbSet<TareaCampo> TareasCampo => Set<TareaCampo>();
    public DbSet<Aduana> Aduanas => Set<Aduana>();
    public DbSet<PatenteAduana> PatentesAduana => Set<PatenteAduana>();
    public DbSet<FraccionArancelaria> FraccionesArancelarias => Set<FraccionArancelaria>();
    public DbSet<Marca> Marcas => Set<Marca>();
    public DbSet<Modelo> Modelos => Set<Modelo>();
    public DbSet<Tramitador> Tramitadores => Set<Tramitador>();
    public DbSet<PrecioEstimado> PreciosEstimados => Set<PrecioEstimado>();
    public DbSet<PrecioPorAntiguedad> PreciosPorAntiguedad => Set<PrecioPorAntiguedad>();
    public DbSet<TabuladorAmparo> TabuladoresAmparo => Set<TabuladorAmparo>();
    public DbSet<HonorarioConfig> HonorariosConfig => Set<HonorarioConfig>();
    public DbSet<NhtsaCache> NhtsaCache => Set<NhtsaCache>();
    public DbSet<TipoCambioCache> TiposCambioCache => Set<TipoCambioCache>();
    public DbSet<TipoGastoHormiga> TiposGastoHormiga => Set<TipoGastoHormiga>();
    public DbSet<ParametroFiscal> ParametrosFiscales => Set<ParametroFiscal>();
    public DbSet<PlantillaMensaje> PlantillasMensaje => Set<PlantillaMensaje>();
    public DbSet<AuditoriaLog> AuditoriaLogs => Set<AuditoriaLog>();
    public DbSet<Entrega> Entregas => Set<Entrega>();
    public DbSet<PersonalCampo> PersonalCampo => Set<PersonalCampo>();
    public DbSet<PartnerExterno> PartnersExternos => Set<PartnerExterno>();
    public DbSet<Banco> Bancos => Set<Banco>();
    public DbSet<LoteImportacion> LotesImportacion => Set<LoteImportacion>();
    public DbSet<ConversacionNexus> ConversacionesNexus => Set<ConversacionNexus>();
    public DbSet<MensajeNexus> MensajesNexus => Set<MensajeNexus>();
    public DbSet<TareaEntrega> TareasEntrega => Set<TareaEntrega>();
    public DbSet<WhatsAppMessage> WhatsAppMessages => Set<WhatsAppMessage>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("pgcrypto");
        modelBuilder.HasPostgresExtension("pg_trgm");

        modelBuilder.Entity<Tenant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.NombreComercial).HasMaxLength(200).IsRequired();
            e.Property(x => x.RazonSocial).HasMaxLength(300).IsRequired();
            e.Property(x => x.Rfc).HasMaxLength(13);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Telefono).HasMaxLength(50);
            e.Property(x => x.LogoUrl).HasMaxLength(500);
            e.Property(x => x.Configuracion).HasColumnType("jsonb");
        });

        modelBuilder.Entity<Role>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(50).IsRequired();
            e.Property(x => x.Descripcion).HasMaxLength(200);
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Permission>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Codigo).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Codigo).IsUnique();
            e.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
            e.Property(x => x.Modulo).HasMaxLength(50).IsRequired();
            e.Property(x => x.Descripcion).HasMaxLength(300);
        });

        modelBuilder.Entity<RolePermission>(e =>
        {
            e.HasKey(x => new { x.RoleId, x.PermissionId });
            e.HasOne(x => x.Role).WithMany(r => r.RolePermissions).HasForeignKey(x => x.RoleId);
            e.HasOne(x => x.Permission).WithMany(p => p.RolePermissions).HasForeignKey(x => x.PermissionId);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Username).HasMaxLength(100).IsRequired();
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.PasswordHash).HasMaxLength(300).IsRequired();
            e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
            e.Property(x => x.Apellidos).HasMaxLength(100);
            e.HasIndex(x => new { x.TenantId, x.Username }).IsUnique();
            e.HasOne(x => x.Tenant).WithMany(t => t.Usuarios).HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Role).WithMany(r => r.Usuarios).HasForeignKey(x => x.RoleId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.TokenHash).HasMaxLength(300).IsRequired();
            e.HasOne(x => x.User).WithMany(u => u.RefreshTokens).HasForeignKey(x => x.UserId);
        });

        modelBuilder.Entity<Cliente>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
            e.Property(x => x.Apodo).HasMaxLength(100).IsRequired();
            e.HasIndex(x => new { x.TenantId, x.Apodo }).IsUnique();
            e.Property(x => x.NombreCompleto).HasMaxLength(300);
            e.Property(x => x.Rfc).HasMaxLength(13);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.Telefono).HasMaxLength(50);
            e.Property(x => x.Procedencia).HasMaxLength(100);
            e.Property(x => x.Notas).HasColumnType("text");
            e.Property(x => x.TipoPersona).HasMaxLength(20).HasDefaultValue("FISICA");
            e.HasOne(x => x.Tenant).WithMany(t => t.Clientes).HasForeignKey(x => x.TenantId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId && e.DeletedAt == null);
        });

        modelBuilder.Entity<Vehiculo>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Vin).HasMaxLength(17).IsRequired();
            e.HasIndex(x => new { x.TenantId, x.Vin }).IsUnique();
            e.Property(x => x.VinCorto).HasMaxLength(6);
            e.Property(x => x.Estado).HasMaxLength(50).HasDefaultValue("PENDIENTE_DE_TRAMITE");
            e.Property(x => x.FotosUrls).HasColumnType("text[]");
            e.Property(x => x.Categoria).HasMaxLength(50);
            e.Property(x => x.CilindradaCm3);
            e.Property(x => x.Color).HasMaxLength(50);
            e.Property(x => x.Moneda).HasMaxLength(3).HasDefaultValue("USD");
            e.Property(x => x.NumMotor).HasMaxLength(100);
            e.Property(x => x.NumSerie).HasMaxLength(100);
            e.Property(x => x.UbicacionActual).HasMaxLength(200);
            e.Property(x => x.FechaPedimentoProforma);
            e.Property(x => x.FechaIngresoPatio);
            e.HasOne(x => x.Tenant).WithMany(t => t.Vehiculos).HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Cliente).WithMany(c => c.Vehiculos).HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Marca).WithMany().HasForeignKey(x => x.MarcaId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Modelo).WithMany().HasForeignKey(x => x.ModeloId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.FraccionArancelaria).WithMany().HasForeignKey(x => x.FraccionArancelariaId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId && e.DeletedAt == null);
        });

        modelBuilder.Entity<LoteImportacion>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.FolioLote).HasMaxLength(50).IsRequired();
            e.Property(x => x.TipoTramite).HasMaxLength(30).HasDefaultValue("NORMAL");
            e.Property(x => x.Estado).HasMaxLength(30).HasDefaultValue("EN_PROGRESO");
            e.Property(x => x.Notas).HasColumnType("text");
            e.HasIndex(x => new { x.TenantId, x.FolioLote }).IsUnique();
            e.HasIndex(x => new { x.TenantId, x.ClienteId });
            e.HasIndex(x => new { x.TenantId, x.Estado });
            e.HasOne(x => x.Tenant).WithMany(t => t.LotesImportacion).HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Cliente).WithMany().HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Aduana).WithMany().HasForeignKey(x => x.AduanaId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Tramitador).WithMany().HasForeignKey(x => x.TramitadorId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId && e.DeletedAt == null);
        });

        modelBuilder.Entity<Tramite>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.NumeroConsecutivo).HasMaxLength(50).IsRequired();
            e.Property(x => x.NumeroLegacy).HasMaxLength(50);
            e.Property(x => x.EstadoLogistico).HasMaxLength(30).HasDefaultValue("PENDIENTE_TRAMITE");
            e.Property(x => x.TipoTramite).HasMaxLength(30).HasDefaultValue("NORMAL");
            e.Property(x => x.DescripcionMercancia).HasMaxLength(500);
            e.Property(x => x.CobroTotal).HasColumnType("decimal(18,2)");
            e.Property(x => x.Honorarios).HasColumnType("decimal(18,2)");
            e.Property(x => x.CargoExpress).HasColumnType("decimal(18,2)");
            e.Property(x => x.Notas).HasColumnType("text");
            e.Property(x => x.AsignadoA).HasMaxLength(200);
            e.Property(x => x.CotizacionOrigenId);
            e.HasIndex(x => new { x.TenantId, x.NumeroConsecutivo }).IsUnique();
            e.HasIndex(x => new { x.TenantId, x.NumeroLegacy }).IsUnique().HasFilter("\"NumeroLegacy\" IS NOT NULL");
            e.HasIndex(x => new { x.TenantId, x.LoteId });
            e.HasOne(x => x.Tenant).WithMany(t => t.Tramites).HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Lote).WithMany(l => l.Tramites).HasForeignKey(x => x.LoteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Cliente).WithMany(c => c.Tramites).HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Vehiculo).WithMany(v => v.Tramites).HasForeignKey(x => x.VehiculoId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Aduana).WithMany().HasForeignKey(x => x.AduanaId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Tramitador).WithMany().HasForeignKey(x => x.TramitadorId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.CotizacionOrigen).WithMany().HasForeignKey(x => x.CotizacionOrigenId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<Pedimento>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.NumeroPedimento).HasMaxLength(50).IsRequired();
            e.Property(x => x.Tipo).HasMaxLength(20).HasDefaultValue("ORIGINAL");
            e.Property(x => x.Patente).HasMaxLength(10);
            e.Property(x => x.EstadoLogistico).HasMaxLength(30);
            e.Property(x => x.MotivoRectificacion).HasMaxLength(500);
            e.Property(x => x.ResponsableError).HasMaxLength(200);
            e.Property(x => x.CobroAdicional).HasColumnType("decimal(18,2)");
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany(t => t.Pedimentos).HasForeignKey(x => x.TramiteId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<Cotizacion>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Folio).HasMaxLength(50);
            e.Property(x => x.Vin).HasMaxLength(17);
            e.Property(x => x.MarcaTexto).HasMaxLength(120);
            e.Property(x => x.Modelo).HasMaxLength(150);
            e.Property(x => x.Categoria).HasMaxLength(50);
            e.Property(x => x.Fraccion).HasMaxLength(20);
            e.Property(x => x.RegimenFiscal).HasMaxLength(20);
            e.Property(x => x.FuentePrecio).HasMaxLength(30);
            e.Property(x => x.PrecioCatalogoMarca).HasMaxLength(120);
            e.Property(x => x.PrecioCatalogoModelo).HasMaxLength(250);
            e.Property(x => x.PrecioCatalogoOrigen).HasMaxLength(80);
            e.Property(x => x.PrecioMatchTipo).HasMaxLength(30);
            e.Property(x => x.PrecioAdvertencia).HasMaxLength(500);
            e.Property(x => x.EnviadoPor).HasMaxLength(30);
            e.Property(x => x.EnviadoA).HasMaxLength(200);
            e.Property(x => x.MotivoRechazo).HasMaxLength(500);
            e.Property(x => x.EstadoLogistico).HasMaxLength(30).HasDefaultValue("BORRADOR");
            e.Property(x => x.Notas).HasColumnType("text");
            e.HasOne(x => x.Tenant).WithMany(t => t.Cotizaciones).HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany(t => t.Cotizaciones).HasForeignKey(x => x.TramiteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Cliente).WithMany(c => c.Cotizaciones).HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Marca).WithMany().HasForeignKey(x => x.MarcaId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<CotizacionDetalle>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Concepto).HasMaxLength(300).IsRequired();
            e.Property(x => x.Tipo).HasMaxLength(50).IsRequired();
            e.Property(x => x.Notas).HasMaxLength(500);
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Cotizacion).WithMany(c => c.Detalles).HasForeignKey(x => x.CotizacionId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<Pago>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Monto).HasColumnType("decimal(18,2)");
            e.Property(x => x.Moneda).HasMaxLength(3).HasDefaultValue("MXN");
            e.Property(x => x.TipoCambio).HasColumnType("decimal(18,6)");
            e.Property(x => x.TipoMovimiento).HasMaxLength(40).HasDefaultValue("PAGO_CLIENTE");
            e.Property(x => x.PagadoPor).HasMaxLength(20).HasDefaultValue("CLIENTE");
            e.Property(x => x.SeCobraAlCliente).HasDefaultValue(false);
            e.Property(x => x.Metodo).HasMaxLength(30).HasDefaultValue("TRANSFERENCIA");
            e.Property(x => x.Banco).HasMaxLength(100);
            e.Property(x => x.Referencia).HasMaxLength(100);
            e.Property(x => x.ComprobanteUrl).HasMaxLength(500);
            e.Property(x => x.FolioRecibo).HasMaxLength(40);
            e.Property(x => x.ReciboPagoUrl).HasMaxLength(500);
            e.Property(x => x.Notas).HasMaxLength(500);
            e.HasOne(x => x.Tenant).WithMany(t => t.Pagos).HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany(t => t.Pagos).HasForeignKey(x => x.TramiteId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId && e.DeletedAt == null);
        });

        modelBuilder.Entity<GastoHormiga>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Concepto).HasMaxLength(300).IsRequired();
            e.Property(x => x.Monto).HasColumnType("decimal(18,2)");
            e.Property(x => x.Moneda).HasMaxLength(3).HasDefaultValue("MXN");
            e.Property(x => x.GastoUsd).HasColumnType("decimal(18,6)");
            e.Property(x => x.ComprobanteUrl).HasMaxLength(500);
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany(t => t.GastosHormiga).HasForeignKey(x => x.TramiteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Cliente).WithMany().HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Vehiculo).WithMany().HasForeignKey(x => x.VehiculoId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.TipoGasto).WithMany(t => t.Gastos).HasForeignKey(x => x.TipoGastoId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId && e.DeletedAt == null);
        });

        modelBuilder.Entity<Evento>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Tipo).HasMaxLength(30).HasDefaultValue("NOTA");
            e.Property(x => x.Contenido).HasColumnType("text").IsRequired();
            e.Property(x => x.FotoUrl).HasMaxLength(500);
            e.Property(x => x.EstadoAnterior).HasMaxLength(30);
            e.Property(x => x.EstadoNuevo).HasMaxLength(30);
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany(t => t.Eventos).HasForeignKey(x => x.TramiteId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<TramiteDocumento>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.TipoDocumento).HasMaxLength(60).IsRequired();
            e.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
            e.Property(x => x.EstadoLogistico).HasMaxLength(30).HasDefaultValue("PENDIENTE");
            e.Property(x => x.ArchivoUrl).HasMaxLength(500);
            e.Property(x => x.Notas).HasMaxLength(500);
            e.HasIndex(x => new { x.TramiteId, x.TipoDocumento });
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany(t => t.Documentos).HasForeignKey(x => x.TramiteId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<TareaCampo>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Tipo).HasMaxLength(40).HasDefaultValue("FOTOS_YARDA");
            e.Property(x => x.EstadoLogistico).HasMaxLength(30).HasDefaultValue("ABIERTA");
            e.Property(x => x.Ubicacion).HasMaxLength(250);
            e.Property(x => x.VinConfirmado).HasMaxLength(17);
            e.Property(x => x.FotosUrls).HasColumnType("text[]");
            e.Property(x => x.Incidencia).HasMaxLength(700);
            e.Property(x => x.DescripcionVehiculo).HasMaxLength(300);
            e.Property(x => x.ClienteNombreLibre).HasMaxLength(200);
            e.HasIndex(x => new { x.TramiteId, x.EstadoLogistico });
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany(t => t.TareasCampo).HasForeignKey(x => x.TramiteId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.Vehiculo).WithMany().HasForeignKey(x => x.VehiculoId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.PersonalCampo).WithMany().HasForeignKey(x => x.PersonalCampoId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.UsuarioCampo).WithMany().HasForeignKey(x => x.TomadaPorUsuarioId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<TareaEntrega>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Estado).HasMaxLength(30).HasDefaultValue("PENDIENTE");
            e.Property(x => x.FotosUrls).HasColumnType("text[]");
            e.Property(x => x.UbicacionEntrega).HasMaxLength(300);
            e.Property(x => x.NombreRecibe).HasMaxLength(200);
            e.Property(x => x.FirmaBase64).HasColumnType("text");
            e.Property(x => x.Incidencia).HasMaxLength(700);
            e.Property(x => x.NotasChofer).HasMaxLength(500);
            e.HasIndex(x => new { x.TramiteId, x.Estado });
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany().HasForeignKey(x => x.TramiteId);
            e.HasOne(x => x.Chofer).WithMany().HasForeignKey(x => x.ChoferUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<Entrega>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Descripcion).HasMaxLength(500);
            e.Property(x => x.UbicacionEntrega).HasMaxLength(300);
            e.Property(x => x.DocumentosEntregados).HasColumnType("text[]");
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Tramite).WithMany(t => t.Entregas).HasForeignKey(x => x.TramiteId);
            e.HasOne(x => x.ResponsableCampo).WithMany().HasForeignKey(x => x.ResponsableCampoId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.RecibidoPorPartner).WithMany().HasForeignKey(x => x.RecibidoPorPartnerId).OnDelete(DeleteBehavior.SetNull);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<PersonalCampo>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
            e.Property(x => x.Rol).HasMaxLength(30).HasDefaultValue("ENTREGADOR");
            e.Property(x => x.Telefono).HasMaxLength(50);
        });

        modelBuilder.Entity<PartnerExterno>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
            e.Property(x => x.Aliases).HasColumnType("text[]");
            e.Property(x => x.Tipo).HasMaxLength(30).HasDefaultValue("OTRO");
            e.Property(x => x.Notas).HasMaxLength(500);
        });

        modelBuilder.Entity<PushSubscription>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Endpoint).HasMaxLength(2048).IsRequired();
            e.Property(x => x.P256dh).HasMaxLength(512).IsRequired();
            e.Property(x => x.Auth).HasMaxLength(512).IsRequired();
            e.Property(x => x.Role).HasMaxLength(20).HasDefaultValue("admin");
            e.Property(x => x.UserAgent).HasMaxLength(500);
            e.HasIndex(x => x.Endpoint).IsUnique();
            e.HasIndex(x => new { x.TenantId, x.Role });
            e.HasIndex(x => new { x.TenantId, x.UserId });
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<WhatsAppMessage>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.To).HasMaxLength(40).IsRequired();
            e.Property(x => x.Template).HasMaxLength(60).IsRequired();
            e.Property(x => x.Body).HasMaxLength(2000).IsRequired();
            e.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("PENDING");
            e.Property(x => x.ExternalId).HasMaxLength(100);
            e.Property(x => x.Error).HasMaxLength(1000);
            e.HasIndex(x => new { x.TenantId, x.Status });
            e.HasIndex(x => x.CreatedAt);
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<Banco>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Identificador).HasMaxLength(40).IsRequired();
            e.Property(x => x.Nombre).HasMaxLength(120).IsRequired();
            e.Property(x => x.Titular).HasMaxLength(200);
            e.Property(x => x.Cuenta).HasMaxLength(50);
            e.Property(x => x.Clabe).HasMaxLength(30);
            e.Property(x => x.Moneda).HasMaxLength(3);
            e.Property(x => x.Notas).HasMaxLength(500);
            e.HasIndex(x => new { x.TenantId, x.Identificador }).IsUnique();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<Aduana>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.ClaveAduana).HasMaxLength(10).IsRequired();
            e.HasIndex(x => x.ClaveAduana).IsUnique();
            e.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
            e.Property(x => x.Ciudad).HasMaxLength(100);
            e.Property(x => x.Estado).HasMaxLength(100);
        });

        modelBuilder.Entity<PatenteAduana>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Patente).HasMaxLength(10).IsRequired();
            e.Property(x => x.Descripcion).HasMaxLength(200);
            e.HasOne(x => x.Aduana).WithMany(a => a.Patentes).HasForeignKey(x => x.AduanaId);
            e.HasIndex(x => new { x.AduanaId, x.Patente }).IsUnique();
        });

        modelBuilder.Entity<FraccionArancelaria>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Fraccion).HasMaxLength(20).IsRequired();
            e.HasIndex(x => x.Fraccion).IsUnique();
            e.Property(x => x.Descripcion).HasMaxLength(500).IsRequired();
            e.Property(x => x.TipoVehiculo).HasMaxLength(50);
        });

        modelBuilder.Entity<Marca>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
            e.HasIndex(x => x.Nombre).IsUnique();
            e.Property(x => x.Aliases).HasColumnType("text[]");
        });

        modelBuilder.Entity<Modelo>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
            e.HasOne(x => x.Marca).WithMany(m => m.Modelos).HasForeignKey(x => x.MarcaId);
            e.HasIndex(x => new { x.MarcaId, x.Nombre }).IsUnique();
        });

        modelBuilder.Entity<Tramitador>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).HasMaxLength(200).IsRequired();
            e.Property(x => x.Telefono).HasMaxLength(50);
            e.Property(x => x.Email).HasMaxLength(200);
            e.Property(x => x.ComisionTipo).HasMaxLength(20).HasDefaultValue("NA");
            e.Property(x => x.ComisionValor).HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<PrecioEstimado>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Categoria).HasMaxLength(50).IsRequired();
            e.Property(x => x.Inciso).HasMaxLength(5);
            e.Property(x => x.MarcaTexto).HasMaxLength(120);
            e.Property(x => x.Modelo).HasMaxLength(250);
            e.Property(x => x.HojaOrigen).HasMaxLength(80);
            e.HasOne(x => x.Fraccion).WithMany().HasForeignKey(x => x.FraccionId);
            e.HasOne(x => x.Marca).WithMany().HasForeignKey(x => x.MarcaId).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => new { x.FraccionId, x.MarcaId, x.Modelo });
            e.HasIndex(x => new { x.FraccionId, x.EsGenerico });
        });

        modelBuilder.Entity<PrecioPorAntiguedad>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.PrecioUsd).HasColumnType("decimal(18,2)");
            e.HasIndex(x => new { x.PrecioEstimadoId, x.AntiguedadAnios }).IsUnique();
            e.HasOne(x => x.PrecioEstimado).WithMany(p => p.PreciosPorAntiguedad).HasForeignKey(x => x.PrecioEstimadoId);
        });

        modelBuilder.Entity<TabuladorAmparo>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Categoria).HasMaxLength(30).IsRequired();
            e.Property(x => x.PrecioMxn).HasColumnType("decimal(18,2)");
            e.Property(x => x.Notas).HasMaxLength(300);
            e.HasIndex(x => new { x.AnnoModelo, x.Categoria }).IsUnique();
        });

        modelBuilder.Entity<HonorarioConfig>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.TipoMercancia).HasMaxLength(50).IsRequired();
            e.Property(x => x.Regimen).HasMaxLength(20).IsRequired();
            e.Property(x => x.Monto).HasColumnType("decimal(18,2)");
            e.HasIndex(x => new { x.TipoMercancia, x.Regimen, x.Activo });
        });

        modelBuilder.Entity<NhtsaCache>(e =>
        {
            e.HasKey(x => x.Vin);
            e.Property(x => x.Vin).HasMaxLength(17);
            e.Property(x => x.ResponseJson).HasColumnType("jsonb");
        });

        modelBuilder.Entity<TipoCambioCache>(e =>
        {
            e.HasKey(x => new { x.Fecha, x.Fuente });
            e.Property(x => x.Tc).HasColumnType("decimal(18,6)");
            e.Property(x => x.Fuente).HasMaxLength(50);
        });

        modelBuilder.Entity<TipoGastoHormiga>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Categoria).HasMaxLength(50).IsRequired();
            e.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<ParametroFiscal>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Regimen).HasMaxLength(20).IsRequired();
            e.Property(x => x.Descripcion).HasMaxLength(200);
            e.Property(x => x.Igi).HasColumnType("decimal(9,6)");
            e.Property(x => x.Dta).HasColumnType("decimal(9,6)");
            e.Property(x => x.DtaFijo).HasColumnType("decimal(18,2)");
            e.Property(x => x.Iva).HasColumnType("decimal(9,6)");
            e.Property(x => x.PrevFijo).HasColumnType("decimal(18,2)");
            e.Property(x => x.PrvFijo).HasColumnType("decimal(18,2)");
            e.HasIndex(x => new { x.Regimen, x.Activo });
        });

        modelBuilder.Entity<PlantillaMensaje>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Codigo).HasMaxLength(80).IsRequired();
            e.Property(x => x.Asunto).HasMaxLength(300);
            e.Property(x => x.Cuerpo).HasColumnType("text").IsRequired();
            e.Property(x => x.VariablesDisponibles).HasColumnType("jsonb");
            e.HasIndex(x => new { x.TenantId, x.Codigo }).IsUnique();
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<AuditoriaLog>(e =>
        {
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<ConversacionNexus>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Titulo).HasMaxLength(250);
            e.Property(x => x.Resumen).HasColumnType("text");
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId);
            e.HasIndex(x => new { x.TenantId, x.UserId });
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        modelBuilder.Entity<MensajeNexus>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Role).HasMaxLength(20).IsRequired();
            e.Property(x => x.Texto).HasColumnType("text").IsRequired();
            e.Property(x => x.ImagenMime).HasMaxLength(100);
            e.Property(x => x.ToolCallsJson).HasColumnType("jsonb");
            e.HasOne(x => x.Tenant).WithMany().HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.Conversacion).WithMany(c => c.Mensajes).HasForeignKey(x => x.ConversacionId);
            e.HasIndex(x => new { x.TenantId, x.ConversacionId });
            e.HasQueryFilter(e => e.TenantId == CurrentTenantId);
        });

        base.OnModelCreating(modelBuilder);
    }

    public override int SaveChanges()
    {
        ApplyTenantFilter();
        NormalizeDateTimes();
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantFilter();
        NormalizeDateTimes();
        return await base.SaveChangesAsync(cancellationToken);
    }

    private void ApplyTenantFilter()
    {
        if (!_tenantContext.HasTenant) return;

        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.TenantId = _tenantContext.TenantId;
                    break;
                case EntityState.Modified:
                    entry.Property(nameof(ITenantEntity.TenantId)).IsModified = false;
                    break;
            }
        }
    }

    private void NormalizeDateTimes()
    {
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified))
                continue;

            foreach (var property in entry.Properties)
            {
                // Handles both DateTime and DateTime? — boxing Nullable<DateTime> with a value
                // produces a boxed DateTime, so 'is DateTime' matches both cases.
                // The extra clrType check ensures we only set the value when the property
                // type is actually DateTime-based, avoiding type mismatches on assignment.
                var clrType = property.Metadata.ClrType;
                if ((clrType == typeof(DateTime) || clrType == typeof(DateTime?))
                    && property.CurrentValue is DateTime dt
                    && dt.Kind != DateTimeKind.Utc)
                {
                    property.CurrentValue = EnsureUtc(dt);
                }
            }
        }
    }

    private static DateTime EnsureUtc(DateTime value)
        => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
}
