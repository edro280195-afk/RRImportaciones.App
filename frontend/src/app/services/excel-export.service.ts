import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import type {
  ReporteFinancieroDto,
  ReportePipelineDto,
  ReporteProductividadDto,
  GastoHormigaResumenDto,
  ConversionCotizacionesDto,
} from './reporte.service';

@Injectable({ providedIn: 'root' })
export class ExcelExportService {

  private readonly MXN = '"$"#,##0.00';
  private readonly NUM = '#,##0';
  private readonly PCT = '0.00"%"';

  // ─────────────────────────────────────────────────────────────────────
  // FINANCIERO
  // ─────────────────────────────────────────────────────────────────────
  exportFinanciero(data: ReporteFinancieroDto, desde: string, hasta: string): void {
    const wb = XLSX.utils.book_new();

    // Hoja 1 — KPIs
    const kpis: unknown[][] = [
      ['R&R Importaciones — Reporte Financiero'],
      [`Período: ${this.fmtDate(desde)} al ${this.fmtDate(hasta)}`],
      [`Generado: ${new Date().toLocaleDateString('es-MX')}`],
      [],
      ['Indicador', 'Valor'],
      ['Cobrado Total (verificado)',         data.cobradoTotal],
      ['Por Cobrar',                         data.porCobrarTotal],
      ['Gastos Hormiga Total',               data.gastosHormigaTotal],
      ['Gastos Cargables al Cliente',        data.gastosCargablesTotal],
      ['Margen Bruto',                       data.margenBruto],
      ['Trámites Cerrados en Período',       data.tramitesCerradosPeriodo],
      ['Trámites Activos Actualmente',       data.tramitesActivosActual],
      ['Pagos Pendientes Verificación (qty)',data.pagosPendientesVerificacion],
      ['Pagos Pendientes Verificación ($)',  data.pagosPendientesVerificacionMonto],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(kpis);
    ws1['!cols'] = [{ wch: 38 }, { wch: 22 }];
    ['B6','B7','B8','B9','B10','B14'].forEach(r => { if (ws1[r]) ws1[r].z = this.MXN; });

    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen KPIs');

    // Hoja 2 — Evolución mensual
    const evHeader = ['Año', 'Mes #', 'Mes', 'Cobrado Verificado'];
    const evRows   = data.evolucionMensual.map(m => [m.anno, m.mes, m.mesNombre, m.cobradoVerificado]);
    const ws2 = XLSX.utils.aoa_to_sheet([evHeader, ...evRows]);
    ws2['!cols'] = [{ wch: 8 }, { wch: 8 }, { wch: 16 }, { wch: 24 }];
    evRows.forEach((_, i) => { const r = `D${i + 2}`; if (ws2[r]) ws2[r].z = this.MXN; });
    XLSX.utils.book_append_sheet(wb, ws2, 'Evolución Mensual');

    // Hoja 3 — Gastos por categoría
    if (data.gastosPorCategoria?.length) {
      const gcHeader = ['Categoría', 'Transacciones', 'Total'];
      const gcRows   = data.gastosPorCategoria.map(c => [c.categoria, c.cantidad, c.total]);
      const ws3 = XLSX.utils.aoa_to_sheet([gcHeader, ...gcRows]);
      ws3['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 20 }];
      gcRows.forEach((_, i) => { const r = `C${i + 2}`; if (ws3[r]) ws3[r].z = this.MXN; });
      XLSX.utils.book_append_sheet(wb, ws3, 'Gastos Categoría');
    }

    XLSX.writeFile(wb, `RR_Financiero_${desde}_${hasta}.xlsx`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // PIPELINE
  // ─────────────────────────────────────────────────────────────────────
  exportPipeline(data: ReportePipelineDto): void {
    const wb = XLSX.utils.book_new();

    const rows: unknown[][] = [
      ['R&R Importaciones — Reporte Pipeline (Trámites Activos)'],
      [`Generado: ${new Date().toLocaleDateString('es-MX')}`],
      [],
      ['Total Trámites Activos', data.totalActivos],
      [],
      ['Estado Interno', 'Etiqueta', 'Cantidad', 'Monto Total', 'Días Prom. en Estado'],
      ...data.estados.map(e => [
        e.estado,
        e.etiquetaCliente,
        e.cantidad,
        e.montoTotal,
        +e.diasPromedioEnEstado.toFixed(1),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 26 }, { wch: 12 }, { wch: 20 }, { wch: 22 }];
    data.estados.forEach((_, i) => { const r = `D${i + 7}`; if (ws[r]) ws[r].z = this.MXN; });

    XLSX.utils.book_append_sheet(wb, ws, 'Pipeline');
    XLSX.writeFile(wb, `RR_Pipeline_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // PRODUCTIVIDAD
  // ─────────────────────────────────────────────────────────────────────
  exportProductividad(data: ReporteProductividadDto, desde: string, hasta: string): void {
    const wb = XLSX.utils.book_new();

    const rows: unknown[][] = [
      ['R&R Importaciones — Productividad por Tramitador'],
      [`Período: ${this.fmtDate(desde)} al ${this.fmtDate(hasta)}`],
      [`Generado: ${new Date().toLocaleDateString('es-MX')}`],
      [],
      ['Tramitador', 'Activos', 'Cerrados (período)', 'Cobrado Total', 'Cobrado Verificado', 'Días Prom. Resolución'],
      ...data.tramitadores.map(t => [
        t.nombre,
        t.tramitesActivos,
        t.tramitesCerradosPeriodo,
        t.montoTotalCobrado,
        t.montoTotalVerificado,
        +t.diasPromedioResolucion.toFixed(1),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 22 }];
    data.tramitadores.forEach((_, i) => {
      ['D', 'E'].forEach(col => { const r = `${col}${i + 6}`; if (ws[r]) ws[r].z = this.MXN; });
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Productividad');
    XLSX.writeFile(wb, `RR_Productividad_${desde}_${hasta}.xlsx`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // GASTOS
  // ─────────────────────────────────────────────────────────────────────
  exportGastos(data: GastoHormigaResumenDto, desde: string, hasta: string): void {
    const wb = XLSX.utils.book_new();

    const rows: unknown[][] = [
      ['R&R Importaciones — Gastos Hormiga'],
      [`Período: ${this.fmtDate(desde)} al ${this.fmtDate(hasta)}`],
      [`Generado: ${new Date().toLocaleDateString('es-MX')}`],
      [],
      ['Indicador', 'Monto'],
      ['Gasto Total del Período', data.totalPeriodo],
      ['Cargable al Cliente',     data.totalCargableCliente],
      ['Costo Propio',            data.totalCostoPropio],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
    ['B6', 'B7', 'B8'].forEach(r => { if (ws1[r]) ws1[r].z = this.MXN; });
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

    // Hoja 2 — Por categoría
    const catH = ['Categoría', 'Transacciones', 'Total'];
    const catR = data.porCategoria.map(c => [c.categoria, c.cantidad, c.total]);
    const ws2 = XLSX.utils.aoa_to_sheet([catH, ...catR]);
    ws2['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }];
    catR.forEach((_, i) => { const r = `C${i + 2}`; if (ws2[r]) ws2[r].z = this.MXN; });
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Categoría');

    // Hoja 3 — Por cliente
    if (data.porCliente?.length) {
      const cliH = ['Cliente', 'Transacciones', 'Total'];
      const cliR = data.porCliente.map(c => [c.cliente, c.cantidad, c.total]);
      const ws3 = XLSX.utils.aoa_to_sheet([cliH, ...cliR]);
      ws3['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 18 }];
      cliR.forEach((_, i) => { const r = `C${i + 2}`; if (ws3[r]) ws3[r].z = this.MXN; });
      XLSX.utils.book_append_sheet(wb, ws3, 'Por Cliente');
    }

    XLSX.writeFile(wb, `RR_Gastos_${desde}_${hasta}.xlsx`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // COTIZACIONES
  // ─────────────────────────────────────────────────────────────────────
  exportCotizaciones(data: ConversionCotizacionesDto, desde: string, hasta: string): void {
    const wb = XLSX.utils.book_new();

    const rows: unknown[][] = [
      ['R&R Importaciones — Conversión de Cotizaciones'],
      [`Período: ${this.fmtDate(desde)} al ${this.fmtDate(hasta)}`],
      [`Generado: ${new Date().toLocaleDateString('es-MX')}`],
      [],
      ['Indicador', 'Valor'],
      ['Total Emitidas',                       data.totalEmitidas],
      ['Aceptadas',                            data.totalAceptadas],
      ['Rechazadas',                           data.totalRechazadas],
      ['Expiradas',                            data.totalExpiradas],
      ['Tasa de Conversión (%)',               +(data.tasaConversionGlobal).toFixed(2)],
      ['Tiempo Promedio Aceptación (días)',     +(data.tiempoPromedioAceptacionDias ?? 0).toFixed(1)],
      [],
      ['TOP CLIENTES POR COTIZACIONES'],
      ['Cliente', 'Total Cotizaciones'],
      ...data.topClientes.map(c => [c.cliente, c.totalCotizaciones]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 38 }, { wch: 20 }];
    if (ws['B10']) ws['B10'].z = this.PCT;

    XLSX.utils.book_append_sheet(wb, ws, 'Cotizaciones');
    XLSX.writeFile(wb, `RR_Cotizaciones_${desde}_${hasta}.xlsx`);
  }

  // ─────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────
  private fmtDate(dateStr: string): string {
    if (!dateStr) return '—';
    const [y, m, d] = dateStr.split('-');
    const meses = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d}/${meses[+m]}/${y}`;
  }
}
