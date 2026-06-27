using FluentAssertions;
using RR.Infrastructure.Services;
using Xunit;

namespace RR.Tests.StateMachine;

public class TramiteStateServiceTests
{
    private readonly TramiteStateService _sut = new();

    [Theory]
    [InlineData("PENDIENTE_TRAMITE", "FOTOS_SOLICITADAS")]
    [InlineData("PENDIENTE_TRAMITE", "MANDADO_A_CRUCE")] // salto hacia adelante
    [InlineData("ROJO_DESADUANADO", "COBRADO")]
    [InlineData("AMARILLO_PENDIENTE_PAGO", "COBRADO")]
    [InlineData("ENTREGADO_AL_CLIENTE", "COBRADO")] // post-entrega permitido
    [InlineData("MANDADO_A_CRUCE", "REQUISITOS_PENDIENTES")] // hacia atrás permitido
    public void CanTransitionTo_EntreEstadosValidos_ReturnsTrue(string current, string next)
    {
        var result = _sut.CanTransitionTo(current, next, out var reason);

        result.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public void CanTransitionTo_Cancelado_ToAnything_ReturnsFalse()
    {
        var result = _sut.CanTransitionTo("CANCELADO", "PENDIENTE_TRAMITE", out var reason);

        result.Should().BeFalse();
        reason.Should().Contain("cancelado no puede reactivarse");
    }

    [Theory]
    [InlineData("PENDIENTE_TRAMITE")]
    [InlineData("ROJO_DESADUANADO")]
    [InlineData("ENTREGADO_AL_CLIENTE")]
    public void CanTransitionTo_Anything_ToCancelado_ReturnsTrue(string current)
    {
        var result = _sut.CanTransitionTo(current, "CANCELADO", out var reason);

        result.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public void CanTransitionTo_MismoEstado_ReturnsFalse()
    {
        var result = _sut.CanTransitionTo("ROJO_DESADUANADO", "ROJO_DESADUANADO", out var reason);

        result.Should().BeFalse();
        reason.Should().Contain("ya está en ese estado");
    }

    [Fact]
    public void CanTransitionTo_EstadoDestinoDesconocido_ReturnsFalse()
    {
        var result = _sut.CanTransitionTo("PENDIENTE_TRAMITE", "ESTADO_INEXISTENTE_123", out var reason);

        result.Should().BeFalse();
        reason.Should().Contain("Estado destino desconocido");
    }

    [Fact]
    public void GetTransicionesPermitidas_Pendiente_IncluyeOtrosEstadosYCancelado_SinSiMismo()
    {
        var result = _sut.GetTransicionesPermitidas("PENDIENTE_TRAMITE");

        result.Should().Contain("ROJO_DESADUANADO");
        result.Should().Contain("CANCELADO");
        result.Should().NotContain("PENDIENTE_TRAMITE");
    }

    [Fact]
    public void GetTransicionesPermitidas_Entregado_SiguePermitiendoCambios()
    {
        // Modelo permisivo: tras entregar todavía se puede marcar COBRADO o cancelar.
        var result = _sut.GetTransicionesPermitidas("ENTREGADO_AL_CLIENTE");

        result.Should().Contain("COBRADO");
        result.Should().Contain("CANCELADO");
        result.Should().NotContain("ENTREGADO_AL_CLIENTE");
    }

    [Fact]
    public void GetTransicionesPermitidas_Cancelado_DevuelveVacio()
    {
        var result = _sut.GetTransicionesPermitidas("CANCELADO");

        result.Should().BeEmpty();
    }

    [Theory]
    [InlineData("PENDIENTE_TRAMITE", "COBRADO")]
    [InlineData("ROJO_DESADUANADO", "PENDIENTE_TRAMITE")]
    public void RequiereAdmin_SiempreFalse(string current, string next)
    {
        _sut.RequiereAdmin(current, next).Should().BeFalse();
    }
}
