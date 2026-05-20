namespace RR.Application.DTOs.Common;

public class ErrorResponse
{
    public string Message { get; set; } = string.Empty;
    public List<string>? Errors { get; set; }
    public int StatusCode { get; set; }
}
