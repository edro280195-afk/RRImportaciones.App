using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddLotesImportacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LoteId",
                table: "Tramites",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LotesImportacion",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    FolioLote = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ClienteId = table.Column<Guid>(type: "uuid", nullable: false),
                    AduanaId = table.Column<Guid>(type: "uuid", nullable: true),
                    TramitadorId = table.Column<Guid>(type: "uuid", nullable: true),
                    TipoTramite = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "NORMAL"),
                    Estado = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "EN_PROGRESO"),
                    FechaCruce = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notas = table.Column<string>(type: "text", nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaModificacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LotesImportacion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LotesImportacion_Aduanas_AduanaId",
                        column: x => x.AduanaId,
                        principalTable: "Aduanas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_LotesImportacion_Clientes_ClienteId",
                        column: x => x.ClienteId,
                        principalTable: "Clientes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LotesImportacion_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LotesImportacion_Tramitadores_TramitadorId",
                        column: x => x.TramitadorId,
                        principalTable: "Tramitadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tramites_LoteId",
                table: "Tramites",
                column: "LoteId");

            migrationBuilder.CreateIndex(
                name: "IX_Tramites_TenantId_LoteId",
                table: "Tramites",
                columns: new[] { "TenantId", "LoteId" });

            migrationBuilder.CreateIndex(
                name: "IX_LotesImportacion_AduanaId",
                table: "LotesImportacion",
                column: "AduanaId");

            migrationBuilder.CreateIndex(
                name: "IX_LotesImportacion_ClienteId",
                table: "LotesImportacion",
                column: "ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_LotesImportacion_TenantId_ClienteId",
                table: "LotesImportacion",
                columns: new[] { "TenantId", "ClienteId" });

            migrationBuilder.CreateIndex(
                name: "IX_LotesImportacion_TenantId_Estado",
                table: "LotesImportacion",
                columns: new[] { "TenantId", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_LotesImportacion_TenantId_FolioLote",
                table: "LotesImportacion",
                columns: new[] { "TenantId", "FolioLote" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LotesImportacion_TramitadorId",
                table: "LotesImportacion",
                column: "TramitadorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tramites_LotesImportacion_LoteId",
                table: "Tramites",
                column: "LoteId",
                principalTable: "LotesImportacion",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tramites_LotesImportacion_LoteId",
                table: "Tramites");

            migrationBuilder.DropTable(
                name: "LotesImportacion");

            migrationBuilder.DropIndex(
                name: "IX_Tramites_LoteId",
                table: "Tramites");

            migrationBuilder.DropIndex(
                name: "IX_Tramites_TenantId_LoteId",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "LoteId",
                table: "Tramites");
        }
    }
}
