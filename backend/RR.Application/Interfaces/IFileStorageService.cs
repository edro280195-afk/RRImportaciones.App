namespace RR.Application.Interfaces;

public interface IFileStorageService
{
    Task<string> UploadFileAsync(string folderName, string fileName, string contentType, Stream stream, CancellationToken cancellationToken = default);
    Task<string> UploadFileWithStableNameAsync(string folderName, string fileName, string contentType, Stream stream, CancellationToken cancellationToken = default);
}
