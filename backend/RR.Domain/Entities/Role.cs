namespace RR.Domain.Entities;

public class Role
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool EsSistema { get; set; }
    public Guid? TenantId { get; set; }

    public Tenant? Tenant { get; set; }
    public ICollection<User> Usuarios { get; set; } = new List<User>();
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
