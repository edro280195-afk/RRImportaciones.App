using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddTramitesModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tramites_FraccionesArancelarias_FraccionId",
                table: "Tramites");

            migrationBuilder.DropIndex(
                name: "IX_Tramites_TenantId",
                table: "Tramites");

            migrationBuilder.RenameColumn(
                name: "FraccionId",
                table: "Tramites",
                newName: "TramitadorId");

            migrationBuilder.RenameIndex(
                name: "IX_Tramites_FraccionId",
                table: "Tramites",
                newName: "IX_Tramites_TramitadorId");

            migrationBuilder.AlterColumn<string>(
                name: "EstadoLogistico",
                table: "Tramites",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "PENDIENTE_TRAMITE",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValue: "COTIZACION");

            migrationBuilder.AddColumn<decimal>(
                name: "CargoExpress",
                table: "Tramites",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CobroTotal",
                table: "Tramites",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "DescripcionMercancia",
                table: "Tramites",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaEstadoActual",
                table: "Tramites",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Honorarios",
                table: "Tramites",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "TipoTramite",
                table: "Tramites",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "NORMAL");

            migrationBuilder.AddColumn<string>(
                name: "ComisionTipo",
                table: "Tramitadores",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "NA");

            migrationBuilder.AddColumn<decimal>(
                name: "ComisionValor",
                table: "Tramitadores",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CobroAdicional",
                table: "Pedimentos",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "MotivoRectificacion",
                table: "Pedimentos",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResponsableError",
                table: "Pedimentos",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "Pedimentos",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "ORIGINAL");

            migrationBuilder.AddColumn<string>(
                name: "EstadoAnterior",
                table: "Eventos",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EstadoNuevo",
                table: "Eventos",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PartnersExternos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Aliases = table.Column<string[]>(type: "text[]", nullable: false),
                    Tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "OTRO"),
                    Notas = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartnersExternos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PersonalCampo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Rol = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "ENTREGADOR"),
                    Telefono = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonalCampo", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Entregas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TramiteId = table.Column<Guid>(type: "uuid", nullable: false),
                    ResponsableCampoId = table.Column<Guid>(type: "uuid", nullable: true),
                    RecibidoPorPartnerId = table.Column<Guid>(type: "uuid", nullable: true),
                    Descripcion = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    UbicacionEntrega = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DocumentosEntregados = table.Column<string[]>(type: "text[]", nullable: false),
                    FechaEntrega = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreadoPor = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Entregas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Entregas_PartnersExternos_RecibidoPorPartnerId",
                        column: x => x.RecibidoPorPartnerId,
                        principalTable: "PartnersExternos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Entregas_PersonalCampo_ResponsableCampoId",
                        column: x => x.ResponsableCampoId,
                        principalTable: "PersonalCampo",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Entregas_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Entregas_Tramites_TramiteId",
                        column: x => x.TramiteId,
                        principalTable: "Tramites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tramites_TenantId_NumeroConsecutivo",
                table: "Tramites",
                columns: new[] { "TenantId", "NumeroConsecutivo" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Entregas_RecibidoPorPartnerId",
                table: "Entregas",
                column: "RecibidoPorPartnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Entregas_ResponsableCampoId",
                table: "Entregas",
                column: "ResponsableCampoId");

            migrationBuilder.CreateIndex(
                name: "IX_Entregas_TenantId",
                table: "Entregas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Entregas_TramiteId",
                table: "Entregas",
                column: "TramiteId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tramites_Tramitadores_TramitadorId",
                table: "Tramites",
                column: "TramitadorId",
                principalTable: "Tramitadores",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tramites_Tramitadores_TramitadorId",
                table: "Tramites");

            migrationBuilder.DropTable(
                name: "Entregas");

            migrationBuilder.DropTable(
                name: "PartnersExternos");

            migrationBuilder.DropTable(
                name: "PersonalCampo");

            migrationBuilder.DropIndex(
                name: "IX_Tramites_TenantId_NumeroConsecutivo",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "CargoExpress",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "CobroTotal",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "DescripcionMercancia",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "FechaEstadoActual",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "Honorarios",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "TipoTramite",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "ComisionTipo",
                table: "Tramitadores");

            migrationBuilder.DropColumn(
                name: "ComisionValor",
                table: "Tramitadores");

            migrationBuilder.DropColumn(
                name: "CobroAdicional",
                table: "Pedimentos");

            migrationBuilder.DropColumn(
                name: "MotivoRectificacion",
                table: "Pedimentos");

            migrationBuilder.DropColumn(
                name: "ResponsableError",
                table: "Pedimentos");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "Pedimentos");

            migrationBuilder.DropColumn(
                name: "EstadoAnterior",
                table: "Eventos");

            migrationBuilder.DropColumn(
                name: "EstadoNuevo",
                table: "Eventos");

            migrationBuilder.RenameColumn(
                name: "TramitadorId",
                table: "Tramites",
                newName: "FraccionId");

            migrationBuilder.RenameIndex(
                name: "IX_Tramites_TramitadorId",
                table: "Tramites",
                newName: "IX_Tramites_FraccionId");

            migrationBuilder.AlterColumn<string>(
                name: "EstadoLogistico",
                table: "Tramites",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "COTIZACION",
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30,
                oldDefaultValue: "PENDIENTE_TRAMITE");

            migrationBuilder.CreateIndex(
                name: "IX_Tramites_TenantId",
                table: "Tramites",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tramites_FraccionesArancelarias_FraccionId",
                table: "Tramites",
                column: "FraccionId",
                principalTable: "FraccionesArancelarias",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
