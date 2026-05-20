using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddPinToUsuarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PinHash",
                table: "Usuarios",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PinSalt",
                table: "Usuarios",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PinHash",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "PinSalt",
                table: "Usuarios");
        }
    }
}
