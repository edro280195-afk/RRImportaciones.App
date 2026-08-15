using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddClientesTemporales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ClientesTemporales",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    NombrePropuesto = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PENDIENTE"),
                    TareaCampoId = table.Column<Guid>(type: "uuid", nullable: true),
                    VehiculoId = table.Column<Guid>(type: "uuid", nullable: true),
                    ClienteId = table.Column<Guid>(type: "uuid", nullable: true),
                    CapturadoPor = table.Column<Guid>(type: "uuid", nullable: false),
                    RevisadoPor = table.Column<Guid>(type: "uuid", nullable: true),
                    MotivoRechazo = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaRevision = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClientesTemporales", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClientesTemporales_Clientes_ClienteId",
                        column: x => x.ClienteId,
                        principalTable: "Clientes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClientesTemporales_TareasCampo_TareaCampoId",
                        column: x => x.TareaCampoId,
                        principalTable: "TareasCampo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ClientesTemporales_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ClientesTemporales_Vehiculos_VehiculoId",
                        column: x => x.VehiculoId,
                        principalTable: "Vehiculos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ClientesTemporales_ClienteId",
                table: "ClientesTemporales",
                column: "ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_ClientesTemporales_TareaCampoId",
                table: "ClientesTemporales",
                column: "TareaCampoId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClientesTemporales_TenantId_Estado",
                table: "ClientesTemporales",
                columns: new[] { "TenantId", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_ClientesTemporales_VehiculoId",
                table: "ClientesTemporales",
                column: "VehiculoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ClientesTemporales");
        }
    }
}
