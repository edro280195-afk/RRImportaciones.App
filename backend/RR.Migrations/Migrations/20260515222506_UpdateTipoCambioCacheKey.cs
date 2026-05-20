using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class UpdateTipoCambioCacheKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_TiposCambioCache",
                table: "TiposCambioCache");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TiposCambioCache",
                table: "TiposCambioCache",
                columns: new[] { "Fecha", "Fuente" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_TiposCambioCache",
                table: "TiposCambioCache");

            migrationBuilder.AddPrimaryKey(
                name: "PK_TiposCambioCache",
                table: "TiposCambioCache",
                column: "Fecha");
        }
    }
}
