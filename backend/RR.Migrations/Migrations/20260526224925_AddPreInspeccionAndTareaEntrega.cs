using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddPreInspeccionAndTareaEntrega : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TareasCampo_Tramites_TramiteId",
                table: "TareasCampo");

            migrationBuilder.AlterColumn<Guid>(
                name: "TramiteId",
                table: "TareasCampo",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "ClienteNombreLibre",
                table: "TareasCampo",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DescripcionVehiculo",
                table: "TareasCampo",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TareasEntrega",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    TramiteId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChoferUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    Estado = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "PENDIENTE"),
                    FotosUrls = table.Column<string[]>(type: "text[]", nullable: false),
                    UbicacionEntrega = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    NombreRecibe = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FirmaBase64 = table.Column<string>(type: "text", nullable: true),
                    Incidencia = table.Column<string>(type: "character varying(700)", maxLength: 700, nullable: true),
                    NotasChofer = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    FechaCreacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    FechaTomada = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FechaEntregado = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreadoPor = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TareasEntrega", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TareasEntrega_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TareasEntrega_Tramites_TramiteId",
                        column: x => x.TramiteId,
                        principalTable: "Tramites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_TareasEntrega_Usuarios_ChoferUserId",
                        column: x => x.ChoferUserId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TareasEntrega_ChoferUserId",
                table: "TareasEntrega",
                column: "ChoferUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TareasEntrega_TenantId",
                table: "TareasEntrega",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_TareasEntrega_TramiteId_Estado",
                table: "TareasEntrega",
                columns: new[] { "TramiteId", "Estado" });

            migrationBuilder.AddForeignKey(
                name: "FK_TareasCampo_Tramites_TramiteId",
                table: "TareasCampo",
                column: "TramiteId",
                principalTable: "Tramites",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TareasCampo_Tramites_TramiteId",
                table: "TareasCampo");

            migrationBuilder.DropTable(
                name: "TareasEntrega");

            migrationBuilder.DropColumn(
                name: "ClienteNombreLibre",
                table: "TareasCampo");

            migrationBuilder.DropColumn(
                name: "DescripcionVehiculo",
                table: "TareasCampo");

            migrationBuilder.AlterColumn<Guid>(
                name: "TramiteId",
                table: "TareasCampo",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TareasCampo_Tramites_TramiteId",
                table: "TareasCampo",
                column: "TramiteId",
                principalTable: "Tramites",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
