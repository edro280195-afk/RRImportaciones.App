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

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private zone = inject(NgZone);
  private connection: signalR.HubConnection | null = null;

  readonly campoActualizado$ = new Subject<CampoRealtimeEvent>();
  readonly tramiteActualizado$ = new Subject<TramiteRealtimeEvent>();

  start(): void {
    if (this.connection?.state === signalR.HubConnectionState.Connected || this.connection?.state === signalR.HubConnectionState.Connecting) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5198/hubs/realtime', {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('campoActualizado', event => {
      this.zone.run(() => this.campoActualizado$.next(event));
    });

    this.connection.on('tramiteActualizado', event => {
      this.zone.run(() => this.tramiteActualizado$.next(event));
    });

    this.connection.start().catch(() => undefined);
  }

  stop(): void {
    this.connection?.stop();
    this.connection = null;
  }
}
