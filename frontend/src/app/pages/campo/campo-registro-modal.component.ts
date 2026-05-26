import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampoService } from '../../services/campo.service';
import { NotificationService } from '../../services/notification.service';
import { MarcaService } from '../../services/marca.service';

@Component({
  selector: 'app-campo-registro-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" (click)="close.emit()">
      <div class="sheet" (click)="$event.stopPropagation()">
        <div class="sheet-handle"></div>
        <p class="sheet-title">Registrar Vehículo</p>
        <p class="sheet-sub">Ingresa los datos para registrar un vehículo en yarda.</p>

        <form (ngSubmit)="submit()" class="form-container">
          <div class="form-group">
            <label>VIN <span class="required">*</span></label>
            <input type="text" [(ngModel)]="vin" name="vin" required placeholder="17 caracteres" maxlength="17" />
          </div>
          
          <div class="form-group">
            <label>Marca (Opcional)</label>
            <select [(ngModel)]="marcaId" name="marcaId">
              <option [ngValue]="null">Selecciona una marca...</option>
              @for (m of marcas(); track m.id) {
                <option [value]="m.id">{{ m.nombre }}</option>
              }
            </select>
          </div>

          <div class="form-group">
            <label>Modelo (Opcional)</label>
            <input type="text" [(ngModel)]="modelo" name="modelo" placeholder="Ej. Corolla" />
          </div>

          <div class="form-group">
            <label>Año (Opcional)</label>
            <input type="number" [(ngModel)]="anno" name="anno" placeholder="Ej. 2018" />
          </div>

          <div class="form-group">
            <label>Ubicación en yarda (Opcional)</label>
            <input type="text" [(ngModel)]="ubicacion" name="ubicacion" placeholder="Ej. Fila 3" />
          </div>

          <div class="form-group">
            <label>Cliente (Opcional)</label>
            <input type="text" [(ngModel)]="clienteNombreLibre" name="clienteNombreLibre" placeholder="Nombre o apodo" />
            @if (!clienteNombreLibre()) {
              <small class="warning-text">⚠️ Se recomienda ingresar el cliente. ¿Deseas continuar sin asignar?</small>
            }
          </div>
          
          <div class="form-group">
            <label>Descripción / Notas (Opcional)</label>
            <textarea [(ngModel)]="descripcionVehiculo" name="descripcionVehiculo" rows="2" placeholder="Detalles adicionales"></textarea>
          </div>

          <div class="sheet-actions">
            <button type="button" class="sheet-cancel" (click)="close.emit()" [disabled]="saving()">Cancelar</button>
            <button type="submit" class="sheet-confirm" [disabled]="saving() || !vin()">
              {{ saving() ? 'Guardando...' : 'Registrar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: flex-end;
        z-index: 100;
        animation: fadeUp 0.18s ease;
      }
      .sheet {
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        background: var(--surface);
        border-radius: 24px 24px 0 0;
        border-top: 1.5px solid var(--border);
        padding: 20px 20px max(20px, env(safe-area-inset-bottom, 20px));
      }
      .sheet-handle {
        width: 36px;
        height: 4px;
        border-radius: 2px;
        background: var(--border);
        margin: 0 auto 20px;
      }
      .sheet-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-1);
        margin: 0 0 6px;
      }
      .sheet-sub {
        font-size: 14px;
        color: var(--text-2);
        margin: 0 0 24px;
      }
      .form-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 24px;
      }
      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .form-group label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-2);
      }
      .required {
        color: var(--red);
      }
      .warning-text {
        color: var(--amber);
        font-size: 11px;
        margin-top: 4px;
      }
      input, select, textarea {
        padding: 12px 14px;
        border-radius: 12px;
        border: 1.5px solid var(--border);
        background: #f9fafb;
        color: var(--text-1);
        font-family: inherit;
        font-size: 14px;
        transition: border-color 0.2s;
      }
      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: var(--text-1);
        background: #fff;
      }
      .sheet-actions {
        display: flex;
        gap: 10px;
        position: sticky;
        bottom: -20px;
        background: var(--surface);
        padding: 10px 0 20px;
        margin-bottom: -20px;
      }
      .sheet-cancel {
        flex: 1;
        padding: 15px;
        border-radius: 14px;
        background: #f3f4f6;
        border: 1.5px solid var(--border);
        color: var(--text-2);
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
      }
      .sheet-confirm {
        flex: 1;
        padding: 15px;
        border-radius: 14px;
        background: var(--red);
        border: none;
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      }
      .sheet-confirm:disabled {
        opacity: 0.6;
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `
  ]
})
export class CampoRegistroModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() registered = new EventEmitter<void>();

  private campoService = inject(CampoService);
  private marcaService = inject(MarcaService);
  private notifications = inject(NotificationService);

  saving = signal(false);
  marcas = signal<any[]>([]);

  vin = signal('');
  marcaId = signal<string | null>(null);
  modelo = signal('');
  anno = signal<number | null>(null);
  ubicacion = signal('');
  clienteNombreLibre = signal('');
  descripcionVehiculo = signal('');

  constructor() {
    this.marcaService.getAll(true).subscribe(m => this.marcas.set(m));
  }

  submit() {
    if (!this.vin()) {
      this.notifications.warning('El VIN es obligatorio');
      return;
    }
    if (!this.clienteNombreLibre() && !confirm('No has asignado un cliente. ¿Deseas continuar?')) {
      return;
    }

    this.saving.set(true);
    this.campoService.crearPreInspeccion({
      vin: this.vin(),
      marcaId: this.marcaId(),
      modelo: this.modelo() || undefined,
      anno: this.anno() || undefined,
      ubicacion: this.ubicacion() || undefined,
      clienteNombreLibre: this.clienteNombreLibre() || undefined,
      descripcionVehiculo: this.descripcionVehiculo() || 'Registro en yarda',
    } as any).subscribe({
      next: () => {
        this.notifications.success('Vehículo registrado');
        this.saving.set(false);
        this.registered.emit();
        this.close.emit();
      },
      error: err => {
        this.notifications.fromHttpError(err, 'Error al registrar vehículo');
        this.saving.set(false);
      }
    });
  }
}
