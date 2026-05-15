import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CampoService, TareaCampoDto } from '../../services/campo.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-campo-tareas',
  standalone: true,
  template: `
    <div class="campo-shell">
      <header class="campo-top">
        <div>
          <p>Yarda</p>
          <h1>Unidades por fotografiar</h1>
        </div>
        <button type="button" (click)="load()">Actualizar</button>
      </header>

      <div class="filters">
        @for (f of filters; track f.value) {
          <button type="button" (click)="estatus = f.value; load()" [class.active]="estatus === f.value">
            {{ f.label }}
          </button>
        }
      </div>

      <section class="task-list">
        @for (t of tareas; track t.id) {
          <article class="task-row" [class.done]="t.estatus === 'COMPLETADA'" [class.issue]="t.estatus === 'INCIDENCIA'">
            <button type="button" class="task-main" (click)="openCamera(t)">
              <span class="folio">{{ t.numeroConsecutivo }}</span>
              <strong>{{ t.vehiculoResumen }}</strong>
              <small>{{ t.clienteNombre || 'Sin cliente' }} · VIN {{ t.vinCorto || 'pendiente' }}</small>
              <div class="chips">
                <span>{{ estadoLabel(t.estatus) }}</span>
                <span>{{ t.fotosUrls.length }} fotos</span>
                <span>{{ t.ubicacion || 'Sin ubicación' }}</span>
              </div>
            </button>
            <button type="button" class="camera-btn" (click)="openCamera(t)">Cámara</button>
          </article>
        } @empty {
          <div class="empty">
            <strong>Sin unidades en este filtro</strong>
            <span>Cuando oficina mande una unidad a campo aparecerá aquí.</span>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .campo-shell { max-width: 1040px; margin: 0 auto; padding: 10px 0 44px; }
    .campo-top { display: flex; align-items: end; justify-content: space-between; gap: 16px; padding: 28px 0 18px; }
    .campo-top p { margin: 0 0 7px; color: #a31820; font-size: 11px; font-weight: 900; letter-spacing: .11em; text-transform: uppercase; }
    .campo-top h1 { margin: 0; color: #10131a; font-size: clamp(30px, 6vw, 48px); line-height: 1; letter-spacing: 0; }
    .campo-top button, .camera-btn { border: 0; border-radius: 14px; background: #11151c; color: #f8fafc; padding: 12px 16px; font-weight: 850; transition: transform .18s ease, background .18s ease; }
    .campo-top button:hover, .camera-btn:hover { transform: translateY(-1px); background: #c61d26; }
    .filters { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 18px; }
    .filters button { flex: 0 0 auto; border: 1px solid #e5e8ef; border-radius: 999px; background: #fbfcfd; color: #69717e; padding: 9px 13px; font-size: 12px; font-weight: 800; }
    .filters button.active { background: #c61d26; border-color: #c61d26; color: #fff8f8; }
    .task-list { display: grid; gap: 12px; }
    .task-row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; border: 1px solid #e6e9ef; border-radius: 22px; background: #fff; padding: 14px; box-shadow: 0 12px 32px rgba(17,21,28,.06); }
    .task-row.issue { border-color: #f2a83b; }
    .task-row.done { opacity: .72; }
    .task-main { min-width: 0; border: 0; background: transparent; padding: 0; text-align: left; }
    .folio { display: block; margin-bottom: 8px; color: #8b93a1; font-family: var(--font-mono); font-size: 12px; }
    .task-main strong { display: block; color: #151922; font-size: 22px; line-height: 1.08; letter-spacing: 0; }
    .task-main small { display: block; margin-top: 5px; color: #69717e; font-size: 13px; overflow-wrap: anywhere; }
    .chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
    .chips span { border-radius: 999px; background: #f3f5f8; color: #515966; padding: 6px 9px; font-size: 11px; font-weight: 800; }
    .empty { display: grid; gap: 6px; place-items: center; border-radius: 22px; background: #fff; color: #8b93a1; padding: 46px 18px; text-align: center; }
    .empty strong { color: #2a303a; }
    @media (max-width: 640px) {
      .campo-shell { padding: 4px 0 28px; }
      .campo-top { align-items: start; padding-top: 12px; }
      .campo-top button { display: none; }
      .task-row { grid-template-columns: 1fr; }
      .camera-btn { width: 100%; min-height: 48px; }
    }
  `],
})
export class CampoTareasComponent implements OnInit, OnDestroy {
  private campoService = inject(CampoService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private realtime = inject(RealtimeService);
  private sub?: Subscription;

  tareas: TareaCampoDto[] = [];
  estatus = '';

  filters = [
    { label: 'Todas', value: '' },
    { label: 'Abiertas', value: 'ABIERTA' },
    { label: 'Tomadas', value: 'TOMADA' },
    { label: 'En yarda', value: 'EN_YARDA' },
    { label: 'Incidencias', value: 'INCIDENCIA' },
    { label: 'Completadas', value: 'COMPLETADA' },
  ];

  ngOnInit(): void {
    this.load();
    this.realtime.start();
    this.sub = this.realtime.campoActualizado$.subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(): void {
    this.campoService.getTareas(this.estatus || undefined).subscribe({
      next: tareas => this.tareas = tareas,
      error: err => this.notifications.fromHttpError(err, 'Error al cargar tareas de campo'),
    });
  }

  openCamera(tarea: TareaCampoDto): void {
    this.router.navigate(['/campo', tarea.id, 'captura']);
  }

  estadoLabel(value: string): string {
    const labels: Record<string, string> = {
      ABIERTA: 'Abierta',
      TOMADA: 'Tomada',
      EN_YARDA: 'En yarda',
      INCIDENCIA: 'Incidencia',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
    };
    return labels[value] ?? value;
  }
}
