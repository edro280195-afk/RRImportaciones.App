using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RR.Application.DTOs.Auth;
using RR.Application.Interfaces;
using RR.Infrastructure.Auth;
using RR.Infrastructure.Data;

using System.Linq;
using Microsoft.Extensions.Configuration;

namespace RR.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;
    private readonly JwtSettings _settings;
    private readonly IRealtimeNotifier _realtimeNotifier;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public AuthService(
        AppDbContext db,
        IJwtService jwt,
        IOptions<JwtSettings> settings,
        IRealtimeNotifier realtimeNotifier,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _db = db;
        _jwt = jwt;
        _settings = settings.Value;
        _realtimeNotifier = realtimeNotifier;
        _emailService = emailService;
        _configuration = configuration;
    }

    // ──────────────────────────────────────────────────
    // PIN helpers
    // ──────────────────────────────────────────────────

    private static string GenerateSalt()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    private static string HashPin(string pin, string salt)
    {
        // PBKDF2-SHA256: 100k iteraciones — suficiente para un PIN corto
        using var pbkdf2 = new Rfc2898DeriveBytes(
            Encoding.UTF8.GetBytes(pin),
            Convert.FromBase64String(salt),
            100_000,
            HashAlgorithmName.SHA256);
        return Convert.ToBase64String(pbkdf2.GetBytes(32));
    }

    private static bool VerifyPin(string pin, string storedHash, string salt)
    {
        var candidate = HashPin(pin, salt);
        return CryptographicOperations.FixedTimeEquals(
            Convert.FromBase64String(storedHash),
            Convert.FromBase64String(candidate));
    }

    // ──────────────────────────────────────────────────
    // Shared: build LoginResponse from a User
    // ──────────────────────────────────────────────────

    private async Task<LoginResponse> BuildResponseAsync(Domain.Entities.User user, bool needsSetPin = false)
    {
        var (token, expiresAt) = _jwt.GenerateJwt(user);
        var refreshToken = _jwt.GenerateRefreshToken();

        _db.RefreshTokens.Add(new Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            TokenHash = _jwt.HashRefreshToken(refreshToken),
            ExpiresAt = DateTime.UtcNow.AddDays(_settings.RefreshTokenExpirationDays),
        });
        await _db.SaveChangesAsync();

        return new LoginResponse
        {
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = expiresAt,
            NeedsSetPin = needsSetPin,
            User = new UserInfo
            {
                Id = user.Id,
                Username = user.Username,
                Nombre = user.Nombre,
                Apellidos = user.Apellidos,
                Role = user.Role?.Nombre ?? "",
                TenantId = user.TenantId,
                Permisos = user.Role?.RolePermissions
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission!.Codigo)
                    .ToList() ?? [],
            }
        };
    }

    // ──────────────────────────────────────────────────

    private async Task<Domain.Entities.User> LoadUserWithRoleAsync(System.Linq.Expressions.Expression<Func<Domain.Entities.User, bool>> predicate)
    {
        return await _db.Usuarios
            .IgnoreQueryFilters()
            .Include(u => u.Role)
                .ThenInclude(r => r!.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(predicate)
            ?? throw new UnauthorizedAccessException("Credenciales inválidas");
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await LoadUserWithRoleAsync(u => u.Username == request.Username && u.Activo);

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Credenciales inválidas");

        user.UltimoAcceso = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Si el usuario no tiene PIN todavía, pedir que lo configure en el primer acceso
        bool needsSetPin = string.IsNullOrEmpty(user.PinHash);

        return await BuildResponseAsync(user, needsSetPin);
    }

    public async Task<LoginResponse> PinLoginAsync(PinLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Pin) || request.Pin.Length != 6 || !request.Pin.All(char.IsDigit))
            throw new UnauthorizedAccessException("PIN inválido");

        var user = await LoadUserWithRoleAsync(u => u.Username == request.Username && u.Activo);

        if (string.IsNullOrEmpty(user.PinHash) || string.IsNullOrEmpty(user.PinSalt))
            throw new UnauthorizedAccessException("Este usuario aún no tiene PIN configurado");

        if (!VerifyPin(request.Pin, user.PinHash, user.PinSalt))
            throw new UnauthorizedAccessException("PIN incorrecto");

        user.UltimoAcceso = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await BuildResponseAsync(user);
    }

    public async Task SetPinAsync(Guid userId, SetPinRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPin) || request.NewPin.Length != 6 || !request.NewPin.All(char.IsDigit))
            throw new ArgumentException("El PIN debe ser de exactamente 6 dígitos numéricos");

        var user = await _db.Usuarios.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Usuario no encontrado");

        // Si ya tenía PIN, verificar el actual
        if (!string.IsNullOrEmpty(user.PinHash) && !string.IsNullOrEmpty(user.PinSalt))
        {
            if (string.IsNullOrEmpty(request.CurrentPin) || !VerifyPin(request.CurrentPin, user.PinHash, user.PinSalt))
                throw new UnauthorizedAccessException("PIN actual incorrecto");
        }

        var salt = GenerateSalt();
        user.PinHash = HashPin(request.NewPin, salt);
        user.PinSalt = salt;
        await _db.SaveChangesAsync();
    }

    public async Task<LoginResponse> SetInitialCampoPinAsync(InitialSetPinRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPin) || request.NewPin.Length != 6 || !request.NewPin.All(char.IsDigit))
            throw new ArgumentException("El PIN debe ser de exactamente 6 digitos numericos");

        var user = await LoadUserWithRoleAsync(u => u.Username == request.Username && u.Activo);

        if (!string.IsNullOrEmpty(user.PinHash) && !string.IsNullOrEmpty(user.PinSalt))
            throw new InvalidOperationException("Este usuario ya tiene PIN configurado");

        var salt = GenerateSalt();
        user.PinHash = HashPin(request.NewPin, salt);
        user.PinSalt = salt;
        user.UltimoAcceso = DateTime.UtcNow;

        return await BuildResponseAsync(user);
    }

    public async Task<List<CampoUserDto>> GetCampoUsersAsync()
    {
        return await _db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.Activo && u.PinHash != null)
            .OrderBy(u => u.Nombre)
            .Select(u => new CampoUserDto
            {
                Id = u.Id,
                Username = u.Username,
                Nombre = u.Nombre,
                Apellidos = u.Apellidos,
                TienePin = u.PinHash != null,
            })
            .ToListAsync();
    }

    public async Task<LoginResponse> RefreshTokenAsync(string refreshToken)
    {
        var tokenHash = _jwt.HashRefreshToken(refreshToken);

        var storedToken = await _db.RefreshTokens
            .Include(t => t.User!)
                .ThenInclude(u => u!.Role)
                    .ThenInclude(r => r!.RolePermissions)
                        .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && !t.Revoked && t.ExpiresAt > DateTime.UtcNow);

        var user = storedToken?.User;
        if (storedToken == null || user == null)
            throw new UnauthorizedAccessException("Refresh token inválido o expirado");

        storedToken.Revoked = true;
        storedToken.RevokedAt = DateTime.UtcNow;

        return await BuildResponseAsync(user);
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var tokenHash = _jwt.HashRefreshToken(refreshToken);
        var storedToken = await _db.RefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash && !t.Revoked);

        if (storedToken != null)
        {
            storedToken.Revoked = true;
            storedToken.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
    }

    public async Task RequestPinResetAsync(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
            throw new ArgumentException("El nombre de usuario es obligatorio");

        var user = await _db.Usuarios
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Activo && u.Username.ToLower() == username.Trim().ToLower())
            ?? throw new KeyNotFoundException("Usuario no encontrado");

        var operadorNombre = $"{user.Nombre} {user.Apellidos}".Trim();
        
        // SignalR
        await _realtimeNotifier.PinResetRequestedAsync(user.Id, operadorNombre, user.Username);

        // Email a administradores
        var appBaseUrl = _configuration["AppBaseUrl"] ?? "http://localhost:4200";
        // Notificar a los usuarios de oficina (todos los que NO tienen permiso CAMPO_USAR).
        var admins = await _db.Usuarios
            .IgnoreQueryFilters()
            .Include(u => u.Role)
                .ThenInclude(r => r!.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
            .Where(u => u.TenantId == user.TenantId
                     && u.Activo
                     && !string.IsNullOrEmpty(u.Email)
                     && u.Role != null
                     && !u.Role.RolePermissions.Any(rp => rp.Permission != null && rp.Permission.Codigo == "CAMPO_USAR"))
            .Select(u => u.Email!)
            .ToListAsync();

        foreach (var email in admins)
        {
            _ = _emailService.SendPinResetRequestedAsync(email, operadorNombre, user.Username, appBaseUrl)
                .ContinueWith(t => { /* silenciar fallos de correo */ }, TaskContinuationOptions.OnlyOnFaulted);
        }
    }

    public async Task ForceSetPinAsync(Guid userId, string newPin)
    {
        if (string.IsNullOrWhiteSpace(newPin) || newPin.Length != 6 || !newPin.All(char.IsDigit))
            throw new ArgumentException("El PIN debe ser de exactamente 6 dígitos numéricos");

        var user = await _db.Usuarios
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Usuario no encontrado");

        var salt = GenerateSalt();
        user.PinHash = HashPin(newPin, salt);
        user.PinSalt = salt;
        await _db.SaveChangesAsync();
    }
}
