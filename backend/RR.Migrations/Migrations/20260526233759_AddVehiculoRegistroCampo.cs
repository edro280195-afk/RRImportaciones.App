using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddVehiculoRegistroCampo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "ClienteId",
                table: "Vehiculos",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "Estado",
                table: "Vehiculos",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "PENDIENTE_DE_TRAMITE");

            migrationBuilder.AddColumn<string[]>(
                name: "FotosUrls",
                table: "Vehiculos",
                type: "text[]",
                nullable: false,
                defaultValue: new string[0]);

            migrationBuilder.AddColumn<Guid>(
                name: "VehiculoId",
                table: "TareasCampo",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampo_VehiculoId",
                table: "TareasCampo",
                column: "VehiculoId");

            migrationBuilder.AddForeignKey(
                name: "FK_TareasCampo_Vehiculos_VehiculoId",
                table: "TareasCampo",
                column: "VehiculoId",
                principalTable: "Vehiculos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TareasCampo_Vehiculos_VehiculoId",
                table: "TareasCampo");

            migrationBuilder.DropIndex(
                name: "IX_TareasCampo_VehiculoId",
                table: "TareasCampo");

            migrationBuilder.DropColumn(
                name: "Estado",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "FotosUrls",
                table: "Vehiculos");

            migrationBuilder.DropColumn(
                name: "VehiculoId",
                table: "TareasCampo");

            migrationBuilder.AlterColumn<Guid>(
                name: "ClienteId",
                table: "Vehiculos",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
