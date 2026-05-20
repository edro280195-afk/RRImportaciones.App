using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddPagosGastosHormigaModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GastosHormiga_Tramites_TramiteId",
                table: "GastosHormiga");

            migrationBuilder.DropColumn(
                name: "Concepto",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "Proveedor",
                table: "GastosHormiga");

            migrationBuilder.RenameColumn(
                name: "FormaPago",
                table: "Pagos",
                newName: "Metodo");

            migrationBuilder.RenameColumn(
                name: "Descripcion",
                table: "GastosHormiga",
                newName: "Concepto");

            migrationBuilder.AlterColumn<decimal>(
                name: "Monto",
                table: "Pagos",
                type: "numeric(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AddColumn<string>(
                name: "Banco",
                table: "Pagos",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ComprobanteUrl",
                table: "Pagos",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Pagos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notas",
                table: "Pagos",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TipoCambio",
                table: "Pagos",
                type: "numeric(18,6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Verificado",
                table: "Pagos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "VerificadoEn",
                table: "Pagos",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "VerificadoPor",
                table: "Pagos",
                type: "uuid",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "TramiteId",
                table: "GastosHormiga",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<decimal>(
                name: "Monto",
                table: "GastosHormiga",
                type: "numeric(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AddColumn<Guid>(
                name: "ClienteId",
                table: "GastosHormiga",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "GastoUsd",
                table: "GastosHormiga",
                type: "numeric(18,6)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "SeCargaAlCliente",
                table: "GastosHormiga",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "VehiculoId",
                table: "GastosHormiga",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_GastosHormiga_ClienteId",
                table: "GastosHormiga",
                column: "ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_GastosHormiga_VehiculoId",
                table: "GastosHormiga",
                column: "VehiculoId");

            migrationBuilder.AddForeignKey(
                name: "FK_GastosHormiga_Clientes_ClienteId",
                table: "GastosHormiga",
                column: "ClienteId",
                principalTable: "Clientes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_GastosHormiga_Tramites_TramiteId",
                table: "GastosHormiga",
                column: "TramiteId",
                principalTable: "Tramites",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_GastosHormiga_Vehiculos_VehiculoId",
                table: "GastosHormiga",
                column: "VehiculoId",
                principalTable: "Vehiculos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GastosHormiga_Clientes_ClienteId",
                table: "GastosHormiga");

            migrationBuilder.DropForeignKey(
                name: "FK_GastosHormiga_Tramites_TramiteId",
                table: "GastosHormiga");

            migrationBuilder.DropForeignKey(
                name: "FK_GastosHormiga_Vehiculos_VehiculoId",
                table: "GastosHormiga");

            migrationBuilder.DropIndex(
                name: "IX_GastosHormiga_ClienteId",
                table: "GastosHormiga");

            migrationBuilder.DropIndex(
                name: "IX_GastosHormiga_VehiculoId",
                table: "GastosHormiga");

            migrationBuilder.DropColumn(
                name: "Banco",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "ComprobanteUrl",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "Notas",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "TipoCambio",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "Verificado",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "VerificadoEn",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "VerificadoPor",
                table: "Pagos");

            migrationBuilder.DropColumn(
                name: "ClienteId",
                table: "GastosHormiga");

            migrationBuilder.DropColumn(
                name: "GastoUsd",
                table: "GastosHormiga");

            migrationBuilder.DropColumn(
                name: "SeCargaAlCliente",
                table: "GastosHormiga");

            migrationBuilder.DropColumn(
                name: "VehiculoId",
                table: "GastosHormiga");

            migrationBuilder.RenameColumn(
                name: "Metodo",
                table: "Pagos",
                newName: "FormaPago");

            migrationBuilder.RenameColumn(
                name: "Concepto",
                table: "GastosHormiga",
                newName: "Descripcion");

            migrationBuilder.AlterColumn<decimal>(
                name: "Monto",
                table: "Pagos",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)");

            migrationBuilder.AddColumn<string>(
                name: "Concepto",
                table: "Pagos",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "TramiteId",
                table: "GastosHormiga",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Monto",
                table: "GastosHormiga",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)");

            migrationBuilder.AddColumn<string>(
                name: "Proveedor",
                table: "GastosHormiga",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_GastosHormiga_Tramites_TramiteId",
                table: "GastosHormiga",
                column: "TramiteId",
                principalTable: "Tramites",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
