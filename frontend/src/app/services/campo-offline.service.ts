import { NgZone, inject, Injectable, signal } from '@angular/core';
import Dexie, { type EntityTable } from 'dexie';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { CampoService } from './campo.service';

export type OfflineRecordStatus =
  | 'BORRADOR'
  | 'LISTO'
  | 'SINCRONIZANDO'
  | 'ERROR'
  | 'COMPLETADO';
export type OfflineMediaType = 'FOTO' | 'VIDEO';
export type OfflineMediaStatus = 'PENDIENTE' | 'SUBIENDO' | 'SUBIDO' | 'ERROR';

export interface CampoOfflineRecord {
  id: string;
  clientOperationId: string;
  ownerUserId: string | null;
  ownerTenantId: string | null;
  descripcionVehiculo: string;
  clienteId: string | null;
  clienteNombreLibre: string | null;
  ubicacion: string | null;
  notasInternas: string | null;
  vin: string | null;
  marcaId: string | null;
  modeloId: string | null;
  modelo: string | null;
  anno: number | null;
  status: OfflineRecordStatus;
  readyToSync: boolean;
  serverTaskId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampoOfflineMedia {
  id: string;
  preRegistroId: string;
  tipo: OfflineMediaType;
  file: Blob;
  fileName: string;
  contentType: string;
  size: number;
  durationSeconds: number | null;
  status: OfflineMediaStatus;
  serverUrl: string | null;
  error: string | null;
  createdAt: string;
}

export interface CreateCampoOfflineRecordInput {
  descripcionVehiculo: string;
  clienteId?: string | null;
  clienteNombreLibre?: string | null;
  ubicacion?: string | null;
  notasInternas?: string | null;
  vin?: string | null;
  marcaId?: string | null;
  modeloId?: string | null;
  modelo?: string | null;
  anno?: number | null;
}

export interface CampoOfflineRecordUpdate {
  ubicacion?: string | null;
  vin?: string | null;
  notasInternas?: string | null;
}

class CampoOfflineDatabase extends Dexie {
  preRegistros!: EntityTable<CampoOfflineRecord, 'id'>;
  medios!: EntityTable<CampoOfflineMedia, 'id'>;

  constructor() {
    super('rr-importaciones-campo-offline');
    this.version(1).stores({
      preRegistros: 'id, clientOperationId, status, readyToSync, createdAt, ownerUserId',
      medios: 'id, preRegistroId, status, createdAt',
    });
  }
}

const db = new CampoOfflineDatabase();

@Injectable({ providedIn: 'root' })
export class CampoOfflineService {
  private readonly campoService = inject(CampoService);
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private syncPromise: Promise<void> | null = null;
  private initialized = false;

  readonly records = signal<CampoOfflineRecord[]>([]);
  readonly syncing = signal(false);
  readonly lastSyncError = signal<string | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.refresh();
    if (this.canSync()) void this.syncAll();
  }

  async refresh(): Promise<void> {
    const userId = this.auth.user()?.id ?? null;
    const records = await db.preRegistros
      .orderBy('createdAt')
      .reverse()
      .toArray();
    const visible = records.filter(record =>
      record.status !== 'COMPLETADO' && (!record.ownerUserId || record.ownerUserId === userId)
    );
    this.zone.run(() => this.records.set(visible));
  }

  async createDraft(input: CreateCampoOfflineRecordInput): Promise<CampoOfflineRecord> {
    const now = new Date().toISOString();
    const record: CampoOfflineRecord = {
      id: crypto.randomUUID(),
      clientOperationId: crypto.randomUUID(),
      ownerUserId: this.auth.user()?.id ?? null,
      ownerTenantId: this.auth.user()?.tenantId ?? null,
      descripcionVehiculo: input.descripcionVehiculo.trim() || 'Registro en yarda',
      clienteId: input.clienteId ?? null,
      clienteNombreLibre: input.clienteNombreLibre ?? null,
      ubicacion: input.ubicacion?.trim() || null,
      notasInternas: input.notasInternas?.trim() || null,
      vin: input.vin?.trim().toUpperCase() || null,
      marcaId: input.marcaId ?? null,
      modeloId: input.modeloId ?? null,
      modelo: input.modelo?.trim() || null,
      anno: input.anno ?? null,
      status: 'BORRADOR',
      readyToSync: false,
      serverTaskId: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.preRegistros.add(record);
    await this.refresh();
    return record;
  }

  async getRecord(id: string): Promise<CampoOfflineRecord | undefined> {
    return db.preRegistros.get(id);
  }

  async getMediaForRecord(preRegistroId: string): Promise<CampoOfflineMedia[]> {
    return db.medios.where('preRegistroId').equals(preRegistroId).sortBy('createdAt');
  }

  async savePhoto(preRegistroId: string, id: string, blob: Blob, fileName: string): Promise<void> {
    await this.saveMedia({
      id,
      preRegistroId,
      tipo: 'FOTO',
      blob,
      fileName,
      contentType: blob.type || 'image/jpeg',
      durationSeconds: null,
    });
  }

  async saveVideo(
    preRegistroId: string,
    id: string,
    blob: Blob,
    fileName: string,
    durationSeconds: number | null = null
  ): Promise<void> {
    await this.saveMedia({
      id,
      preRegistroId,
      tipo: 'VIDEO',
      blob,
      fileName,
      contentType: blob.type || 'video/mp4',
      durationSeconds,
    });
  }

  async deleteMedia(id: string): Promise<void> {
    await db.medios.delete(id);
  }

  async markReady(id: string, update: CampoOfflineRecordUpdate): Promise<void> {
    const record = await db.preRegistros.get(id);
    if (!record) throw new Error('La captura offline ya no está disponible.');

    await db.preRegistros.update(id, {
      ...update,
      vin: update.vin?.trim().toUpperCase() || record.vin,
      status: 'LISTO',
      readyToSync: true,
      error: null,
      updatedAt: new Date().toISOString(),
    });
    await this.refresh();
    if (this.canSync()) void this.syncAll();
  }

  async updateDraft(id: string, update: CampoOfflineRecordUpdate): Promise<void> {
    const record = await db.preRegistros.get(id);
    if (!record) return;
    await db.preRegistros.update(id, {
      ...update,
      updatedAt: new Date().toISOString(),
    });
  }

  async syncAll(): Promise<void> {
    if (this.syncPromise) return this.syncPromise;
    if (!this.canSync()) return;

    this.syncPromise = this.runSync().finally(() => {
      this.syncPromise = null;
    });
    return this.syncPromise;
  }

  private async runSync(): Promise<void> {
    this.syncing.set(true);
    this.lastSyncError.set(null);
    try {
      const userId = this.auth.user()?.id ?? null;
      const records = await db.preRegistros.orderBy('createdAt').toArray();
      for (const record of records) {
        if (!record.readyToSync || record.status === 'COMPLETADO') continue;
        if (record.ownerUserId && record.ownerUserId !== userId) continue;
        try {
          await this.syncRecord(record.id);
        } catch (error) {
          const message = this.describeError(error);
          await db.preRegistros.update(record.id, {
            status: 'ERROR',
            error: message,
            updatedAt: new Date().toISOString(),
          });
          this.lastSyncError.set(message);
          // Un problema de red afecta a todos los elementos pendientes; el
          // siguiente evento online continuará sin bloquear la interfaz.
          if (!navigator.onLine) break;
        }
      }
    } finally {
      this.syncing.set(false);
      await this.refresh();
    }
  }

  private async syncRecord(id: string): Promise<void> {
    const record = await db.preRegistros.get(id);
    if (!record) return;

    await db.preRegistros.update(id, {
      status: 'SINCRONIZANDO',
      error: null,
      updatedAt: new Date().toISOString(),
    });

    const task = record.serverTaskId
      ? await firstValueFrom(this.campoService.getById(record.serverTaskId))
      : await firstValueFrom(
          this.campoService.crearPreInspeccion({
            clientOperationId: record.clientOperationId,
            descripcionVehiculo: record.descripcionVehiculo,
            clienteNombreLibre: record.clienteNombreLibre,
            clienteId: record.clienteId,
            ubicacion: record.ubicacion,
            notasInternas: record.notasInternas,
            vin: record.vin,
            marcaId: record.marcaId,
            modeloId: record.modeloId,
            modelo: record.modelo,
            anno: record.anno,
          })
        );

    if (record.serverTaskId && (task.estatus === 'COMPLETADA' || task.estatus === 'INCIDENCIA')) {
      await db.preRegistros.update(id, {
        status: 'COMPLETADO',
        readyToSync: false,
        error: null,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (!record.serverTaskId) {
      await db.preRegistros.update(id, {
        serverTaskId: task.id,
        updatedAt: new Date().toISOString(),
      });
    }

    const media = await this.getMediaForRecord(id);
    let currentTask = task;
    for (const item of media) {
      if (item.status === 'SUBIDO') continue;

      await db.medios.update(item.id, { status: 'SUBIENDO', error: null });
      const file = new File([item.file], item.fileName, { type: item.contentType });
      try {
        const response = await firstValueFrom(
          this.campoService.uploadMedia(
            currentTask.id,
            file,
            item.id,
            item.tipo,
            item.durationSeconds
          )
        );
        currentTask = response.tarea;
        await db.medios.update(item.id, {
          status: 'SUBIDO',
          serverUrl: response.url,
          error: null,
        });
      } catch (error) {
        await db.medios.update(item.id, {
          status: 'ERROR',
          error: this.describeError(error),
        });
        throw error;
      }
    }

    const completed = await firstValueFrom(
      this.campoService.completar(currentTask.id, {
        ubicacion: record.ubicacion,
        vinConfirmado: record.vin,
        fotosUrls: currentTask.fotosUrls,
        incidencia: record.notasInternas,
      })
    );

    await db.preRegistros.update(id, {
      status: 'COMPLETADO',
      readyToSync: false,
      serverTaskId: completed.id,
      error: null,
      updatedAt: new Date().toISOString(),
    });
  }

  private async saveMedia(input: {
    id: string;
    preRegistroId: string;
    tipo: OfflineMediaType;
    blob: Blob;
    fileName: string;
    contentType: string;
    durationSeconds: number | null;
  }): Promise<void> {
    const record = await db.preRegistros.get(input.preRegistroId);
    if (!record) throw new Error('La captura offline ya no está disponible.');

    const item: CampoOfflineMedia = {
      id: input.id,
      preRegistroId: input.preRegistroId,
      tipo: input.tipo,
      file: input.blob,
      fileName: input.fileName,
      contentType: input.contentType,
      size: input.blob.size,
      durationSeconds: input.durationSeconds,
      status: 'PENDIENTE',
      serverUrl: null,
      error: null,
      createdAt: new Date().toISOString(),
    };

    await db.medios.put(item);
    await db.preRegistros.update(record.id, {
      updatedAt: new Date().toISOString(),
    });
  }

  private canSync(): boolean {
    return typeof navigator === 'undefined' ||
      (navigator.onLine && this.auth.isAuthenticated());
  }

  private describeError(error: unknown): string {
    const candidate = error as { error?: { message?: string }; message?: string } | null;
    return candidate?.error?.message || candidate?.message ||
      'No se pudo sincronizar. Se reintentará cuando haya conexión.';
  }

  private readonly handleOnline = (): void => {
    this.zone.run(() => void this.syncAll());
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') void this.syncAll();
  };
}
