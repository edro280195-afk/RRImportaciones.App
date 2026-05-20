using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using RR.Infrastructure.Data;

#nullable disable

namespace RR.Migrations.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260514193000_AddBancos")]
public partial class AddBancos : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Bancos",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uuid", nullable: false),
                TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                Identificador = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                Nombre = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                Titular = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                Cuenta = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                Clabe = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                Moneda = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: true),
                Notas = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                Activo = table.Column<bool>(type: "boolean", nullable: false),
                FechaRegistro = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Bancos", x => x.Id);
                table.ForeignKey(
                    name: "FK_Bancos_Tenants_TenantId",
                    column: x => x.TenantId,
                    principalTable: "Tenants",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Bancos_TenantId_Identificador",
            table: "Bancos",
            columns: new[] { "TenantId", "Identificador" },
            unique: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Bancos");
    }
}
