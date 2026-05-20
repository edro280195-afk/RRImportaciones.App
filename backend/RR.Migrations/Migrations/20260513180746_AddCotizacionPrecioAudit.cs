using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddCotizacionPrecioAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrecioAdvertencia",
                table: "Cotizaciones",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrecioAntiguedadAnios",
                table: "Cotizaciones",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrecioCatalogoMarca",
                table: "Cotizaciones",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrecioCatalogoModelo",
                table: "Cotizaciones",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrecioCatalogoOrigen",
                table: "Cotizaciones",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrecioMatchScore",
                table: "Cotizaciones",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrecioMatchTipo",
                table: "Cotizaciones",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PrecioAdvertencia",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "PrecioAntiguedadAnios",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "PrecioCatalogoMarca",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "PrecioCatalogoModelo",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "PrecioCatalogoOrigen",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "PrecioMatchScore",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "PrecioMatchTipo",
                table: "Cotizaciones");
        }
    }
}
