using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddCampoDocumentosPagosOperativos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PagadoPor",
                table: "Pagos",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "CLIENTE");

            migrationBuilder.AddColumn<bool>(
                name: "SeCobraAlCliente",
                table: "Pagos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TipoMovimiento",
                table: "Pagos",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "PAGO_CLIENTE");

            migrationBuilder.CreateTable(
                name: "TareasCampo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TramiteId = table.Column<Guid>(type: "uuid", nullable: false),
                    PersonalCampoId = table.Column<Guid>(type: "uuid", nullable: true),
                    Tipo = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false, defaultValue: "FOTOS_YARDA"),
                    EstadoLogistico = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "ABIERTA"),
                    Ubicacion = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    VinConfirmado = table.Column<string>(type: "character varying(17)", maxLength: 17, nullable: true),
                    FotosUrls = table.Column<string[]>(type: "text[]", nullable: false),
                    Incidencia = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaTomada = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FechaCompletada = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreadoPor = table.Column<Guid>(type: "uuid", nullable: false),
                    TomadaPorUsuarioId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TareasCampo", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TareasCampo_PersonalCampo_PersonalCampoId",
                        column: x => x.PersonalCampoId,
                        principalTable: "PersonalCampo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_TareasCampo_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TareasCampo_Tramites_TramiteId",
                        column: x => x.TramiteId,
                        principalTable: "Tramites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TramitesDocumentos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TramiteId = table.Column<Guid>(type: "uuid", nullable: false),
                    TipoDocumento = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EstadoLogistico = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "PENDIENTE"),
                    EsRequerido = table.Column<bool>(type: "boolean", nullable: false),
                    ArchivoUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Notas = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FechaRecibido = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FechaValidado = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ValidadoPor = table.Column<Guid>(type: "uuid", nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TramitesDocumentos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TramitesDocumentos_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TramitesDocumentos_Tramites_TramiteId",
                        column: x => x.TramiteId,
                        principalTable: "Tramites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampo_PersonalCampoId",
                table: "TareasCampo",
                column: "PersonalCampoId");

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampo_TenantId",
                table: "TareasCampo",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampo_TramiteId_Estatus",
                table: "TareasCampo",
                columns: new[] { "TramiteId", "EstadoLogistico" });

            migrationBuilder.CreateIndex(
                name: "IX_TramitesDocumentos_TenantId",
                table: "TramitesDocumentos",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TramitesDocumentos_TramiteId_TipoDocumento",
                table: "TramitesDocumentos",
                columns: new[] { "TramiteId", "TipoDocumento" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TareasCampo");

            migrationBuilder.DropTable(
                name: "TramitesDocumentos");

            migrationBuilder.DropColumn(
                name: "PagadoPor",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "SeCobraAlCliente",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "TipoMovimiento",
                table: "Pagos");
        }
    }
}
