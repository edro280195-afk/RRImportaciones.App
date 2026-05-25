using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RR.Api.BackgroundServices;
using RR.Api.Hubs;
using RR.Api.Middleware;
using RR.Api.Services;
using RR.Application.Interfaces;
using RR.Infrastructure.Auth;
using RR.Infrastructure.Services;
using RR.Infrastructure.Data;
using RR.Infrastructure.Middleware;
using RR.Infrastructure.Services.RodriTools;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();
builder.Host.UseSerilog();

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options
        .UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
            b => b.MigrationsAssembly("RR.Migrations"))
        .ConfigureWarnings(warnings =>
            warnings.Ignore(CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning)));

builder.Services.AddSingleton<IModelCacheKeyFactory, TenantModelCacheKeyFactory>();

// Auth
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
builder.Services.Configure<JwtSettings>(jwtSettings);

var secretKey = jwtSettings["SecretKey"] ?? throw new InvalidOperationException("JWT SecretKey not configured");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/realtime"))
                context.Token = accessToken;

            return Task.CompletedTask;
        },
    };
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero,
    };
});

builder.Services.AddAuthorization();

// DI - Scoped services
builder.Services.AddScoped<ITenantContext, TenantContext>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IClienteService, ClienteService>();
builder.Services.AddScoped<IVehiculoService, VehiculoService>();
builder.Services.AddScoped<IMarcaService, MarcaService>();
builder.Services.AddScoped<ITramiteService, TramiteService>();
builder.Services.AddScoped<ILoteImportacionService, LoteImportacionService>();
builder.Services.AddScoped<ITramiteStateService, TramiteStateService>();
builder.Services.AddScoped<ITramitadorService, TramitadorService>();
builder.Services.AddScoped<IPersonalCampoService, PersonalCampoService>();
builder.Services.AddScoped<IPartnerExternoService, PartnerExternoService>();
builder.Services.AddScoped<IPagoService, PagoService>();
builder.Services.AddScoped<IPagoReciboPdfService, PagoReciboPdfService>();
builder.Services.AddScoped<IGastoHormigaService, GastoHormigaService>();
builder.Services.AddScoped<ITipoGastoService, TipoGastoService>();
builder.Services.AddScoped<IDataImportService, DataImportService>();
builder.Services.AddScoped<IBanxicoService, BanxicoService>();
builder.Services.AddScoped<INhtsaService, NhtsaService>();
builder.Services.AddScoped<ICotizadorService, CotizadorService>();
builder.Services.AddScoped<IParametroFiscalService, ParametroFiscalService>();
builder.Services.AddScoped<PlantillaMensajeService>();
builder.Services.AddScoped<IPlantillaMensajeService>(sp => sp.GetRequiredService<PlantillaMensajeService>());
builder.Services.AddScoped<ICotizacionPdfService, CotizacionPdfService>();
builder.Services.AddScoped<ILotePdfService, LotePdfService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IWhatsAppCotizacionService, WhatsAppCotizacionService>();
builder.Services.AddScoped<IWhatsAppLoteService, WhatsAppLoteService>();
builder.Services.AddScoped<IUsuarioService, UsuarioService>();
builder.Services.AddScoped<ICampoService, CampoService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IReporteService, ReporteService>();
builder.Services.AddScoped<IPedimentoService, PedimentoService>();
builder.Services.AddScoped<IRealtimeNotifier, RealtimeNotifier>();
builder.Services.AddScoped<ICatalogoPreciosService, CatalogoPreciosService>();
builder.Services.AddSingleton<IPortalAccessService, PortalAccessService>();

// Rodri tools — consultas generales
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ListarCotizacionesTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ObtenerCotizacionTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.CalcularCotizacionTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ListarTramitesTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ListarClientesTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ObtenerAlertasTool>();
// Rodri tools — Asistente Personal (Modo Don)
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ConsultarDeudoresTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ConsultarPagosRecientesTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ConsultarUbicacionVehiculosTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ConsultarDocumentosPendientesTool>();
// Rodri tools — escritura (requieren confirmación del usuario)
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.RegistrarPagoTramiteTool>();
builder.Services.AddScoped<IRodriTool, RR.Infrastructure.Services.RodriTools.ActualizarEstadoTramiteTool>();

builder.Services.AddSignalR();
builder.Services.AddHttpClient<IBanxicoService, BanxicoService>();
builder.Services.AddHttpClient<INhtsaService, NhtsaService>();
builder.Services.AddHttpClient<IRodriService, RodriService>();
builder.Services.AddHttpContextAccessor();

// Background services
builder.Services.AddHostedService<CotizacionesExpirationJob>();

// Seed config
builder.Services.Configure<SeedConfig>(builder.Configuration.GetSection("SeedConfig"));

// CORS - configurable por entorno
var allowedOrigins = builder.Configuration["AllowedOrigins"]
    ?? "http://localhost:4200,http://localhost:4300,http://127.0.0.1:4200,http://127.0.0.1:4300";

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins.Split(','))
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Rate limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("Portal", config =>
    {
        config.PermitLimit = 10;
        config.Window = TimeSpan.FromMinutes(1);
        config.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Controllers
builder.Services.AddControllers();

var app = builder.Build();

// Middleware pipeline
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

var backendRoot = Directory.GetParent(app.Environment.ContentRootPath)?.FullName ?? app.Environment.ContentRootPath;
var storageRoot = Path.Combine(backendRoot, "storage");
Directory.CreateDirectory(Path.Combine(storageRoot, "comprobantes"));
Directory.CreateDirectory(Path.Combine(storageRoot, "public", "cotizaciones"));
Directory.CreateDirectory(Path.Combine(storageRoot, "public", "pagos", "recibos"));
Directory.CreateDirectory(Path.Combine(storageRoot, "campo"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(storageRoot),
    RequestPath = "/storage",
});

app.UseRateLimiter();

// Tenant middleware runs after auth
app.UseAuthentication();

app.UseMiddleware<TenantMiddleware>();

app.UseAuthorization();

app.MapControllers();
app.MapHub<RealtimeHub>("/hubs/realtime");

// Seed
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var seedConfig = scope.ServiceProvider.GetRequiredService<IOptions<SeedConfig>>().Value;
    await DbInitializer.SeedAsync(db, seedConfig.ForceReseed);
}

app.Run();
