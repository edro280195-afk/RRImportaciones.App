using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddEntregaAccessLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "EnlaceTokenExpira",
                table: "TareasEntrega",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnlaceTokenHash",
                table: "TareasEntrega",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EnlaceTokenRevocadoAt",
                table: "TareasEntrega",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TareasEntrega_EnlaceTokenHash",
                table: "TareasEntrega",
                column: "EnlaceTokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TareasEntrega_EnlaceTokenHash",
                table: "TareasEntrega");

            migrationBuilder.DropColumn(
                name: "EnlaceTokenExpira",
                table: "TareasEntrega");

            migrationBuilder.DropColumn(
                name: "EnlaceTokenHash",
                table: "TareasEntrega");

            migrationBuilder.DropColumn(
                name: "EnlaceTokenRevocadoAt",
                table: "TareasEntrega");
        }
    }
}
