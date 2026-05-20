import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ModalMessage } from '../../services/notification.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="confirm-backdrop" (click)="cancel.emit()">
      <article class="confirm-card" [ngClass]="'confirm-card--' + modal.severity" (click)="$event.stopPropagation()" role="dialog" aria-modal="true">
        <div class="confirm-mark">{{ modal.severity === 'confirm' ? '?' : iconFor(modal.severity) }}</div>
        <div class="confirm-content">
          <div class="confirm-header">
            <h2>{{ modal.title }}</h2>
            <button type="button" class="confirm-close" (click)="cancel.emit()" aria-label="Cerrar">x</button>
          </div>
          <p class="confirm-message">{{ modal.message }}</p>
          @if (modal.detail) {
            <pre class="confirm-detail">{{ modal.detail }}</pre>
          }
          <div class="confirm-actions">
            @if (modal.severity === 'confirm') {
              <button type="button" class="confirm-button confirm-button--ghost" (click)="cancel.emit()">{{ modal.cancelText }}</button>
              <button type="button" class="confirm-button confirm-button--primary" (click)="accept.emit()">{{ modal.confirmText }}</button>
            } @else {
              <button type="button" class="confirm-button confirm-button--primary" (click)="cancel.emit()">Entendido</button>
            }
          </div>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1300;
      display: grid;
      place-items: start center;
      padding: 11vh 18px 32px;
      background: rgba(13, 16, 23, 0.44);
      backdrop-filter: blur(3px);
    }

    .confirm-card {
      display: grid;
      grid-template-columns: 42px 1fr;
      gap: 14px;
      width: min(620px, 100%);
      max-height: 78vh;
      padding: 18px;
      border-radius: 18px;
      border: 1px solid #E4E7EC;
      background: #FFFFFF;
      box-shadow: 0 24px 70px rgba(13, 16, 23, 0.24);
      animation: confirm-enter 140ms ease-out;
    }

    .confirm-mark {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 800;
    }

    .confirm-content {
      min-width: 0;
    }

    .confirm-header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .confirm-header h2 {
      margin: 0;
      font-size: 18px;
      line-height: 1.2;
      font-weight: 750;
      color: #0D1017;
      letter-spacing: -0.2px;
    }

    .confirm-message {
      margin: 0;
      color: #4B5162;
      font-size: 13.5px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .confirm-detail {
      max-height: 310px;
      overflow: auto;
      margin: 14px 0 0;
      padding: 12px;
      border-radius: 12px;
      border: 1px solid #E4E7EC;
      background: #0D1017;
      color: #F9FAFB;
      font-size: 12px;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    .confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 18px;
    }

    .confirm-button {
      min-height: 38px;
      padding: 0 15px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 650;
      cursor: pointer;
      transition: transform 120ms ease, background 120ms ease, border 120ms ease;
    }

    .confirm-button:active {
      transform: translateY(1px);
    }

    .confirm-button--ghost {
      border: 1px solid #E4E7EC;
      background: #FFFFFF;
      color: #4B5162;
    }

    .confirm-button--primary {
      border: 1px solid #0D1017;
      background: #0D1017;
      color: #FFFFFF;
    }

    .confirm-card--success .confirm-mark {
      background: #DCFCE7;
      color: #166534;
    }

    .confirm-card--info .confirm-mark {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .confirm-card--warning .confirm-mark,
    .confirm-card--confirm .confirm-mark {
      background: #FEF3C7;
      color: #92400E;
    }

    .confirm-card--error .confirm-mark {
      background: #FEE2E2;
      color: #991B1B;
    }

    @keyframes confirm-enter {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 640px) {
      .confirm-card {
        grid-template-columns: 1fr;
      }

      .confirm-actions {
        flex-direction: column-reverse;
      }

      .confirm-button {
        width: 100%;
      }
    }
  `],
})
export class ConfirmDialogComponent {
  @Input({ required: true }) modal!: ModalMessage;
  @Output() accept = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  iconFor(severity: string): string {
    const icons: Record<string, string> = {
      success: 'OK',
      info: 'i',
      warning: '!',
      error: '!',
    };
    return icons[severity] ?? 'i';
  }
}
