using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using RR.Application.Interfaces;

namespace RR.Infrastructure.Services;

public class PortalAccessService : IPortalAccessService
{
    private readonly byte[] _key;

    public PortalAccessService(IConfiguration configuration)
    {
        var secret = configuration["PortalAccess:SecretKey"]
            ?? throw new InvalidOperationException("PortalAccess:SecretKey is not configured");
        _key = Encoding.UTF8.GetBytes(secret);
    }

    public string GenerateToken(Guid tramiteId)
    {
        var idBytes = tramiteId.ToByteArray();
        var hmac = HMACSHA256.HashData(_key, idBytes);
        var combined = new byte[idBytes.Length + hmac.Length];
        idBytes.CopyTo(combined, 0);
        hmac.CopyTo(combined, idBytes.Length);
        return Convert.ToBase64String(combined)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    public Guid? ValidateToken(string token)
    {
        try
        {
            var padded = token.Replace('-', '+').Replace('_', '/');
            var mod = padded.Length % 4;
            if (mod == 2) padded += "==";
            else if (mod == 3) padded += "=";
            var combined = Convert.FromBase64String(padded);

            if (combined.Length != 48)
                return null;

            var idBytes = combined[..16];
            var hmac = combined[16..];

            var expectedHmac = HMACSHA256.HashData(_key, idBytes);

            if (!CryptographicOperations.FixedTimeEquals(hmac, expectedHmac))
                return null;

            return new Guid(idBytes);
        }
        catch
        {
            return null;
        }
    }
}
