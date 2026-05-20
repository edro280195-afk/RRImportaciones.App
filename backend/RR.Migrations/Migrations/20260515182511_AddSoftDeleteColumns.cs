using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    public partial class AddSoftDeleteColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "GastosHormiga",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "GastosHormiga");
        }
    }
}
