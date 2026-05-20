using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using RR.Infrastructure.Data;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260513233000_EnsureTramitesNumeroLegacyColumn")]
    public partial class EnsureTramitesNumeroLegacyColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Tramites"
                ADD COLUMN IF NOT EXISTS "NumeroLegacy" character varying(50);
                """);

            migrationBuilder.Sql("""
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Tramites_TenantId_NumeroLegacy"
                ON "Tramites" ("TenantId", "NumeroLegacy")
                WHERE "NumeroLegacy" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP INDEX IF EXISTS "IX_Tramites_TenantId_NumeroLegacy";
                """);

            migrationBuilder.Sql("""
                ALTER TABLE "Tramites"
                DROP COLUMN IF EXISTS "NumeroLegacy";
                """);
        }
    }
}
