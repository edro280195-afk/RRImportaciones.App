import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({
  selector: 'app-feedback-host',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  template: `
    <section class="feedback-toasts" aria-live="polite" aria-atomic="true">
      @for (toast of notifications.toasts(); track toast.id) {
        <article class="feedback-toast" [ngClass]="'feedback-toast--' + toast.severity">
          <div class="feedback-toast__icon">{{ iconFor(toast.severity) }}</div>
          <div class="feedback-toast__body">
            <p class="feedback-toast__title">{{ toast.title }}</p>
            <p class="feedback-toast__message">{{ toast.message }}</p>
          </div>
          <button type="button" class="feedback-toast__close" (click)="notifications.dismissToast(toast.id)" aria-label="Cerrar aviso">x</button>
        </article>
      }
    </section>

    @if (notifications.modal(); as modal) {
      <app-confirm-dialog [modal]="modal" (cancel)="notifications.closeModal()" (accept)="notifications.confirmModal()" />
    }
  `,
  styles: [`
    :host {
      font-family: var(--font-body, Inter, system-ui, sans-serif);
    }

    .feedback-toasts {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 1200;
      display: grid;
      gap: 10px;
      width: min(380px, calc(100vw - 32px));
      pointer-events: none;
    }

    .feedback-toast {
      pointer-events: auto;
      display: grid;
      grid-template-columns: 34px 1fr 26px;
      gap: 10px;
      align-items: start;
      padding: 12px;
      border-radius: 14px;
      border: 1px solid #E4E7EC;
      background: #FFFFFF;
      box-shadow: 0 18px 45px rgba(13, 16, 23, 0.14);
      color: #0D1017;
      animation: feedback-enter 150ms ease-out;
    }

    .feedback-toast__icon,
    .feedback-modal__mark {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 800;
    }

    .feedback-toast__title {
      margin: 0 0 2px;
      font-size: 13px;
      font-weight: 700;
      color: #0D1017;
    }

    .feedback-toast__message {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.35;
      color: #6B717F;
    }

    .feedback-toast__close,
    .feedback-modal__close {
      border: 0;
      background: transparent;
      color: #9EA3AE;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
    }

    .feedback-toast--success .feedback-toast__icon,
    .feedback-modal--success .feedback-modal__mark {
      background: #DCFCE7;
      color: #166534;
    }

    .feedback-toast--info .feedback-toast__icon,
    .feedback-modal--info .feedback-modal__mark {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .feedback-toast--warning .feedback-toast__icon,
    .feedback-modal--warning .feedback-modal__mark,
    .feedback-modal--confirm .feedback-modal__mark {
      background: #FEF3C7;
      color: #92400E;
    }

    .feedback-toast--error .feedback-toast__icon,
    .feedback-modal--error .feedback-modal__mark {
      background: #FEE2E2;
      color: #991B1B;
    }

    .feedback-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1300;
      display: grid;
      place-items: start center;
      padding: 11vh 18px 32px;
      background: rgba(13, 16, 23, 0.44);
      backdrop-filter: blur(3px);
    }

    .feedback-modal {
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
      animation: feedback-enter 140ms ease-out;
    }

    .feedback-modal__mark {
      width: 42px;
      height: 42px;
      border-radius: 12px;
    }

    .feedback-modal__content {
      min-width: 0;
    }

    .feedback-modal__header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .feedback-modal__header h2 {
      margin: 0;
      font-size: 18px;
      line-height: 1.2;
      font-weight: 750;
      color: #0D1017;
      letter-spacing: -0.2px;
    }

    .feedback-modal__message {
      margin: 0;
      color: #4B5162;
      font-size: 13.5px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .feedback-modal__detail {
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

    .feedback-modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 18px;
    }

    .feedback-button {
      min-height: 38px;
      padding: 0 15px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 650;
      cursor: pointer;
      transition: transform 120ms ease, background 120ms ease, border 120ms ease;
    }

    .feedback-button:active {
      transform: translateY(1px);
    }

    .feedback-button--ghost {
      border: 1px solid #E4E7EC;
      background: #FFFFFF;
      color: #4B5162;
    }

    .feedback-button--primary {
      border: 1px solid #0D1017;
      background: #0D1017;
      color: #FFFFFF;
    }

    @keyframes feedback-enter {
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
      .feedback-modal {
        grid-template-columns: 1fr;
      }

      .feedback-modal__actions {
        flex-direction: column-reverse;
      }

      .feedback-button {
        width: 100%;
      }
    }
  `],
})
export class FeedbackHostComponent {
  notifications = inject(NotificationService);

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
