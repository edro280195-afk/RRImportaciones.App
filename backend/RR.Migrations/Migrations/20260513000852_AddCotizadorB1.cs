using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class AddCotizadorB1 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PreciosEstimados_FraccionId_Anno",
                table: "PreciosEstimados");

            migrationBuilder.DropIndex(
                name: "IX_ParametrosFiscales_Regimen",
                table: "ParametrosFiscales");

            migrationBuilder.AlterColumn<int>(
                name: "Anno",
                table: "PreciosEstimados",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "Categoria",
                table: "PreciosEstimados",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "EsGenerico",
                table: "PreciosEstimados",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "HojaOrigen",
                table: "PreciosEstimados",
                type: "character varying(80)",
                maxLength: 80,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Inciso",
                table: "PreciosEstimados",
                type: "character varying(5)",
                maxLength: 5,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MarcaId",
                table: "PreciosEstimados",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MarcaTexto",
                table: "PreciosEstimados",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Modelo",
                table: "PreciosEstimados",
                type: "character varying(250)",
                maxLength: 250,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<decimal>(
                name: "PrvFijo",
                table: "ParametrosFiscales",
                type: "numeric(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "PrevFijo",
                table: "ParametrosFiscales",
                type: "numeric(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Iva",
                table: "ParametrosFiscales",
                type: "numeric(9,6)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric");

            migrationBuilder.AlterColumn<decimal>(
                name: "Igi",
                table: "ParametrosFiscales",
                type: "numeric(9,6)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DtaFijo",
                table: "ParametrosFiscales",
                type: "numeric(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Dta",
                table: "ParametrosFiscales",
                type: "numeric(9,6)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "VigenteDesde",
                table: "ParametrosFiscales",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "VigenteHasta",
                table: "ParametrosFiscales",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "ParametrosFiscales"
                SET "Igi" = 0.10,
                    "Dta" = 0.008,
                    "Iva" = 0.16,
                    "PrevFijo" = COALESCE("PrevFijo", 0),
                    "PrvFijo" = COALESCE("PrvFijo", 0),
                    "VigenteDesde" = TIMESTAMPTZ '2026-01-01 00:00:00+00',
                    "Activo" = TRUE
                WHERE "Regimen" = 'POST_2017';

                UPDATE "ParametrosFiscales"
                SET "Igi" = 0.50,
                    "DtaFijo" = 408,
                    "Iva" = 0.16,
                    "PrevFijo" = 240,
                    "PrvFijo" = 290,
                    "VigenteDesde" = TIMESTAMPTZ '2026-01-01 00:00:00+00',
                    "Activo" = TRUE
                WHERE "Regimen" = 'PRE_2016';
                """);

            migrationBuilder.AddColumn<int>(
                name: "AnnoModelo",
                table: "Cotizaciones",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CargoExpress",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Categoria",
                table: "Cotizaciones",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CilindradaCm3",
                table: "Cotizaciones",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Dta",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnviadoA",
                table: "Cotizaciones",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EnviadoPor",
                table: "Cotizaciones",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaEnvio",
                table: "Cotizaciones",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "FechaExpiracion",
                table: "Cotizaciones",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Fraccion",
                table: "Cotizaciones",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FuentePrecio",
                table: "Cotizaciones",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Igi",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "IgiPorcentaje",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Iva",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "MarcaId",
                table: "Cotizaciones",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MarcaTexto",
                table: "Cotizaciones",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Modelo",
                table: "Cotizaciones",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MotivoRechazo",
                table: "Cotizaciones",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Prev",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Prv",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RegimenFiscal",
                table: "Cotizaciones",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TipoCambioAplicado",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TipoCambioReferencia",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorAduanaUsd",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ValorPesos",
                table: "Cotizaciones",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Vin",
                table: "Cotizaciones",
                type: "character varying(17)",
                maxLength: 17,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "HonorariosConfig",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TipoMercancia = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Regimen = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Monto = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HonorariosConfig", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NhtsaCache",
                columns: table => new
                {
                    Vin = table.Column<string>(type: "character varying(17)", maxLength: 17, nullable: false),
                    ResponseJson = table.Column<string>(type: "jsonb", nullable: false),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NhtsaCache", x => x.Vin);
                });

            migrationBuilder.CreateTable(
                name: "PreciosPorAntiguedad",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PrecioEstimadoId = table.Column<Guid>(type: "uuid", nullable: false),
                    AntiguedadAnios = table.Column<int>(type: "integer", nullable: false),
                    PrecioUsd = table.Column<decimal>(type: "numeric(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PreciosPorAntiguedad", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PreciosPorAntiguedad_PreciosEstimados_PrecioEstimadoId",
                        column: x => x.PrecioEstimadoId,
                        principalTable: "PreciosEstimados",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TabuladoresAmparo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AnnoModelo = table.Column<int>(type: "integer", nullable: false),
                    Categoria = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PrecioMxn = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    Notas = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TabuladoresAmparo", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TiposCambioCache",
                columns: table => new
                {
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    Tc = table.Column<decimal>(type: "numeric(18,6)", nullable: false),
                    Fuente = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    FetchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TiposCambioCache", x => x.Fecha);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PreciosEstimados_FraccionId_EsGenerico",
                table: "PreciosEstimados",
                columns: new[] { "FraccionId", "EsGenerico" });

            migrationBuilder.CreateIndex(
                name: "IX_PreciosEstimados_FraccionId_MarcaId_Modelo",
                table: "PreciosEstimados",
                columns: new[] { "FraccionId", "MarcaId", "Modelo" });

            migrationBuilder.CreateIndex(
                name: "IX_PreciosEstimados_MarcaId",
                table: "PreciosEstimados",
                column: "MarcaId");

            migrationBuilder.CreateIndex(
                name: "IX_ParametrosFiscales_Regimen_Activo",
                table: "ParametrosFiscales",
                columns: new[] { "Regimen", "Activo" });

            migrationBuilder.CreateIndex(
                name: "IX_Cotizaciones_MarcaId",
                table: "Cotizaciones",
                column: "MarcaId");

            migrationBuilder.CreateIndex(
                name: "IX_HonorariosConfig_TipoMercancia_Regimen_Activo",
                table: "HonorariosConfig",
                columns: new[] { "TipoMercancia", "Regimen", "Activo" });

            migrationBuilder.CreateIndex(
                name: "IX_PreciosPorAntiguedad_PrecioEstimadoId_AntiguedadAnios",
                table: "PreciosPorAntiguedad",
                columns: new[] { "PrecioEstimadoId", "AntiguedadAnios" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TabuladoresAmparo_AnnoModelo_Categoria",
                table: "TabuladoresAmparo",
                columns: new[] { "AnnoModelo", "Categoria" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Cotizaciones_Marcas_MarcaId",
                table: "Cotizaciones",
                column: "MarcaId",
                principalTable: "Marcas",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PreciosEstimados_Marcas_MarcaId",
                table: "PreciosEstimados",
                column: "MarcaId",
                principalTable: "Marcas",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Cotizaciones_Marcas_MarcaId",
                table: "Cotizaciones");

            migrationBuilder.DropForeignKey(
                name: "FK_PreciosEstimados_Marcas_MarcaId",
                table: "PreciosEstimados");

            migrationBuilder.DropTable(
                name: "HonorariosConfig");

            migrationBuilder.DropTable(
                name: "NhtsaCache");

            migrationBuilder.DropTable(
                name: "PreciosPorAntiguedad");

            migrationBuilder.DropTable(
                name: "TabuladoresAmparo");

            migrationBuilder.DropTable(
                name: "TiposCambioCache");

            migrationBuilder.DropIndex(
                name: "IX_PreciosEstimados_FraccionId_EsGenerico",
                table: "PreciosEstimados");

            migrationBuilder.DropIndex(
                name: "IX_PreciosEstimados_FraccionId_MarcaId_Modelo",
                table: "PreciosEstimados");

            migrationBuilder.DropIndex(
                name: "IX_PreciosEstimados_MarcaId",
                table: "PreciosEstimados");

            migrationBuilder.DropIndex(
                name: "IX_ParametrosFiscales_Regimen_Activo",
                table: "ParametrosFiscales");

            migrationBuilder.DropIndex(
                name: "IX_Cotizaciones_MarcaId",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Categoria",
                table: "PreciosEstimados");

            migrationBuilder.DropColumn(
                name: "EsGenerico",
                table: "PreciosEstimados");

            migrationBuilder.DropColumn(
                name: "HojaOrigen",
                table: "PreciosEstimados");

            migrationBuilder.DropColumn(
                name: "Inciso",
                table: "PreciosEstimados");

            migrationBuilder.DropColumn(
                name: "MarcaId",
                table: "PreciosEstimados");

            migrationBuilder.DropColumn(
                name: "MarcaTexto",
                table: "PreciosEstimados");

            migrationBuilder.DropColumn(
                name: "Modelo",
                table: "PreciosEstimados");

            migrationBuilder.DropColumn(
                name: "VigenteDesde",
                table: "ParametrosFiscales");

            migrationBuilder.DropColumn(
                name: "VigenteHasta",
                table: "ParametrosFiscales");

            migrationBuilder.DropColumn(
                name: "AnnoModelo",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "CargoExpress",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Categoria",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "CilindradaCm3",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Dta",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "EnviadoA",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "EnviadoPor",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "FechaEnvio",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "FechaExpiracion",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Fraccion",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "FuentePrecio",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Igi",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "IgiPorcentaje",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Iva",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "MarcaId",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "MarcaTexto",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Modelo",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "MotivoRechazo",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Prev",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Prv",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "RegimenFiscal",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "TipoCambioAplicado",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "TipoCambioReferencia",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "ValorAduanaUsd",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "ValorPesos",
                table: "Cotizaciones");

            migrationBuilder.DropColumn(
                name: "Vin",
                table: "Cotizaciones");

            migrationBuilder.AlterColumn<int>(
                name: "Anno",
                table: "PreciosEstimados",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "PrvFijo",
                table: "ParametrosFiscales",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "PrevFijo",
                table: "ParametrosFiscales",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Iva",
                table: "ParametrosFiscales",
                type: "numeric",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "numeric(9,6)");

            migrationBuilder.AlterColumn<decimal>(
                name: "Igi",
                table: "ParametrosFiscales",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(9,6)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "DtaFijo",
                table: "ParametrosFiscales",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Dta",
                table: "ParametrosFiscales",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(9,6)",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PreciosEstimados_FraccionId_Anno",
                table: "PreciosEstimados",
                columns: new[] { "FraccionId", "Anno" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ParametrosFiscales_Regimen",
                table: "ParametrosFiscales",
                column: "Regimen",
                unique: true);
        }
    }
}
