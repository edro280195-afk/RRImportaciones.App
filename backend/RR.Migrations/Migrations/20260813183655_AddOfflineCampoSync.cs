using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddOfflineCampoSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TareasCampo_TenantId",
                table: "TareasCampo");

            migrationBuilder.AddColumn<Guid>(
                name: "ClientOperationId",
                table: "TareasCampo",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TareasCampoMedios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TareaCampoId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientMediaId = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Url = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: false),
                    NombreArchivo = table.Column<string>(type: "character varying(180)", maxLength: 180, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TamanoBytes = table.Column<long>(type: "bigint", nullable: false),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TareasCampoMedios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TareasCampoMedios_TareasCampo_TareaCampoId",
                        column: x => x.TareaCampoId,
                        principalTable: "TareasCampo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TareasCampoMedios_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampo_TenantId_ClientOperationId",
                table: "TareasCampo",
                columns: new[] { "TenantId", "ClientOperationId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampoMedios_TareaCampoId",
                table: "TareasCampoMedios",
                column: "TareaCampoId");

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampoMedios_TenantId_TareaCampoId_ClientMediaId",
                table: "TareasCampoMedios",
                columns: new[] { "TenantId", "TareaCampoId", "ClientMediaId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TareasCampoMedios");

            migrationBuilder.DropIndex(
                name: "IX_TareasCampo_TenantId_ClientOperationId",
                table: "TareasCampo");

            migrationBuilder.DropColumn(
                name: "ClientOperationId",
                table: "TareasCampo");

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampo_TenantId",
                table: "TareasCampo",
                column: "TenantId");
        }
    }
}
