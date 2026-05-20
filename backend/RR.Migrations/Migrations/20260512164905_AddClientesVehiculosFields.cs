using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddClientesVehiculosFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehiculos_TenantId",
                table: "Vehiculos");

            migrationBuilder.DropIndex(
                name: "IX_Clientes_TenantId",
                table: "Clientes");

            migrationBuilder.AlterColumn<Guid>(
                name: "ClienteId",
                table: "Vehiculos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Categoria",
                table: "Vehiculos",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CilindradaCm3",
                table: "Vehiculos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "CumplioRequisitos",
                table: "Vehiculos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Vehiculos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaIngresoPatio",
                table: "Vehiculos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaPedimentoProforma",
                table: "Vehiculos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FraccionArancelariaId",
                table: "Vehiculos",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "TieneSelloAduanal",
                table: "Vehiculos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "UbicacionActual",
                table: "Vehiculos",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VinCorto",
                table: "Vehiculos",
                type: "character varying(6)",
                maxLength: 6,
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "Aliases",
                table: "Marcas",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.AddColumn<string>(
                name: "Apodo",
                table: "Clientes",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Clientes",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NombreCompleto",
                table: "Clientes",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notas",
                table: "Clientes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Procedencia",
                table: "Clientes",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Vehiculos_FraccionArancelariaId",
                table: "Vehiculos",
                column: "FraccionArancelariaId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehiculos_TenantId_Vin",
                table: "Vehiculos",
                columns: new[] { "TenantId", "Vin" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_TenantId_Apodo",
                table: "Clientes",
                columns: new[] { "TenantId", "Apodo" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Vehiculos_FraccionesArancelarias_FraccionArancelariaId",
                table: "Vehiculos",
                column: "FraccionArancelariaId",
                principalTable: "FraccionesArancelarias",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vehiculos_FraccionesArancelarias_FraccionArancelariaId",
                table: "Vehiculos");

            migrationBuilder.DropIndex(
                name: "IX_Vehiculos_FraccionArancelariaId",
                table: "Vehiculos");

            migrationBuilder.DropIndex(
                name: "IX_Vehiculos_TenantId_Vin",
                table: "Vehiculos");

            migrationBuilder.DropIndex(
                name: "IX_Clientes_TenantId_Apodo",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "Categoria",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "CilindradaCm3",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "CumplioRequisitos",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "FechaIngresoPatio",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "FechaPedimentoProforma",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "FraccionArancelariaId",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "TieneSelloAduanal",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "UbicacionActual",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "VinCorto",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "Aliases",
                table: "Marcas");

            migrationBuilder.DropColumn(
                name: "Apodo",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "NombreCompleto",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "Notas",
                table: "Clientes");

            migrationBuilder.DropColumn(
                name: "Procedencia",
                table: "Clientes");

            migrationBuilder.AlterColumn<Guid>(
                name: "ClienteId",
                table: "Vehiculos",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateIndex(
                name: "IX_Vehiculos_TenantId",
                table: "Vehiculos",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Clientes_TenantId",
                table: "Clientes",
                column: "TenantId");
        }
    }
}
