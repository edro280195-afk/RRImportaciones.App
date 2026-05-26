import { Injectable, NgZone, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';

export interface CampoRealtimeEvent {
  tareaCampoId: string;
  tramiteId: string;
  accion: string;
  fecha: string;
}

export interface TramiteRealtimeEvent {
  tramiteId: string;
  accion: string;
  fecha: string;
}

export interface CampoNotificacionEvent {
  tareaCampoId: string;
  tramiteId: string;
  numeroConsecutivo: string;
  vehiculoResumen: string;
  ubicacion: string | null;
  vinConfirmado: string | null;
  incidencia: string | null;
  totalFotos: number;
  operadorNombre: string;
  tieneIncidencia: boolean;
  fecha: string;
}

export interface PinResetRequestedEvent {
  userId: string;
  operadorNombre: string;
  username: string;
  fecha: string;
}

import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private zone = inject(NgZone);
  private connection: signalR.HubConnection | null = null;

  readonly campoActualizado$ = new Subject<CampoRealtimeEvent>();
  readonly tramiteActualizado$ = new Subject<TramiteRealtimeEvent>();
  /** Emitido únicamente en clientes de tipo admin cuando un operador completa una tarea. */
  readonly tareaCampoCompletada$ = new Subject<CampoNotificacionEvent>();
  /** Emitido cuando un operador solicita restablecer su PIN. */
  readonly pinResetRequested$ = new Subject<PinResetRequestedEvent>();
  readonly nexusAlerta$ = new Subject<{ tipo: string; mensaje: string; fecha: string }>();

  /** Emitido cuando el hub responde 401 — el layout debe redirigir a /login. */
  readonly authError$ = new Subject<void>();

  start(): void {
    if (
      this.connection?.state === signalR.HubConnectionState.Connected ||
      this.connection?.state === signalR.HubConnectionState.Connecting
    ) {
      return;
    }

    const token = localStorage.getItem('token');
    // Si no hay token en absoluto, no intentamos conectar
    if (!token) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(environment.apiUrl + '/hubs/realtime', {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.on('campoActualizado', event => {
      this.zone.run(() => this.campoActualizado$.next(event));
    });

    this.connection.on('tramiteActualizado', event => {
      this.zone.run(() => this.tramiteActualizado$.next(event));
    });

    this.connection.on('tareaCampoCompletada', (event: CampoNotificacionEvent) => {
      this.zone.run(() => this.tareaCampoCompletada$.next(event));
    });

    this.connection.on('pinResetRequested', (event: PinResetRequestedEvent) => {
      this.zone.run(() => this.pinResetRequested$.next(event));
    });

    this.connection.on('nexusAlerta', (event: { tipo: string; mensaje: string; fecha: string }) => {
      this.zone.run(() => this.nexusAlerta$.next(event));
    });

    this.connection.start().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
        // Token expirado — avisar al layout para redirigir a login
        this.zone.run(() => this.authError$.next());
      }
      // Cualquier otro error de red: SignalR ya hará reconexión automática
    });
  }

  stop(): void {
    this.connection?.stop();
    this.connection = null;
  }
}
