using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddCotizacionTramiteIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CotizacionOrigenId",
                table: "Tramites",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tramites_CotizacionOrigenId",
                table: "Tramites",
                column: "CotizacionOrigenId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tramites_Cotizaciones_CotizacionOrigenId",
                table: "Tramites",
                column: "CotizacionOrigenId",
                principalTable: "Cotizaciones",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tramites_Cotizaciones_CotizacionOrigenId",
                table: "Tramites");

            migrationBuilder.DropIndex(
                name: "IX_Tramites_CotizacionOrigenId",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "CotizacionOrigenId",
                table: "Tramites");
        }
    }
}
