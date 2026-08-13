using System.Security.Cryptography;
using System.Text;

namespace RR.Infrastructure.Services;

public class EntregaLinkTokenService
{
    public string Generate()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    public string Hash(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return string.Empty;

        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        return Convert.ToHexString(hash);
    }
}
