import { Component, inject } from '@angular/core';
import { AppUpdateService } from '../services/app-update.service';

/**
 * Aviso fijo abajo cuando se publicó una versión nueva de la app o del API.
 *
 * Va a propósito por encima de todo y no se cierra solo: si el usuario está a
 * media captura en la yarda no queremos recargarle la pantalla, pero tampoco
 * que siga días con una versión vieja sin enterarse.
 */
@Component({
  selector: 'app-update-banner',
  standalone: true,
  template: `
    @if (update.actualizacionDisponible()) {
      <div class="update-banner" role="status" aria-live="polite">
        <span class="update-banner__dot"></span>

        <div class="update-banner__texto">
          <p class="update-banner__titulo">Hay una versión nueva</p>
          <p class="update-banner__detalle">
            {{
              update.origen() === 'backend'
                ? 'Se actualizó el servidor. Recarga para seguir trabajando sin errores.'
                : 'Se publicó una actualización de la app. Recarga para tenerla.'
            }}
          </p>
        </div>

        <button
          type="button"
          class="update-banner__accion"
          [disabled]="update.aplicando()"
          (click)="update.aplicar()"
        >
          {{ update.aplicando() ? 'Actualizando…' : 'Actualizar' }}
        </button>

        <button
          type="button"
          class="update-banner__cerrar"
          aria-label="Ahora no"
          [disabled]="update.aplicando()"
          (click)="update.posponer()"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    }
  `,
  styles: [
    `
      .update-banner {
        position: fixed;
        left: 50%;
        bottom: 20px;
        transform: translateX(-50%);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        width: min(520px, calc(100vw - 24px));
        padding: 12px 12px 12px 16px;
        border-radius: 14px;
        background: #0d1017;
        color: #fff;
        box-shadow:
          0 12px 36px rgba(13, 16, 23, 0.28),
          0 2px 8px rgba(13, 16, 23, 0.16);
        font-family: var(--font-body, Inter, system-ui, sans-serif);
        animation: updateBannerIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .update-banner__dot {
        flex-shrink: 0;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #c61d26;
        box-shadow: 0 0 0 4px rgba(198, 29, 38, 0.25);
      }

      .update-banner__texto {
        flex: 1;
        min-width: 0;
      }

      .update-banner__titulo {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        line-height: 1.3;
      }

      .update-banner__detalle {
        margin: 2px 0 0;
        font-size: 12px;
        line-height: 1.4;
        color: rgba(255, 255, 255, 0.62);
      }

      .update-banner__accion {
        flex-shrink: 0;
        padding: 8px 14px;
        border: none;
        border-radius: 9px;
        background: #c61d26;
        color: #fff;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .update-banner__accion:hover:not(:disabled) {
        background: #a5151f;
      }
      .update-banner__accion:disabled {
        opacity: 0.7;
        cursor: default;
      }

      .update-banner__cerrar {
        flex-shrink: 0;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        padding: 0;
        border: none;
        border-radius: 7px;
        background: none;
        color: rgba(255, 255, 255, 0.45);
        cursor: pointer;
      }
      .update-banner__cerrar:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
      .update-banner__cerrar svg {
        width: 15px;
        height: 15px;
      }

      @keyframes updateBannerIn {
        from {
          opacity: 0;
          transform: translate(-50%, 16px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }

      @media (max-width: 520px) {
        .update-banner {
          bottom: 12px;
          gap: 10px;
          padding: 11px 10px 11px 13px;
        }
        .update-banner__detalle {
          display: none;
        }
      }
    `,
  ],
})
export class UpdateBannerComponent {
  update = inject(AppUpdateService);
}
