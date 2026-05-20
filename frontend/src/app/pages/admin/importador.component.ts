import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminImportadorService, ImportResultDto } from '../../services/admin-importador.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-importador',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="font-family: var(--font-body);">
      <div class="mb-6">
        <p class="text-[11px] font-semibold uppercase tracking-[1px] text-[#9EA3AE] mb-1">Admin</p>
        <h1 class="text-[26px] font-semibold text-[#0D1017] tracking-[-0.6px]">Importador histórico</h1>
      </div>

      <div class="card-elevated rounded-2xl p-6 mb-5">
        <label class="block text-[12px] font-semibold text-[#1E2330] mb-2">Archivo Excel</label>
        <input type="file" accept=".xlsx" (change)="onFile($event)" class="block w-full text-[13px] mb-4">
        <div class="flex gap-2">
          <button (click)="validar()" [disabled]="!file || loading" class="px-4 py-2 rounded-xl bg-[#F3F4F6] border border-[#E4E7EC] text-[13px]">Validar</button>
          <button (click)="importar()" [disabled]="!file || loading" class="px-4 py-2 rounded-xl bg-[#0D1017] text-white text-[13px]">Importar</button>
        </div>
      </div>

      @if (result) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div class="card-elevated rounded-xl p-4"><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Detectados</p><p class="text-[24px] font-semibold">{{ result.registrosDetectados }}</p></div>
          <div class="card-elevated rounded-xl p-4"><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Insertados</p><p class="text-[24px] font-semibold">{{ result.insertados }}</p></div>
          <div class="card-elevated rounded-xl p-4"><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Saltados</p><p class="text-[24px] font-semibold">{{ result.saltados }}</p></div>
          <div class="card-elevated rounded-xl p-4"><p class="text-[11px] text-[#9EA3AE] uppercase font-semibold">Rechazados</p><p class="text-[24px] font-semibold text-[#C61D26]">{{ result.rechazados }}</p></div>
        </div>

        <div class="card-elevated rounded-2xl p-5">
          <p class="text-[13px] font-semibold mb-3">Log</p>
          <pre class="text-[12px] leading-5 whitespace-pre-wrap bg-[#0D1017] text-white rounded-xl p-4 max-h-[420px] overflow-auto">{{ logText() }}</pre>
        </div>
      }
    </div>
  `,
})
export class ImportadorComponent {
  private importador = inject(AdminImportadorService);
  private notifications = inject(NotificationService);
  file: File | null = null;
  result: ImportResultDto | null = null;
  loading = false;

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.result = null;
  }

  validar(): void {
    if (!this.file) return;
    this.loading = true;
    this.importador.validar(this.file).subscribe({
      next: r => {
        this.result = r;
        this.loading = false;
        this.notifications.success('Validacion terminada.');
      },
      error: err => {
        this.loading = false;
        this.notifications.fromHttpError(err, 'Error al validar');
      },
    });
  }

  importar(): void {
    if (!this.file) return;
    this.loading = true;
    this.importador.importar(this.file).subscribe({
      next: r => {
        this.result = r;
        this.loading = false;
        this.notifications.success('Importacion terminada.');
      },
      error: err => {
        this.loading = false;
        this.notifications.fromHttpError(err, 'Error al importar');
      },
    });
  }

  logText(): string {
    if (!this.result) return '';
    return [...this.result.warnings.map(w => `WARNING: ${w}`), ...this.result.errores.map(e => `ERROR: ${e}`), ...this.result.log].join('\n');
  }
}
