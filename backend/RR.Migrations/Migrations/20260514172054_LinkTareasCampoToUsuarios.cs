using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class LinkTareasCampoToUsuarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_TareasCampo_TomadaPorUsuarioId",
                table: "TareasCampo",
                column: "TomadaPorUsuarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_TareasCampo_Usuarios_TomadaPorUsuarioId",
                table: "TareasCampo",
                column: "TomadaPorUsuarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TareasCampo_Usuarios_TomadaPorUsuarioId",
                table: "TareasCampo");

            migrationBuilder.DropIndex(
                name: "IX_TareasCampo_TomadaPorUsuarioId",
                table: "TareasCampo");
        }
    }
}
