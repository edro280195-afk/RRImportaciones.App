using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using RR.Infrastructure.Data;

#nullable disable

namespace RR.Migrations.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260515102000_AddPagoReciboFields")]
public partial class AddPagoReciboFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "FolioRecibo",
            table: "Pagos",
            type: "character varying(40)",
            maxLength: 40,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "ReciboGeneradoEn",
            table: "Pagos",
            type: "timestamp with time zone",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "ReciboPagoUrl",
            table: "Pagos",
            type: "character varying(500)",
            maxLength: 500,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "FolioRecibo",
            table: "Pagos");

        migrationBuilder.DropColumn(
            name: "ReciboGeneradoEn",
            table: "Pagos");

        migrationBuilder.DropColumn(
            name: "ReciboPagoUrl",
            table: "Pagos");
    }
}
