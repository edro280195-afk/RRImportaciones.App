using FluentAssertions;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RR.Application.Interfaces;
using RR.Infrastructure.Services.Push;

namespace RR.Tests.Services;

public class FirebaseMessagingSenderTests
{
    /// <summary>
    /// Sin credenciales de Firebase el emisor tiene que quedarse callado, no
    /// tronar: es lo que permite que las notificaciones caigan al canal Web
    /// Push VAPID cuando el despliegue todavía no tiene la variable puesta.
    /// </summary>
    [Fact]
    public void SinCredenciales_QuedaDeshabilitado()
    {
        var sender = new FirebaseMessagingSender(
            new ConfigurationBuilder().Build(),
            NullLogger<FirebaseMessagingSender>.Instance);

        sender.Enabled.Should().BeFalse();
    }

    /// <summary>Deshabilitado, enviar no hace nada ni devuelve tokens muertos.</summary>
    [Fact]
    public async Task SinCredenciales_EnviarNoHaceNada()
    {
        var sender = new FirebaseMessagingSender(
            new ConfigurationBuilder().Build(),
            NullLogger<FirebaseMessagingSender>.Instance);

        var invalidos = await sender.SendAsync(
            ["token-cualquiera"],
            new PushPayload { Title = "Prueba", Body = "Prueba" });

        invalidos.Should().BeEmpty();
    }

    /// <summary>Un JSON corrupto tampoco debe tumbar el arranque de la API.</summary>
    [Fact]
    public void CredencialesInvalidas_NoTruena()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Firebase:ServiceAccountJson"] = "{ esto no es un service account }",
            })
            .Build();

        var sender = new FirebaseMessagingSender(config, NullLogger<FirebaseMessagingSender>.Instance);

        sender.Enabled.Should().BeFalse();
    }

    /// <summary>
    /// FirebaseApp.GetInstance devuelve null cuando la aplicación todavía no
    /// existe; la inicialización debe crearla antes de pedir FirebaseMessaging.
    /// </summary>
    [Fact]
    public void AppNoExistente_SeCreaAntesDeObtenerMessaging()
    {
        var appName = $"rr-tests-{Guid.NewGuid():N}";
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Firebase:ProjectId"] = "rr-tests-project",
            })
            .Build();

        var app = FirebaseMessagingSender.GetOrCreateApp(
            config,
            GoogleCredential.FromAccessToken("token-de-prueba"),
            appName);

        try
        {
            app.Should().NotBeNull();
            app.Name.Should().Be(appName);
        }
        finally
        {
            app.Delete();
        }
    }
}
