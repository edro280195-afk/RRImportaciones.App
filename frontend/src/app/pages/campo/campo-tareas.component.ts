import { Component, signal, computed, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CampoService, TareaCampoDto } from '../../services/campo.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { RealtimeService } from '../../services/realtime.service';

@Component({
  selector: 'app-campo-tareas',
  standalone: true,
  template: `
    <div class="shell">
      <!-- ── Header ──────────────────────────────────────────────── -->
      <header class="topbar">
        <div class="brand">
          <div class="brand-logo">
            <svg viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="#C61D26" />
              <path
                d="M6 14L10 6L14 14"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div>
            <span class="brand-name">RR Campo</span>
            <span class="brand-user">{{ userName() }}</span>
          </div>
        </div>
        <div class="topbar-actions">
          <button
            class="icon-btn"
            (click)="load()"
            [class.spinning]="loading()"
            aria-label="Actualizar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
          </button>
          <button
            class="icon-btn icon-btn--logout"
            (click)="confirmLogout()"
            aria-label="Cerrar sesión"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
              />
            </svg>
          </button>
        </div>
      </header>

      <!-- ── Summary banner ──────────────────────────────────────── -->
      <div class="summary-banner" [class.banner--clear]="pendientes() === 0 && tareas().length > 0">
        @if (loading() && tareas().length === 0) {
          <div class="summary-loader"></div>
          <span class="summary-loading-text">Cargando tareas…</span>
        } @else if (pendientes() > 0) {
          <span class="summary-count">{{ pendientes() }}</span>
          <div>
            <p class="summary-title">
              {{ pendientes() === 1 ? 'unidad pendiente' : 'unidades pendientes' }}
            </p>
            <p class="summary-sub">Toca una tarjeta para comenzar la captura</p>
          </div>
        } @else if (tareas().length === 0) {
          <div class="summary-icon summary-icon--empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12h6m-3-3v6M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p class="summary-title">Sin tareas asignadas</p>
            <p class="summary-sub">Cuando te asignen una unidad aparecerá aquí</p>
          </div>
        } @else {
          <div class="summary-icon summary-icon--done">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p class="summary-title">¡Todo al día!</p>
            <p class="summary-sub">No tienes unidades pendientes</p>
          </div>
        }
      </div>

      <!-- ── Filter chips ──────────────────────────────────────── -->
      <div class="filter-bar" role="tablist">
        @for (f of filters; track f.value) {
          <button
            role="tab"
            [attr.aria-selected]="activeFilter() === f.value"
            class="filter-chip"
            [class.chip--active]="activeFilter() === f.value"
            (click)="setFilter(f.value)"
          >
            {{ f.label }}
            @if (f.value !== '' && countByStatus(f.value) > 0) {
              <span class="chip-badge">{{ countByStatus(f.value) }}</span>
            }
          </button>
        }
      </div>

      <!-- ── Task list ──────────────────────────────────────────── -->
      <section class="task-list" role="list">
        @if (loading() && tareas().length === 0) {
          @for (i of [1, 2, 3]; track i) {
            <div class="task-skeleton"></div>
          }
        }

        @for (t of filteredTareas(); track t.id) {
          <article
            class="task-card"
            [class.card--abierta]="t.estatus === 'ABIERTA'"
            [class.card--tomada]="t.estatus === 'TOMADA'"
            [class.card--yarda]="t.estatus === 'EN_YARDA'"
            [class.card--incidencia]="t.estatus === 'INCIDENCIA'"
            [class.card--done]="t.estatus === 'COMPLETADA' || t.estatus === 'CANCELADA'"
            role="listitem"
          >
            <button
              class="task-tap"
              (click)="openCaptura(t)"
              [attr.aria-label]="'Capturar ' + (t.vehiculoResumen || t.numeroConsecutivo)"
            >
              <div class="task-content">
                <div class="task-top">
                  <span class="task-folio">{{ t.numeroConsecutivo ?? 'PRE-INSP' }}</span>
                  @if (esPreInspeccion(t)) {
                    <span class="task-badge-preinsp">Pre-inspección</span>
                  }
                  <span
                    class="task-status-chip chip-{{ (t.estatus || 'abierta').toLowerCase() }}"
                    >{{ estadoLabel(t.estatus || '') }}</span
                  >
                </div>

                <p class="task-vehicle">{{ t.vehiculoResumen || 'Sin datos del vehículo' }}</p>

                <div class="task-pills">
                  @if (t.vinCorto) {
                    <span class="pill pill--vin">
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
                        <rect x="1" y="3" width="12" height="8" rx="1.5" />
                        <path stroke-linecap="round" d="M3 6h3M3 8h2" />
                      </svg>
                      {{ t.vinCorto }}
                    </span>
                  }
                  @if (t.fotosUrls.length > 0) {
                    <span class="pill pill--fotos">
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
                        <path
                          stroke-linecap="round"
                          d="M2.5 5A1 1 0 013.4 4h.6L4.5 3A1 1 0 015.2 2.5h3.6A1 1 0 019.5 3l.5 1h.6a1 1 0 01.9 1v5a1 1 0 01-1 1H2.5a1 1 0 01-1-1V5z"
                        />
                        <circle cx="7" cy="7" r="1.6" />
                      </svg>
                      {{ t.fotosUrls.length }} foto{{ t.fotosUrls.length !== 1 ? 's' : '' }}
                    </span>
                  }
                  @if (t.ubicacion) {
                    <span class="pill pill--loc">
                      <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
                        <path
                          stroke-linecap="round"
                          d="M7 1C5 1 3 2.5 3 4.5c0 2.5 4 8.5 4 8.5s4-6 4-8.5C11 2.5 9 1 7 1z"
                        />
                        <circle cx="7" cy="4.5" r="1.2" />
                      </svg>
                      {{ t.ubicacion }}
                    </span>
                  }
                </div>

                @if (t.incidencia) {
                  <div class="task-incidencia">
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M7 1.5L13 12.5H1L7 1.5z"
                      />
                      <path stroke-linecap="round" d="M7 5.5v3M7 10v.5" />
                    </svg>
                    {{ t.incidencia }}
                  </div>
                }
              </div>

              <!-- Right: camera indicator -->
              <div class="task-arrow">
                @if (t.estatus === 'COMPLETADA') {
                  <div class="arrow-done">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 10l4 4 8-8" />
                    </svg>
                  </div>
                } @else {
                  <div class="arrow-cam" [class.cam--has-fotos]="t.fotosUrls.length > 0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M6.8 6.2A2.3 2.3 0 015.2 7.2l-1.1.2A2.3 2.3 0 002.3 9.6V18A2.3 2.3 0 004.5 20.3h15A2.3 2.3 0 0021.8 18V9.6c0-1.1-.8-2-1.8-2.2l-1.1-.2A2.3 2.3 0 0117.3 6l-.8-1.3a2.2 2.2 0 00-1.7-1 48.8 48.8 0 00-5.3 0 2.2 2.2 0 00-1.7 1l-.9 1.4z"
                      />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M16.5 12.8a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                      />
                    </svg>
                    @if (t.fotosUrls.length > 0) {
                      <span class="cam-count">{{ t.fotosUrls.length }}</span>
                    }
                  </div>
                }
              </div>
            </button>
          </article>
        } @empty {
          @if (!loading()) {
            <div class="empty-state">
              <div class="empty-icon">
                <svg viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="#D1D5DB" stroke-width="1.5" />
                  <path
                    d="M16 28c2-3 4-5 8-5s6 2 8 5"
                    stroke="#9CA3AF"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <circle cx="18" cy="20" r="2" fill="#9CA3AF" />
                  <circle cx="30" cy="20" r="2" fill="#9CA3AF" />
                </svg>
              </div>
              <p class="empty-title">
                {{ activeFilter() === '' ? 'Sin tareas asignadas' : 'Sin tareas en este estado' }}
              </p>
              <p class="empty-sub">
                {{
                  activeFilter() !== ''
                    ? 'Prueba seleccionando otro filtro'
                    : 'Cuando te asignen una unidad aparecerá aquí'
                }}
              </p>
            </div>
          }
        }
      </section>

      <!-- ── Logout confirm sheet ───────────────────────────────── -->
      @if (showLogout()) {
        <div class="overlay" (click)="showLogout.set(false)">
          <div class="sheet" (click)="$event.stopPropagation()">
            <div class="sheet-handle"></div>
            <p class="sheet-title">¿Cerrar sesión?</p>
            <p class="sheet-sub">Tendrás que ingresar tu PIN de nuevo para volver a campo.</p>
            <div class="sheet-actions">
              <button class="sheet-cancel" (click)="showLogout.set(false)">Cancelar</button>
              <button class="sheet-confirm" (click)="doLogout()">Sí, salir</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      @keyframes fadeUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 0.5;
        }
        50% {
          opacity: 0.9;
        }
      }

      :host {
        display: block;
        min-height: 100dvh;
      }

      /* ── Shell ──────────────────────────────────────────────────── */
      .shell {
        --red: #c61d26;
        --red-lt: #fee2e2;
        --green: #16a34a;
        --green-lt: #dcfce7;
        --amber: #d97706;
        --amber-lt: #fef3c7;
        --blue: #1d4ed8;
        --blue-lt: #dbeafe;
        --purple: #7c3aed;
        --purple-lt: #ede9fe;

        --bg: #f4f5f7;
        --surface: #ffffff;
        --border: #e2e4ea;
        --text-1: #0d1017;
        --text-2: #4b5162;
        --text-3: #9ea3ae;

        --font: var(--font-body, 'Inter', sans-serif);
        --font-mono: var(--font-mono, 'JetBrains Mono', monospace);

        min-height: 100dvh;
        background: var(--bg);
        color: var(--text-1);
        font-family: var(--font);
        padding-bottom: max(32px, env(safe-area-inset-bottom, 32px));
      }

      /* ── Top bar ────────────────────────────────────────────────── */
      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: max(14px, env(safe-area-inset-top, 14px)) 16px 14px;
        background: var(--surface);
        border-bottom: 1.5px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .brand-logo {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .brand-logo svg {
        width: 36px;
        height: 36px;
      }
      .brand-name {
        display: block;
        font-size: 15px;
        font-weight: 800;
        color: var(--text-1);
        line-height: 1.1;
      }
      .brand-user {
        display: block;
        font-size: 11px;
        color: var(--text-3);
        line-height: 1.1;
      }
      .topbar-actions {
        display: flex;
        gap: 8px;
      }
      .icon-btn {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: #f3f4f6;
        border: 1.5px solid var(--border);
        color: var(--text-2);
        display: grid;
        place-items: center;
        cursor: pointer;
        transition:
          background 0.12s,
          color 0.12s;
      }
      .icon-btn:hover {
        background: var(--border);
        color: var(--text-1);
      }
      .icon-btn--logout:hover {
        background: var(--red-lt);
        color: var(--red);
      }
      .icon-btn svg {
        width: 18px;
        height: 18px;
      }
      .icon-btn.spinning svg {
        animation: spin 0.7s linear infinite;
      }

      /* ── Summary banner ─────────────────────────────────────────── */
      .summary-banner {
        display: flex;
        align-items: center;
        gap: 14px;
        margin: 14px 14px 0;
        background: var(--red);
        border-radius: 20px;
        padding: 18px 20px;
        color: #fff;
        box-shadow: 0 4px 16px rgba(198, 29, 38, 0.25);
        animation: fadeUp 0.2s ease-out;
      }
      .summary-banner.banner--clear {
        background: var(--green-lt);
        color: var(--green);
        box-shadow: 0 4px 16px rgba(22, 163, 74, 0.15);
      }
      .summary-loader {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: #fff;
        animation: spin 0.8s linear infinite;
        flex-shrink: 0;
      }
      .summary-loading-text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
      }
      .summary-count {
        font-size: 52px;
        font-weight: 800;
        letter-spacing: -3px;
        line-height: 1;
        flex-shrink: 0;
        color: #fff;
      }
      .summary-icon {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        flex-shrink: 0;
      }
      .summary-icon--done {
        background: var(--green);
        color: #fff;
      }
      .summary-icon--empty {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }
      .summary-icon svg {
        width: 24px;
        height: 24px;
      }
      .summary-title {
        font-size: 16px;
        font-weight: 700;
        margin: 0 0 2px;
        color: #fff;
      }
      .summary-banner.banner--clear .summary-title {
        color: var(--green);
      }
      .summary-sub {
        font-size: 12px;
        margin: 0;
        color: rgba(255, 255, 255, 0.75);
        line-height: 1.3;
      }
      .summary-banner.banner--clear .summary-sub {
        color: #15803d;
      }

      /* ── Filter bar ─────────────────────────────────────────────── */
      .filter-bar {
        display: flex;
        gap: 8px;
        padding: 14px 14px 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .filter-bar::-webkit-scrollbar {
        display: none;
      }
      .filter-chip {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1.5px solid var(--border);
        border-radius: 999px;
        background: var(--surface);
        color: var(--text-2);
        padding: 9px 16px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.12s;
        min-height: 40px;
      }
      .filter-chip:hover {
        background: #f3f4f6;
      }
      .filter-chip.chip--active {
        background: var(--text-1);
        border-color: var(--text-1);
        color: #fff;
      }
      .chip-badge {
        background: #e5e7eb;
        color: var(--text-2);
        border-radius: 999px;
        padding: 1px 6px;
        font-size: 11px;
        font-weight: 800;
      }
      .filter-chip.chip--active .chip-badge {
        background: rgba(255, 255, 255, 0.2);
        color: #fff;
      }

      /* ── Task list ──────────────────────────────────────────────── */
      .task-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px 14px 20px;
      }
      .task-skeleton {
        height: 108px;
        border-radius: 18px;
        background: #e5e7eb;
        animation: pulse 1.6s ease-in-out infinite;
      }

      /* ── Task card ──────────────────────────────────────────────── */
      .task-card {
        background: var(--surface);
        border: 1.5px solid var(--border);
        border-radius: 18px;
        overflow: hidden;
        animation: fadeUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        transition:
          box-shadow 0.15s,
          border-color 0.15s;
      }
      .task-card:hover {
        border-color: #c4c7cf;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
      .card--abierta {
        border-left: 4px solid var(--amber);
      }
      .card--tomada {
        border-left: 4px solid var(--purple);
      }
      .card--yarda {
        border-left: 4px solid var(--blue);
      }
      .card--incidencia {
        border-left: 4px solid var(--red);
      }
      .card--done {
        opacity: 0.6;
      }

      .task-tap {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        background: none;
        border: none;
        text-align: left;
        cursor: pointer;
        padding: 16px;
        min-height: 80px;
      }
      .task-tap:active {
        background: #f9fafb;
      }

      .task-content {
        flex: 1;
        min-width: 0;
      }
      .task-top {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .task-folio {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-3);
        font-weight: 700;
        letter-spacing: 0.06em;
      }
      .task-status-chip {
        font-size: 10px;
        font-weight: 800;
        border-radius: 6px;
        padding: 2px 8px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .chip-abierta {
        background: var(--amber-lt);
        color: var(--amber);
      }
      .chip-tomada {
        background: var(--purple-lt);
        color: var(--purple);
      }
      .chip-en_yarda {
        background: var(--blue-lt);
        color: var(--blue);
      }
      .chip-incidencia {
        background: var(--red-lt);
        color: var(--red);
      }
      .chip-completada {
        background: var(--green-lt);
        color: var(--green);
      }
      .chip-cancelada {
        background: #f3f4f6;
        color: var(--text-3);
      }
      .task-badge-preinsp {
        font-size: 9px;
        font-weight: 800;
        border-radius: 6px;
        padding: 2px 7px;
        background: #ede9fe;
        color: #7c3aed;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .task-vehicle {
        font-size: clamp(16px, 4.5vw, 20px);
        font-weight: 700;
        color: var(--text-1);
        margin: 0 0 8px;
        line-height: 1.15;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .task-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 6px;
        padding: 3px 8px;
      }
      .pill svg {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
      }
      .pill--vin {
        background: #f3f4f6;
        color: var(--text-2);
        font-family: var(--font-mono);
      }
      .pill--fotos {
        background: var(--green-lt);
        color: var(--green);
      }
      .pill--loc {
        background: var(--blue-lt);
        color: var(--blue);
      }

      .task-incidencia {
        display: flex;
        align-items: flex-start;
        gap: 5px;
        margin-top: 8px;
        padding: 7px 10px;
        background: var(--red-lt);
        border-radius: 8px;
        color: var(--red);
        font-size: 12px;
        font-weight: 600;
        line-height: 1.4;
      }
      .task-incidencia svg {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .task-arrow {
        flex-shrink: 0;
      }
      .arrow-done {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--green-lt);
        color: var(--green);
        display: grid;
        place-items: center;
      }
      .arrow-done svg {
        width: 20px;
        height: 20px;
      }
      .arrow-cam {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: #f9fafb;
        border: 1.5px solid var(--border);
        color: var(--text-3);
        display: grid;
        place-items: center;
        position: relative;
        transition:
          background 0.12s,
          border-color 0.12s,
          color 0.12s;
      }
      .task-card:hover .arrow-cam {
        background: var(--red);
        border-color: var(--red);
        color: #fff;
      }
      .arrow-cam.cam--has-fotos {
        background: var(--green-lt);
        border-color: #86efac;
        color: var(--green);
      }
      .task-card:hover .arrow-cam.cam--has-fotos {
        background: var(--green);
        border-color: var(--green);
        color: #fff;
      }
      .arrow-cam svg {
        width: 26px;
        height: 26px;
      }
      .cam-count {
        position: absolute;
        top: -6px;
        right: -6px;
        min-width: 20px;
        height: 20px;
        border-radius: 999px;
        background: var(--green);
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        display: grid;
        place-items: center;
        padding: 0 4px;
        border: 2px solid var(--surface);
      }

      /* ── Empty state ────────────────────────────────────────────── */
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 52px 24px;
        text-align: center;
        animation: fadeUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .empty-icon {
        margin-bottom: 20px;
      }
      .empty-icon svg {
        width: 56px;
        height: 56px;
      }
      .empty-title {
        color: var(--text-2);
        font-size: 16px;
        font-weight: 700;
        margin: 0 0 6px;
      }
      .empty-sub {
        color: var(--text-3);
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
        max-width: 28ch;
      }

      /* ── Logout sheet ───────────────────────────────────────────── */
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
      .sheet-actions {
        display: flex;
        gap: 10px;
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

      @media (max-width: 380px) {
        .task-vehicle {
          font-size: 15px;
        }
        .summary-count {
          font-size: 42px;
        }
      }
    `,
  ],
})
export class CampoTareasComponent implements OnInit, OnDestroy {
  private campoService = inject(CampoService);
  private authService = inject(AuthService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private realtime = inject(RealtimeService);
  private sub?: Subscription;

  tareas = signal<TareaCampoDto[]>([]);
  loading = signal(false);
  activeFilter = signal('');
  showLogout = signal(false);

  filters = [
    { label: 'Todas', value: '' },
    { label: 'Abiertas', value: 'ABIERTA' },
    { label: 'Tomadas', value: 'TOMADA' },
    { label: 'En yarda', value: 'EN_YARDA' },
    { label: 'Incidencias', value: 'INCIDENCIA' },
    { label: 'Completadas', value: 'COMPLETADA' },
  ];

  esPreInspeccion = (t: TareaCampoDto) => t.tipo === 'PRE_INSPECCION';

  userName = computed(() => this.authService.user()?.nombre || '');

  pendientes = computed(
    () =>
      this.tareas().filter(
        t => t.estatus !== 'COMPLETADA' && t.estatus !== 'CANCELADA' && t.estatus !== 'INCIDENCIA'
      ).length
  );

  filteredTareas = computed(() => {
    const f = this.activeFilter();
    return f ? this.tareas().filter(t => t.estatus === f) : this.tareas();
  });

  ngOnInit(): void {
    this.load();
    this.realtime.start();
    this.sub = this.realtime.campoActualizado$.subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  load(): void {
    this.loading.set(true);
    this.campoService.getTareas().subscribe({
      next: tareas => {
        this.tareas.set(tareas);
        this.loading.set(false);
      },
      error: err => {
        this.notifications.fromHttpError(err, 'Error al cargar tareas');
        this.loading.set(false);
      },
    });
  }

  setFilter(value: string): void {
    this.activeFilter.set(value);
  }

  countByStatus(status: string): number {
    return this.tareas().filter(t => t.estatus === status).length;
  }

  openCaptura(tarea: TareaCampoDto): void {
    this.router.navigate(['/campo', tarea.id, 'captura']);
  }

  confirmLogout(): void {
    this.showLogout.set(true);
  }

  doLogout(): void {
    this.showLogout.set(false);
    localStorage.removeItem('campo_username');
    this.authService.clearSession();
    void this.router.navigateByUrl('/campo/pin', { replaceUrl: true });
  }

  estadoLabel(value: string): string {
    const map: Record<string, string> = {
      ABIERTA: 'Abierta',
      TOMADA: 'Tomada',
      EN_YARDA: 'En yarda',
      INCIDENCIA: 'Incidencia',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
    };
    return map[value] ?? value;
  }
}
