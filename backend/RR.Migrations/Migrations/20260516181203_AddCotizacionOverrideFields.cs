using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddCotizacionOverrideFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CategoriaAmparoSeleccionada",
                table: "Cotizaciones",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PrecioEstimadoSeleccionadoId",
                table: "Cotizaciones",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CategoriaAmparoSeleccionada",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "PrecioEstimadoSeleccionadoId",
                table: "Cotizaciones");
        }
    }
}
