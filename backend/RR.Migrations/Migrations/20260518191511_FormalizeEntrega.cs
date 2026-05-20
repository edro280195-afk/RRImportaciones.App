using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class FormalizeEntrega : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FirmaBase64",
                table: "Entregas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FotoEvidenciaUrl",
                table: "Entregas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NombreRecibe",
                table: "Entregas",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirmaBase64",
                table: "Entregas");

            migrationBuilder.DropColumn(
                name: "FotoEvidenciaUrl",
                table: "Entregas");

            migrationBuilder.DropColumn(
                name: "NombreRecibe",
                table: "Entregas");
        }
    }
}
