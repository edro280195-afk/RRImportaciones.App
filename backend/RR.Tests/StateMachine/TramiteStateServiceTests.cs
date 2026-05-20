using FluentAssertions;
using RR.Infrastructure.Services;
using Xunit;

namespace RR.Tests.StateMachine;

public class TramiteStateServiceTests
{
    private readonly TramiteStateService _sut = new();

    [Theory]
    [InlineData("PENDIENTE", "RECEPCION_EN_YARDA")]
    [InlineData("RECEPCION_EN_YARDA", "REVISION_DOCUMENTAL")]
    [InlineData("REVISION_DOCUMENTAL", "LISTO_PARA_ADUANA")]
    [InlineData("LISTO_PARA_ADUANA", "PEDIMENTO_DOCUMENTADO")]
    [InlineData("PEDIMENTO_DOCUMENTADO", "MODULACION_EN_CRUCE")]
    [InlineData("MODULACION_EN_CRUCE", "SEMAFORO_VERDE")]
    [InlineData("MODULACION_EN_CRUCE", "SEMAFORO_ROJO")]
    [InlineData("SEMAFORO_VERDE", "LIBERADO")]
    [InlineData("SEMAFORO_ROJO", "LIBERADO")]
    [InlineData("LIBERADO", "ENTREGADO_AL_CLIENTE")]
    public void CanTransitionTo_ValidForwardTransitions_ReturnsTrue(string current, string next)
    {
        var result = _sut.CanTransitionTo(current, next, out var reason);
        
        result.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Fact]
    public void CanTransitionTo_Cancelado_ToAnything_ReturnsFalse()
    {
        var result = _sut.CanTransitionTo("CANCELADO", "PENDIENTE", out var reason);
        
        result.Should().BeFalse();
        reason.Should().Be("Un trámite cancelado no puede reactivarse");
    }

    [Fact]
    public void CanTransitionTo_Anything_ToCancelado_ReturnsTrue()
    {
        var result = _sut.CanTransitionTo("PENDIENTE", "CANCELADO", out var reason);
        
        result.Should().BeTrue();
        reason.Should().BeNull();
    }

    [Theory]
    [InlineData("RECEPCION_EN_YARDA", "PENDIENTE")] // Backward
    [InlineData("LIBERADO", "SEMAFORO_VERDE")] // Backward
    public void CanTransitionTo_ValidReverseTransitions_ReturnsFalseWithReason(string current, string next)
    {
        var result = _sut.CanTransitionTo(current, next, out var reason);
        
        result.Should().BeFalse();
        reason.Should().Contain("requiere rol ADMIN");
    }

    [Fact]
    public void RequiereAdmin_BackwardTransition_ReturnsTrue()
    {
        var result = _sut.RequiereAdmin("RECEPCION_EN_YARDA", "PENDIENTE");
        
        result.Should().BeTrue();
    }

    [Fact]
    public void RequiereAdmin_ForwardTransition_ReturnsFalse()
    {
        var result = _sut.RequiereAdmin("PENDIENTE", "RECEPCION_EN_YARDA");
        
        result.Should().BeFalse();
    }
}
