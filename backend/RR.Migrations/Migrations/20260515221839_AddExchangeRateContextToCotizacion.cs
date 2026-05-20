using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddExchangeRateContextToCotizacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TipoCambioContexto",
                table: "Cotizaciones",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TipoCambioNota",
                table: "Cotizaciones",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TipoCambioContexto",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "TipoCambioNota",
                table: "Cotizaciones");
        }
    }
}
