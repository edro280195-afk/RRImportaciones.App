using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RR.Migrations.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeCampoIncidenciaStatuses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Las incidencias de campo son informativas y no representan una tarea pendiente.
            // El reporte permanece en Incidencia; solo se normaliza el estado operativo.
            migrationBuilder.Sql("""
                UPDATE "TareasCampo"
                SET "EstadoLogistico" = 'COMPLETADA'
                WHERE "EstadoLogistico" = 'INCIDENCIA';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No se revierte: no es posible distinguir de forma segura los registros
            // normalizados por esta migración de los completados posteriormente.
        }
    }
}
