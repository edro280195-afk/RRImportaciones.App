using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddImportadorNumeroLegacy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NumeroLegacy",
                table: "Tramites",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tramites_TenantId_NumeroLegacy",
                table: "Tramites",
                columns: new[] { "TenantId", "NumeroLegacy" },
                unique: true,
                filter: "\"NumeroLegacy\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tramites_TenantId_NumeroLegacy",
                table: "Tramites");

            migrationBuilder.DropColumn(
                name: "NumeroLegacy",
                table: "Tramites");
        }
    }
}
