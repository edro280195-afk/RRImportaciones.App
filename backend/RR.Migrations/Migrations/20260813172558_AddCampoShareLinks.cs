using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddCampoShareLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ShareTokenExpira",
                table: "TareasCampo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShareTokenHash",
                table: "TareasCampo",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ShareTokenRevocadoAt",
                table: "TareasCampo",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TareasCampo_ShareTokenHash",
                table: "TareasCampo",
                column: "ShareTokenHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TareasCampo_ShareTokenHash",
                table: "TareasCampo");

            migrationBuilder.DropColumn(
                name: "ShareTokenExpira",
                table: "TareasCampo");

            migrationBuilder.DropColumn(
                name: "ShareTokenHash",
                table: "TareasCampo");

            migrationBuilder.DropColumn(
                name: "ShareTokenRevocadoAt",
                table: "TareasCampo");
        }
    }
}
