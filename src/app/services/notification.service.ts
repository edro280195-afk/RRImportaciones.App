import { Injectable, signal } from '@angular/core';

export type FeedbackSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: number;
  severity: FeedbackSeverity;
  title: string;
  message: string;
}

export interface ModalMessage {
  severity: FeedbackSeverity | 'confirm';
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  resolve?: (confirmed: boolean) => void;
}

export interface NotifyOptions {
  severity?: FeedbackSeverity;
  title?: string;
  message: string;
  detail?: unknown;
  forceModal?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  detail?: unknown;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 1;
  readonly toasts = signal<ToastMessage[]>([]);
  readonly modal = signal<ModalMessage | null>(null);

  success(message: string, title = 'Listo'): void {
    this.notify({ severity: 'success', title, message });
  }

  info(message: string, title = 'Aviso'): void {
    this.notify({ severity: 'info', title, message });
  }

  warning(message: string, title = 'Atencion'): void {
    this.notify({ severity: 'warning', title, message });
  }

  error(message: string, title = 'Error', detail?: unknown): void {
    this.notify({ severity: 'error', title, message, detail });
  }

  notify(options: NotifyOptions): void {
    const severity = options.severity ?? 'info';
    const title = options.title ?? this.defaultTitle(severity);
    const detail = this.formatDetail(options.detail);
    const shouldUseModal = options.forceModal === true
      || Boolean(detail)
      || options.message.length > 140
      || (severity === 'error' && options.message.length > 90);

    if (shouldUseModal) {
      this.modal.set({ severity, title, message: options.message, detail });
      return;
    }

    const id = this.nextId++;
    this.toasts.update(items => [...items, { id, severity, title, message: options.message }]);
    window.setTimeout(() => this.dismissToast(id), 4200);
  }

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise(resolve => {
      this.modal.set({
        severity: 'confirm',
        title: options.title,
        message: options.message,
        detail: this.formatDetail(options.detail),
        confirmText: options.confirmText ?? 'Confirmar',
        cancelText: options.cancelText ?? 'Cancelar',
        resolve,
      });
    });
  }

  fromHttpError(error: unknown, fallbackMessage: string, title = 'Error'): void {
    const parsed = this.parseHttpError(error);
    this.notify({
      severity: 'error',
      title,
      message: parsed.message || fallbackMessage,
      detail: parsed.detail,
    });
  }

  dismissToast(id: number): void {
    this.toasts.update(items => items.filter(item => item.id !== id));
  }

  closeModal(): void {
    const current = this.modal();
    current?.resolve?.(false);
    this.modal.set(null);
  }

  confirmModal(): void {
    const current = this.modal();
    current?.resolve?.(true);
    this.modal.set(null);
  }

  private defaultTitle(severity: FeedbackSeverity): string {
    const titles: Record<FeedbackSeverity, string> = {
      success: 'Listo',
      info: 'Aviso',
      warning: 'Atencion',
      error: 'Error',
    };
    return titles[severity];
  }

  private parseHttpError(error: unknown): { message: string; detail?: unknown } {
    const root = this.asRecord(error);
    const rawBody = root?.['error'];
    if (typeof rawBody === 'string') {
      return { message: rawBody };
    }

    const body = this.asRecord(root?.['error']);
    const bodyMessage = body?.['message'];
    const rootMessage = root?.['message'];
    const message = typeof bodyMessage === 'string'
      ? bodyMessage
      : typeof rootMessage === 'string'
        ? rootMessage
        : '';

    const validationErrors = body?.['errors'];
    const detail = validationErrors ?? (body && Object.keys(body).length > 1 ? body : undefined);
    return { message, detail };
  }

  private formatDetail(detail: unknown): string | undefined {
    if (detail === null || detail === undefined || detail === '') return undefined;
    if (typeof detail === 'string') return detail;

    try {
      return JSON.stringify(detail, null, 2);
    } catch {
      return String(detail);
    }
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
  }
}
