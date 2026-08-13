using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Moq;
using RR.Application.DTOs.Auth;
using RR.Application.Interfaces;
using RR.Domain.Entities;
using RR.Infrastructure.Auth;
using RR.Infrastructure.Data;
using RR.Infrastructure.Services;

namespace RR.Tests.Services;

public class AuthServiceTests
{
    [Fact]
    public async Task LoginAsync_FieldUserWithoutPin_RequestsPinSetup()
    {
        var fixture = await CreateFixtureAsync(isFieldRole: true, hasPin: false);

        var result = await fixture.Service.LoginAsync(new LoginRequest
        {
            Username = fixture.Username,
            Password = fixture.Password,
        });

        result.NeedsSetPin.Should().BeTrue();
        result.User.HasPin.Should().BeFalse();
    }

    [Fact]
    public async Task EntregaToken_CanConfigurePinAndLoginWithoutExposingUsernameInToken()
    {
        var fixture = await CreateFixtureAsync(isFieldRole: true, hasPin: false);
        var tokenService = new EntregaLinkTokenService();
        const string rawToken = "entrega-token-de-prueba";
        var userId = (await fixture.Db.Usuarios.SingleAsync()).Id;

        fixture.Db.TareasEntrega.Add(new TareaEntrega
        {
            Id = Guid.NewGuid(),
            TenantId = fixture.TenantId,
            TramiteId = Guid.NewGuid(),
            ChoferUserId = userId,
            Estado = "PENDIENTE",
            EnlaceTokenHash = tokenService.Hash(rawToken),
            EnlaceTokenExpira = DateTime.UtcNow.AddDays(30),
        });
        await fixture.Db.SaveChangesAsync();

        var configured = await fixture.Service.ConfigurarPinPorEntregaAsync(new EntregaTokenSetPinRequest
        {
            Token = rawToken,
            NewPin = "123456",
        });

        configured.User.Username.Should().Be(fixture.Username);
        configured.User.HasPin.Should().BeTrue();

        var loggedIn = await fixture.Service.PinLoginPorEntregaAsync(new EntregaTokenPinLoginRequest
        {
            Token = rawToken,
            Pin = "123456",
        });

        loggedIn.User.Username.Should().Be(fixture.Username);
    }

    [Fact]
    public async Task LoginAsync_OfficeUserWithoutPin_DoesNotRequestPinSetup()
    {
        var fixture = await CreateFixtureAsync(isFieldRole: false, hasPin: false);

        var result = await fixture.Service.LoginAsync(new LoginRequest
        {
            Username = fixture.Username,
            Password = fixture.Password,
        });

        result.NeedsSetPin.Should().BeFalse();
        result.User.HasPin.Should().BeFalse();
    }

    [Fact]
    public async Task LoginAsync_ManagerWithCampoPermission_DoesNotRequestPinSetup()
    {
        var fixture = await CreateFixtureAsync(isFieldRole: false, hasPin: false);
        var role = await fixture.Db.Roles.SingleAsync();
        role.Nombre = "GERENTE";
        var permission = new Permission
        {
            Id = Guid.NewGuid(),
            Codigo = "CAMPO_USAR",
            Nombre = "Usar campo",
            Modulo = "CAMPO",
        };
        fixture.Db.Permisos.Add(permission);
        fixture.Db.RolesPermisos.Add(new RolePermission
        {
            RoleId = role.Id,
            PermissionId = permission.Id,
            Role = role,
            Permission = permission,
        });
        await fixture.Db.SaveChangesAsync();

        var result = await fixture.Service.LoginAsync(new LoginRequest
        {
            Username = fixture.Username,
            Password = fixture.Password,
        });

        result.NeedsSetPin.Should().BeFalse();
    }

    [Fact]
    public async Task GetCampoUsersAsync_OnlyReturnsFieldRolesWithPin()
    {
        var fixture = await CreateFixtureAsync(isFieldRole: true, hasPin: true);
        var officeRole = new Role
        {
            Id = Guid.NewGuid(),
            Nombre = "ADMIN",
        };
        fixture.Db.Roles.Add(officeRole);
        fixture.Db.Usuarios.Add(new User
        {
            Id = Guid.NewGuid(),
            TenantId = fixture.TenantId,
            Username = "admin.con.pin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123!"),
            Nombre = "Admin",
            RoleId = officeRole.Id,
            Role = officeRole,
            PinHash = "hash",
            PinSalt = "salt",
        });
        await fixture.Db.SaveChangesAsync();

        var result = await fixture.Service.GetCampoUsersAsync();

        result.Should().ContainSingle();
        result[0].Username.Should().Be(fixture.Username);
    }

    private static async Task<AuthFixture> CreateFixtureAsync(
        bool isFieldRole,
        bool hasPin)
    {
        var tenantId = Guid.NewGuid();
        var tenantContext = new TestTenantContext(tenantId);
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"auth-{Guid.NewGuid()}")
            .Options;
        var db = new AppDbContext(options, tenantContext);

        var role = new Role
        {
            Id = Guid.NewGuid(),
            Nombre = isFieldRole ? "YARDERO" : "ADMIN",
        };

        if (isFieldRole)
        {
            var permission = new Permission
            {
                Id = Guid.NewGuid(),
                Codigo = "CAMPO_USAR",
                Nombre = "Usar campo",
                Modulo = "CAMPO",
            };
            var rolePermission = new RolePermission
            {
                RoleId = role.Id,
                PermissionId = permission.Id,
                Role = role,
                Permission = permission,
            };
            role.RolePermissions.Add(rolePermission);
            db.Permisos.Add(permission);
            db.RolesPermisos.Add(rolePermission);
        }

        const string username = "usuario.prueba";
        const string password = "Password123!";
        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Nombre = "Usuario",
            RoleId = role.Id,
            Role = role,
            PinHash = hasPin ? "hash" : null,
            PinSalt = hasPin ? "salt" : null,
        };

        db.Roles.Add(role);
        db.Usuarios.Add(user);
        await db.SaveChangesAsync();

        var jwt = new Mock<IJwtService>();
        jwt.Setup(service => service.GenerateJwt(It.IsAny<User>()))
            .Returns(("access-token", DateTime.UtcNow.AddMinutes(15)));
        jwt.Setup(service => service.GenerateRefreshToken())
            .Returns($"refresh-{Guid.NewGuid()}");
        jwt.Setup(service => service.HashRefreshToken(It.IsAny<string>()))
            .Returns<string>(value => $"hash-{value}");

        var service = new AuthService(
            db,
            jwt.Object,
            Options.Create(new JwtSettings { RefreshTokenExpirationDays = 7 }),
            Mock.Of<IRealtimeNotifier>(),
            Mock.Of<IEmailService>(),
            new ConfigurationBuilder().Build());

        return new AuthFixture(
            db,
            service,
            tenantId,
            username,
            password);
    }

    private sealed record AuthFixture(
        AppDbContext Db,
        AuthService Service,
        Guid TenantId,
        string Username,
        string Password);

    private sealed class TestTenantContext : ITenantContext
    {
        public TestTenantContext(Guid tenantId)
        {
            TenantId = tenantId;
        }

        public Guid TenantId { get; private set; }
        public bool HasTenant { get; private set; } = true;

        public void SetTenant(Guid tenantId)
        {
            TenantId = tenantId;
            HasTenant = true;
        }
    }
}
