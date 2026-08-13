using FluentAssertions;
using RR.Infrastructure.Services;

namespace RR.Tests.Services;

public class EntregaLinkTokenServiceTests
{
    [Fact]
    public void Generate_ReturnsUrlSafeRandomToken()
    {
        var service = new EntregaLinkTokenService();

        var first = service.Generate();
        var second = service.Generate();

        first.Should().NotBeNullOrWhiteSpace();
        second.Should().NotBe(first);
        first.Should().MatchRegex("^[A-Za-z0-9_-]+$");
        second.Should().MatchRegex("^[A-Za-z0-9_-]+$");
    }

    [Fact]
    public void Hash_IsDeterministicAndDoesNotExposeOriginalToken()
    {
        var service = new EntregaLinkTokenService();
        const string token = "token-de-prueba-123";

        var firstHash = service.Hash(token);
        var secondHash = service.Hash(token);

        firstHash.Should().Be(secondHash);
        firstHash.Should().HaveLength(64);
        firstHash.Should().NotContain(token);
    }
}
