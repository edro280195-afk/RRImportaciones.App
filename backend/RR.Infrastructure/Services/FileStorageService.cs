using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using RR.Application.Interfaces;
using System.Text.RegularExpressions;

namespace RR.Infrastructure.Services;

public class FileStorageService : IFileStorageService
{
    private static readonly TimeSpan R2UploadTimeout = TimeSpan.FromMinutes(4);
    private readonly IConfiguration _configuration;

    public FileStorageService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<string> UploadFileAsync(string folderName, string fileName, string contentType, Stream stream, CancellationToken cancellationToken = default)
    {
        var provider = _configuration["Storage:Provider"] ?? "Local";
        if (provider.Equals("R2", StringComparison.OrdinalIgnoreCase))
            return await UploadToR2Async(folderName, fileName, contentType, stream, cancellationToken);

        return await UploadLocalAsync(folderName, fileName, stream, cancellationToken);
    }

    public async Task<string> UploadFileWithStableNameAsync(string folderName, string fileName, string contentType, Stream stream, CancellationToken cancellationToken = default)
    {
        var provider = _configuration["Storage:Provider"] ?? "Local";
        if (provider.Equals("R2", StringComparison.OrdinalIgnoreCase))
            return await UploadToR2Async(folderName, fileName, contentType, stream, cancellationToken, preserveName: true);

        return await UploadLocalAsync(folderName, fileName, stream, cancellationToken, preserveName: true);
    }

    private static async Task<string> UploadLocalAsync(string folderName, string fileName, Stream stream, CancellationToken cancellationToken, bool preserveName = false)
    {
        var backendRoot = ResolveBackendRoot();
        var normalizedFolder = folderName.Replace('\\', '/').Trim('/');
        var storagePath = Path.Combine(backendRoot, "storage", normalizedFolder);
        Directory.CreateDirectory(storagePath);

        var safeName = BuildSafeFileName(fileName, preserveName);
        var fullPath = Path.Combine(storagePath, safeName);

        await using var output = File.Create(fullPath);
        await stream.CopyToAsync(output, cancellationToken);

        return $"/storage/{normalizedFolder}/{safeName}";
    }

    private async Task<string> UploadToR2Async(string folderName, string fileName, string contentType, Stream stream, CancellationToken cancellationToken, bool preserveName = false)
    {
        var accountId = _configuration["Storage:R2:AccountId"];
        var accessKeyId = _configuration["Storage:R2:AccessKeyId"];
        var secretAccessKey = _configuration["Storage:R2:SecretAccessKey"];
        var bucket = _configuration["Storage:R2:Bucket"];
        var publicBaseUrl = _configuration["Storage:R2:PublicBaseUrl"];

        if (string.IsNullOrWhiteSpace(accountId)
            || string.IsNullOrWhiteSpace(accessKeyId)
            || string.IsNullOrWhiteSpace(secretAccessKey)
            || string.IsNullOrWhiteSpace(bucket)
            || string.IsNullOrWhiteSpace(publicBaseUrl))
        {
            return await UploadLocalAsync(folderName, fileName, stream, cancellationToken, preserveName);
        }

        var credentials = new BasicAWSCredentials(accessKeyId, secretAccessKey);
        using var client = new AmazonS3Client(credentials, new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
        });

        var normalizedFolder = folderName.Replace('\\', '/').Trim('/');
        var key = $"{normalizedFolder}/{BuildSafeFileName(fileName, preserveName)}";

        using var uploadTimeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        uploadTimeout.CancelAfter(R2UploadTimeout);

        await client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = bucket,
            Key = key,
            InputStream = stream,
            ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType,
            DisablePayloadSigning = true,
        }, uploadTimeout.Token);

        return $"{publicBaseUrl.TrimEnd('/')}/{key}";
    }

    private static string ResolveBackendRoot()
    {
        var cwd = Directory.GetCurrentDirectory();
        if (Directory.Exists(Path.Combine(cwd, "backend")))
            return Path.Combine(cwd, "backend");

        return Directory.GetParent(cwd)?.FullName ?? cwd;
    }

    private static string BuildSafeFileName(string fileName, bool preserveName = false)
    {
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension)) extension = ".jpg";
        extension = extension.ToLowerInvariant();

        if (preserveName)
        {
            var name = Path.GetFileNameWithoutExtension(fileName);
            name = Regex.Replace(name, "[^a-zA-Z0-9_-]", "-").Trim('-');
            if (string.IsNullOrWhiteSpace(name)) name = Guid.NewGuid().ToString("N");
            return $"{name[..Math.Min(100, name.Length)]}{extension}";
        }

        return $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid():N}{extension}";
    }
}
