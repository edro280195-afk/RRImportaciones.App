import { AfterViewInit, Component, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GuardarPlantillaMensajeRequest, PlantillaMensajeDto, PlantillaMensajeService } from '../../services/plantilla-mensaje.service';
import { NotificationService } from '../../services/notification.service';

type TemplateChannel = 'EMAIL' | 'WHATSAPP';
type VariableCategory = 'Cliente' | 'Vehiculo' | 'Cotizacion' | 'Sistema';
type PreviewMode = 'mobile' | 'desktop';
type MobileStudioTab = 'plantillas' | 'editar' | 'preview' | 'variables';

interface VariableOption { key: string; label: string; sample: string; category: VariableCategory; }
interface TemplateForm { codigo: string; asunto: string | null; message: string; activa: boolean; channel: TemplateChannel; }
interface TemplateSnippet { label: string; text: string; }
interface DropMarker { left: number; top: number; height: number; }

@Component({
  selector: 'app-plantillas',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex flex-col gap-4">

      <!-- Header -->
      <div class="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--n-400);margin-bottom:3px;">Administración</p>
          <h1 style="font-size:22px;font-weight:700;letter-spacing:-0.4px;color:var(--n-900);margin:0;">Plantillas de mensajes</h1>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          @if (message()) {
            <div style="display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:10px;border:1px solid #BBF7D0;background:#F0FDF4;font-size:13px;font-weight:500;color:#166534;">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5l3 3L11 3" stroke="#166534" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {{ message() }}
            </div>
          }
          @if (error()) {
            <div style="display:flex;align-items:center;gap:7px;padding:8px 14px;border-radius:10px;border:1px solid #FECACA;background:#FEF2F2;font-size:13px;font-weight:500;color:#991B1B;">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="#991B1B" stroke-width="1.4"/><path d="M6.5 4v3M6.5 9h.01" stroke="#991B1B" stroke-width="1.6" stroke-linecap="round"/></svg>
              {{ error() }}
            </div>
          }
        </div>
      </div>

      @if (message()) {
        <div class="status-toast status-toast--success" role="status">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5l3 3L12 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {{ message() }}
        </div>
      }

      <div class="mobile-tabbar" aria-label="Secciones de plantillas">
        <button type="button" [class.mobile-tabbar--active]="mobileTab()==='plantillas'" (click)="mobileTab.set('plantillas')">Plantillas</button>
        <button type="button" [class.mobile-tabbar--active]="mobileTab()==='editar'" (click)="mobileTab.set('editar')">Editar</button>
        <button type="button" [class.mobile-tabbar--active]="mobileTab()==='preview'" (click)="mobileTab.set('preview')">Preview</button>
        <button type="button" [class.mobile-tabbar--active]="mobileTab()==='variables'" (click)="mobileTab.set('variables')">Variables</button>
      </div>

      <!-- 4-column workspace -->
      <div class="workspace-shell">

        <!-- COL 1: Template list -->
        <aside class="col-list" [class.mobile-active]="mobileTab()==='plantillas'">
          <div class="col-header">
            <span style="font-size:12px;font-weight:600;color:var(--n-700);">Plantillas</span>
            <button type="button" (click)="newTemplate()" class="btn-nueva">
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M4.5 1v7M1 4.5h7" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>
              Nueva
            </button>
          </div>
          <div class="tpl-list-scroll">
            @if (loading()) {
              @for (i of [1,2,3]; track i) {
                <div class="shimmer" style="height:52px;border-radius:10px;margin-bottom:4px;"></div>
              }
            } @else {
              @for (p of plantillas(); track p.id) {
                <button type="button" (click)="select(p)" class="tpl-row" [class.tpl-row--active]="selected()?.id === p.id">
                  <span style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:2px;">
                    <span style="font-size:12px;font-weight:600;color:var(--n-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;text-align:left;">{{ p.codigo }}</span>
                    <span class="ch-badge" [class]="channelFromCode(p.codigo)==='EMAIL' ? 'ch-email' : 'ch-wa'">{{ channelFromCode(p.codigo)==='EMAIL' ? 'EM' : 'WA' }}</span>
                  </span>
                  <span style="display:block;font-size:11px;color:var(--n-500);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;">{{ p.asunto || plainText(p.cuerpo) || 'Sin contenido' }}</span>
                </button>
              } @empty {
                <div style="padding:32px 16px;text-align:center;"><p style="font-size:12px;color:var(--n-400);">Sin plantillas aún.</p></div>
              }
            }
          </div>
        </aside>

        <!-- COL 2: Canvas editor -->
        <main class="col-canvas" [class.mobile-active]="mobileTab()==='editar'">
          <div class="meta-bar">
            <input class="code-ghost" [(ngModel)]="form.codigo" placeholder="CODIGO_PLANTILLA" style="text-transform:uppercase;" />
            <div style="display:flex;align-items:center;gap:10px;">
              <div class="ch-toggle">
                <button type="button" [class.ch-toggle--on]="form.channel==='EMAIL'" (click)="setChannel('EMAIL')">Email</button>
                <button type="button" [class.ch-toggle--on]="form.channel==='WHATSAPP'" (click)="setChannel('WHATSAPP')">WhatsApp</button>
              </div>
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;font-weight:500;color:rgba(30,35,46,.65);cursor:pointer;user-select:none;">
                <input type="checkbox" [(ngModel)]="form.activa" style="accent-color:var(--rr-600);cursor:pointer;" /> Activa
              </label>
            </div>
          </div>

          <div class="studio-toolbar">
            <span class="studio-toolbar-title">Insertar bloque</span>
            <div class="studio-toolbar-actions">
              @for (s of snippets; track s.label) {
                <button type="button" class="snippet-btn" (click)="insertSnippet(s.text)">{{ s.label }}</button>
              }
            </div>
          </div>

          <div #editorFrame class="canvas-card" [class.canvas-card--drag]="dragging()"
               (drop)="dropVariable($event,'message')" (dragover)="previewDrop($event)"
               (dragenter)="dragging.set(true)" (dragleave)="clearDropState()">
            @if (dropMarker(); as m) {
              <span class="drop-cursor" [style.left.px]="m.left" [style.top.px]="m.top" [style.height.px]="m.height"></span>
            }
            @if (form.channel==='EMAIL') {
              <div class="subject-wrap">
                <textarea #subjectInput class="subject-ghost subject-ghost-area" [(ngModel)]="form.asunto" placeholder="Asunto del correo..." rows="2"
                  (drop)="dropVariable($event,'subject')" (dragover)="allowDrop($event)"></textarea>
              </div>
              <div class="subject-divider"></div>
            }
            <div #messageEditor class="template-composer"
              [class.template-composer--email]="form.channel==='EMAIL'"
              [class.template-composer--wa]="form.channel==='WHATSAPP'"
              contenteditable="true" role="textbox" aria-multiline="true"
              [attr.data-placeholder]="form.channel==='EMAIL' ? 'Escribe el cuerpo del correo...' : 'Escribe el mensaje de WhatsApp. Arrastra variables desde la derecha.'"
              (input)="syncMessageFromEditor()" (click)="handleEditorClick($event)"
              (keydown)="handleEditorKeydown($event)" (keyup)="rememberEditorRange()"
              (mouseup)="rememberEditorRange()" (paste)="pastePlainText($event)">
            </div>
            <div class="canvas-footer">
              <div style="display:flex;flex-wrap:wrap;gap:5px;flex:1;min-width:0;">
                @for (tok of usedVariables(); track tok) {
                  <button type="button" class="used-tag" (click)="insertVariable(tok,'message')">{{ '{' + tok + '}' }}</button>
                } @empty {
                  <span style="font-size:11px;color:var(--n-400);">Las variables usadas aparecerán aquí.</span>
                }
              </div>
              <span style="font-size:11px;color:var(--n-400);white-space:nowrap;flex-shrink:0;">{{ form.message.length }} chars</span>
            </div>
          </div>

          <div class="actions-bar">
            <div style="display:flex;align-items:center;gap:4px;">
              <button type="button" (click)="undo()" [disabled]="history.length===0" class="icon-btn" title="Deshacer">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5C2.5 4.29 4.29 2.5 6.5 2.5c1.74 0 3.23 1.05 3.88 2.56M2.5 6.5V3.5M2.5 6.5H5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" (click)="redo()" [disabled]="future.length===0" class="icon-btn" title="Rehacer">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M10.5 6.5C10.5 4.29 8.71 2.5 6.5 2.5c-1.74 0-3.23 1.05-3.88 2.56M10.5 6.5V3.5M10.5 6.5H7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <div style="width:1px;height:16px;background:var(--border);margin:0 4px;"></div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              @if (selected()?.id) {
                <button type="button" (click)="deleteSelected()" class="delete-btn">Eliminar</button>
              }
              <button type="button" (click)="save()" [disabled]="saving()" class="btn-primary" style="border-radius:10px;padding:8px 22px;font-size:13px;">
                {{ saving() ? 'Guardando...' : 'Guardar plantilla' }}
              </button>
            </div>
          </div>
        </main>

        <!-- COL 3: Live preview -->
        <aside class="col-preview" [class.mobile-active]="mobileTab()==='preview'">
          <div class="col-header" style="border-bottom:1px solid var(--border);">
            <span style="font-size:12px;font-weight:600;color:var(--n-700);">Vista previa</span>
            <div class="preview-toggle">
              <button type="button" [class.preview-toggle--on]="previewMode()==='mobile'" (click)="previewMode.set('mobile')" title="Móvil">
                <svg width="10" height="13" viewBox="0 0 10 13" fill="none"><rect x=".7" y=".7" width="8.6" height="11.6" rx="2" stroke="currentColor" stroke-width="1.4"/><circle cx="5" cy="10.5" r=".7" fill="currentColor"/></svg>
              </button>
              <button type="button" [class.preview-toggle--on]="previewMode()==='desktop'" (click)="previewMode.set('desktop')" title="Escritorio">
                <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><rect x=".7" y=".7" width="12.6" height="7.6" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 10.5h5M7 8.3v2.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>

          <div class="preview-scroll">
            @if (previewMode() === 'mobile') {
              @if (form.channel === 'WHATSAPP') {
                <div class="phone-shell">
                  <div class="phone-inner">
                    <div class="phone-notch-bar"><div class="phone-notch"></div></div>
                    <div class="wa-header">
                      <div style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.2);flex-shrink:0;"></div>
                      <div>
                        <p style="color:white;font-size:10px;font-weight:600;margin:0;line-height:1.2;">R&amp;R Importaciones</p>
                        <p style="color:rgba(255,255,255,.65);font-size:8.5px;margin:0;">en línea</p>
                      </div>
                    </div>
                    <div class="wa-chat-area">
                      <div class="wa-bubble">
                        <p class="preview-body">{{ previewText() }}</p>
                        <span class="wa-time">12:34 ✓✓</span>
                      </div>
                    </div>
                    <div class="wa-input-bar">
                      <div class="wa-input-fake">Escribe un mensaje</div>
                      <div class="wa-send-btn">
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 1.5l8 4-8 4V7l5.5-1.5L1.5 4V1.5z" fill="white"/></svg>
                      </div>
                    </div>
                    <div class="phone-home-bar"></div>
                  </div>
                </div>
              } @else {
                <div class="phone-shell">
                  <div class="phone-inner">
                    <div class="phone-notch-bar"><div class="phone-notch"></div></div>
                    <div class="mail-mobile-header">
                      <p style="font-size:11px;font-weight:700;color:#1a1a1a;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ renderText(form.asunto || 'Sin asunto') }}</p>
                      <p style="font-size:9.5px;color:#888;margin:3px 0 0;">R&amp;R Importaciones</p>
                    </div>
                    <div class="mail-mobile-body"><p class="preview-body">{{ previewText() }}</p></div>
                    <div class="phone-home-bar"></div>
                  </div>
                </div>
              }
            } @else {
              @if (form.channel === 'EMAIL') {
                <div class="mail-window">
                  <div class="mail-chrome">
                    <span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span>
                    <span style="flex:1;text-align:center;font-size:10.5px;color:#666;font-weight:500;">Mail</span>
                  </div>
                  <div class="mail-meta">
                    <div class="mail-avatar">R</div>
                    <div style="flex:1;min-width:0;">
                      <p style="font-size:11.5px;font-weight:600;color:#1a1a1a;margin:0;">R&amp;R Importaciones</p>
                      <p style="font-size:9.5px;color:#888;margin:1px 0 0;">contacto&#64;rrimportaciones.com</p>
                    </div>
                  </div>
                  <div class="mail-subject">{{ renderText(form.asunto || 'Sin asunto') }}</div>
                  <div style="height:1px;background:#F0F0F0;margin:0 14px;"></div>
                  <div class="mail-body"><p class="preview-body">{{ previewText() }}</p></div>
                </div>
              } @else {
                <div class="wa-web-shell">
                  <div class="wa-web-sidebar">
                    <div style="padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.06);">
                      <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.2);"></div>
                    </div>
                    <div style="padding:8px 6px;">
                      <div style="background:rgba(255,255,255,.10);border-radius:6px;padding:7px 8px;">
                        <p style="font-size:9.5px;font-weight:600;color:white;margin:0 0 1px;">R&amp;R Import.</p>
                        <p style="font-size:8.5px;color:rgba(255,255,255,.45);margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ (form.message || '...').substring(0,24) }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="wa-web-main">
                    <div class="wa-web-header">
                      <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.25);flex-shrink:0;"></div>
                      <div>
                        <p style="font-size:10.5px;font-weight:600;color:white;margin:0;">R&amp;R Importaciones</p>
                        <p style="font-size:8.5px;color:rgba(255,255,255,.6);margin:0;">en línea</p>
                      </div>
                    </div>
                    <div class="wa-web-chat">
                      <div class="wa-web-bubble">
                        <p class="preview-body">{{ previewText() }}</p>
                        <span class="wa-time" style="color:#9E9E9E;">12:34 ✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        </aside>

        <!-- COL 4: Variables -->
        <aside class="col-vars" [class.mobile-active]="mobileTab()==='variables'">
          <div class="col-header" style="border-bottom:1px solid var(--border);">
            <span style="font-size:12px;font-weight:600;color:var(--n-700);">Variables</span>
            <span style="font-size:10px;color:var(--n-400);">Arrastra o clic</span>
          </div>
          @if (selectedVariable(); as key) {
            <div class="selected-var-box">
              <p class="selected-var-title">Seleccionada</p>
              <p style="font-size:12px;font-weight:600;color:var(--n-800);margin-bottom:2px;">{{ variableLabel(key) }}</p>
              <p style="font-size:10px;color:var(--n-500);font-family:var(--font-mono);">{{ '{' + key + '}' }}</p>
              <button type="button" (click)="removeSelectedChip()" class="btn-quitar">Quitar</button>
            </div>
          }
          <div class="vars-scroll">
            @for (category of variableCategories; track category) {
              <div style="margin-bottom:14px;">
                <div class="var-cat-header">
                  <span class="var-cat-dot" [style.background]="categoryDot(category)"></span>
                  {{ category }}
                </div>
                @for (v of variablesByCategory(category); track v.key) {
                  <button type="button" draggable="true"
                    (dragstart)="startDrag($event,v.key)"
                    (dragend)="clearDropState()"
                    (click)="insertVariable(v.key,'message')"
                    class="var-chip">
                    <svg class="var-chip-dots" width="8" height="12" viewBox="0 0 8 12" fill="none">
                      <circle cx="2" cy="2"  r="1" fill="currentColor"/>
                      <circle cx="6" cy="2"  r="1" fill="currentColor"/>
                      <circle cx="2" cy="6"  r="1" fill="currentColor"/>
                      <circle cx="6" cy="6"  r="1" fill="currentColor"/>
                      <circle cx="2" cy="10" r="1" fill="currentColor"/>
                      <circle cx="6" cy="10" r="1" fill="currentColor"/>
                    </svg>
                    <span class="var-cat-pip" [style.background]="categoryDot(category)"></span>
                    <div style="flex:1;min-width:0;text-align:left;">
                      <span style="display:block;font-size:11.5px;font-weight:500;color:var(--n-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ v.label }}</span>
                      <span style="display:block;font-size:10px;color:var(--n-400);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ v.sample }}</span>
                    </div>
                  </button>
                }
              </div>
            }
          </div>
        </aside>

      </div>
    </div>
  `,
  styles: [`
    .mobile-tabbar { display: none; }

    .workspace-shell {
      display: grid;
      grid-template-columns: 178px 208px minmax(420px, 1fr) 236px;
      grid-template-areas: "list vars canvas preview";
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-xl);
      min-height: calc(100vh - 250px);
    }

    /* ── Side panels base ── */
    .col-list, .col-vars { background: #FAFBFC; display: flex; flex-direction: column; overflow: hidden; }
    .col-list { grid-area: list; border-right: 1px solid var(--border); }
    .col-vars { grid-area: vars; border-right: 1px solid var(--border); }
    .col-header { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; flex-shrink: 0; }

    .status-toast {
      position: fixed; right: 24px; bottom: 24px; z-index: 80;
      display: flex; align-items: center; gap: 9px;
      padding: 12px 16px; border-radius: 14px; font-size: 13px; font-weight: 700;
      box-shadow: 0 18px 38px rgba(13,16,23,.18);
      animation: toast-in 180ms ease-out;
    }
    .status-toast--success { background: #ECFDF3; border: 1px solid #BBF7D0; color: #166534; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

    /* ── Template list ── */
    .tpl-list-scroll { flex: 1; overflow-y: auto; padding: 8px; }
    .tpl-row {
      position: relative; display: flex; flex-direction: column;
      width: 100%; padding: 9px 12px; border-radius: 10px;
      border: none; background: transparent; cursor: pointer;
      margin-bottom: 2px; transition: background 120ms; box-shadow: none;
    }
    .tpl-row:hover { background: white; }
    .tpl-row:hover:not(:disabled) { transform: none; box-shadow: none; }
    .tpl-row:active:not(:disabled) { transform: none; }
    .tpl-row--active { background: white; box-shadow: var(--shadow-sm); }
    .tpl-row--active::before {
      content: ''; position: absolute; left: 0; top: 8px; bottom: 8px;
      width: 2.5px; border-radius: 0 2px 2px 0; background: var(--rr-600);
    }
    .tpl-row--active:hover:not(:disabled) { box-shadow: var(--shadow-sm); }
    .ch-badge { font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 4px; flex-shrink: 0; }
    .ch-email { background: #DBEAFE; color: #1E40AF; }
    .ch-wa    { background: #DCFCE7; color: #166534; }
    .btn-nueva {
      display: flex; align-items: center; gap: 4px; padding: 4px 9px;
      border-radius: 7px; background: var(--rr-600); color: white;
      font-size: 11px; font-weight: 600; border: none; cursor: pointer;
      box-shadow: none; transition: background 140ms;
    }
    .btn-nueva:hover:not(:disabled) { background: var(--rr-700); transform: none; box-shadow: none; }
    .btn-nueva:active:not(:disabled) { transform: none; }

    /* ── Canvas column ── */
    .col-canvas {
      grid-area: canvas;
      display: flex; flex-direction: column; gap: 12px; padding: 18px 20px;
      background-color: #EDEEF2;
      background-image: radial-gradient(circle, #C5C8D6 1px, transparent 1px);
      background-size: 22px 22px;
      overflow-y: auto;
    }
    .meta-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; }
    .code-ghost {
      background: white; border: 1px solid var(--border); border-radius: 8px;
      padding: 6px 10px; font-size: 12px; font-weight: 600; color: var(--n-700);
      outline: none; width: 100%; max-width: 260px;
      font-family: var(--font-mono); letter-spacing: 0.4px;
      transition: border-color 150ms, box-shadow 150ms;
    }
    .code-ghost:focus { border-color: var(--rr-600); box-shadow: 0 0 0 3px rgba(198,29,38,.10); }
    .ch-toggle { display: flex; background: rgba(0,0,0,.09); border-radius: 8px; padding: 2px; }
    .ch-toggle button {
      padding: 4px 14px; border-radius: 6px; font-size: 12px; font-weight: 500;
      color: rgba(30,35,46,.5); background: transparent; border: none; cursor: pointer;
      transition: all 140ms; box-shadow: none;
    }
    .ch-toggle button:hover:not(:disabled) { color: rgba(30,35,46,.8); transform: none; box-shadow: none; }
    .ch-toggle button:active:not(:disabled) { transform: none; }
    .ch-toggle button.ch-toggle--on { background: white; color: var(--n-900); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.12); }

    .studio-toolbar {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px 10px; border: 1px solid rgba(255,255,255,.78);
      background: rgba(255,255,255,.76); border-radius: 12px;
      box-shadow: 0 10px 24px rgba(13,16,23,.08);
      backdrop-filter: blur(12px); flex-shrink: 0;
    }
    .studio-toolbar-title {
      font-size: 11px; font-weight: 800; letter-spacing: .7px;
      color: var(--n-500); text-transform: uppercase; white-space: nowrap;
    }
    .studio-toolbar-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

    .canvas-card {
      background: white; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(13,16,23,.10), 0 2px 8px rgba(13,16,23,.06), 0 0 0 1px rgba(13,16,23,.04);
      display: flex; flex-direction: column; flex: 1; min-height: 420px;
      position: relative; overflow: hidden; transition: box-shadow 200ms;
    }
    .canvas-card--drag { box-shadow: 0 0 0 2px var(--rr-600), 0 8px 32px rgba(13,16,23,.12); }

    .drop-cursor {
      position: absolute; width: 2px; border-radius: 2px;
      background: var(--rr-600); box-shadow: 0 0 0 3px rgba(198,29,38,.14);
      pointer-events: none; z-index: 10;
      animation: blink-cursor 900ms ease-in-out infinite;
    }
    @keyframes blink-cursor { 0%,100% { opacity:1; } 50% { opacity:.3; } }

    .subject-ghost {
      width: 100%; background: transparent; border: none; outline: none;
      font-size: 19px; font-weight: 700; color: var(--n-900);
      font-family: 'Onest', var(--font-body); caret-color: var(--rr-600); letter-spacing: -0.3px;
    }
    .subject-ghost::placeholder { color: var(--n-300); font-weight: 400; }
    .subject-wrap { padding: 32px 44px 0; }
    .subject-divider { height: 1px; background: var(--border); margin: 18px 44px 0; }
    .subject-ghost-area {
      display: block; min-height: 58px; resize: none; overflow: hidden;
      line-height: 1.35;
    }

    .template-composer {
      flex: 1; min-height: 260px; white-space: pre-wrap; overflow-wrap: anywhere;
      caret-color: var(--rr-600); font-family: 'Onest', var(--font-body);
      font-size: 14.5px; line-height: 1.9; color: var(--n-800); outline: none;
    }
    .template-composer--email { padding: 20px 44px 32px; }
    .template-composer--wa { padding: 32px 44px; }
    .template-composer:empty::before { content: attr(data-placeholder); color: var(--n-300); pointer-events: none; }

    .canvas-footer {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 10px 44px 14px; border-top: 1px solid var(--n-100);
    }
    .used-tag {
      display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 5px;
      background: var(--n-100); border: 1px solid var(--border);
      font-size: 10.5px; font-weight: 600; color: var(--n-600);
      cursor: pointer; font-family: var(--font-mono); transition: all 120ms; box-shadow: none;
    }
    .used-tag:hover:not(:disabled) { background: var(--rr-50); border-color: rgba(198,29,38,.25); color: var(--rr-700); transform: none; box-shadow: none; }
    .used-tag:active:not(:disabled) { transform: none; }

    .actions-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-shrink: 0; }
    .icon-btn {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--border);
      background: white; color: var(--n-600); cursor: pointer; transition: all 140ms; box-shadow: none;
    }
    .icon-btn:hover:not(:disabled) { border-color: var(--border-strong); color: var(--n-800); box-shadow: var(--shadow-xs); transform: none; }
    .icon-btn:active:not(:disabled) { transform: none; }
    .icon-btn:disabled { opacity: .28; cursor: not-allowed; }
    .snippet-btn {
      padding: 5px 10px; border-radius: 7px; border: 1px solid var(--border);
      background: white; font-size: 11.5px; font-weight: 500; color: var(--n-600);
      cursor: pointer; transition: all 140ms; box-shadow: none;
    }
    .snippet-btn:hover:not(:disabled) { border-color: var(--border-strong); color: var(--n-800); box-shadow: var(--shadow-xs); transform: none; }
    .snippet-btn:active:not(:disabled) { transform: none; }
    .delete-btn {
      font-size: 12px; font-weight: 600; color: var(--red);
      background: none; border: none; cursor: pointer;
      padding: 6px 10px; border-radius: 8px; transition: all 140ms; box-shadow: none;
    }
    .delete-btn:hover:not(:disabled) { background: var(--red-soft); transform: none; box-shadow: none; }
    .delete-btn:active:not(:disabled) { transform: none; }

    /* ── Preview column ── */
    .col-preview {
      grid-area: preview;
      background: #EDEEF2; border-left: 1px solid var(--border);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .preview-toggle { display: flex; background: var(--n-200); border-radius: 7px; padding: 2px; gap: 1px; }
    .preview-toggle button {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 22px; border-radius: 5px; border: none;
      background: transparent; color: var(--n-400); cursor: pointer;
      transition: all 130ms; box-shadow: none;
    }
    .preview-toggle button:hover:not(:disabled) { color: var(--n-600); transform: none; box-shadow: none; }
    .preview-toggle button:active:not(:disabled) { transform: none; }
    .preview-toggle button.preview-toggle--on { background: white; color: var(--n-800); box-shadow: var(--shadow-xs); }
    .preview-scroll {
      flex: 1; overflow-y: auto; padding: 20px 16px 24px;
      display: flex; flex-direction: column; align-items: center;
    }
    .preview-body { font-size: 11.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; margin: 0; }

    /* Phone shell */
    .phone-shell {
      width: 206px; background: #1C1C1E; border-radius: 42px; padding: 8px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,.10), 0 28px 56px rgba(0,0,0,.55), 0 0 0 .5px #000;
    }
    .phone-inner { background: white; border-radius: 34px; overflow: hidden; display: flex; flex-direction: column; height: 370px; min-height: 0; }
    .phone-notch-bar { background: #1C1C1E; height: 22px; display: flex; justify-content: center; align-items: flex-end; padding-bottom: 4px; }
    .phone-notch { width: 68px; height: 10px; background: #1C1C1E; border-radius: 0 0 9px 9px; }
    .phone-home-bar { background: white; height: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .phone-home-bar::after { content: ''; width: 52px; height: 4px; background: #1C1C1E; border-radius: 2px; opacity: .22; }

    /* WhatsApp mobile */
    .wa-header { background: #075E54; padding: 8px 12px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .wa-chat-area { flex: 1 1 auto; min-height: 0; background: #ECE5DD; padding: 8px 7px; overflow-y: auto; }
    .wa-bubble { background: #DCF8C6; border-radius: 8px 8px 2px 8px; padding: 7px 9px 4px; max-width: 90%; margin-left: auto; box-shadow: 0 1px 2px rgba(0,0,0,.09); }
    .wa-time { display: block; font-size: 9px; color: #7d7d7d; text-align: right; margin-top: 3px; }
    .wa-input-bar { background: #F0F0F0; padding: 5px 8px; display: flex; align-items: center; gap: 6px; border-top: 1px solid #E0E0E0; flex-shrink: 0; }
    .wa-input-fake { flex: 1; background: white; border-radius: 18px; padding: 5px 10px; font-size: 9.5px; color: #bbb; }
    .wa-send-btn { width: 26px; height: 26px; border-radius: 50%; background: #25D366; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

    /* Email mobile */
    .mail-mobile-header { background: #F5F5F5; padding: 10px 12px; border-bottom: 1px solid #E8E8E8; flex-shrink: 0; }
    .mail-mobile-body { flex: 1 1 auto; min-height: 0; padding: 10px 12px; overflow-y: auto; background: white; }

    /* macOS Mail */
    .mail-window { width: 100%; background: white; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); box-shadow: var(--shadow-lg); }
    .mail-chrome { background: #E8E8E8; padding: 8px 12px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #D0D0D0; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-red { background: #FF5F57; } .dot-yellow { background: #FEBC2E; } .dot-green { background: #28C840; }
    .mail-meta { display: flex; align-items: center; gap: 10px; padding: 12px 14px 8px; }
    .mail-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--rr-600); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: 700; flex-shrink: 0; }
    .mail-subject { font-size: 15px; font-weight: 700; color: #1a1a1a; padding: 0 14px 10px; }
    .mail-body { padding: 14px; max-height: 260px; overflow-y: auto; }

    /* WhatsApp Web */
    .wa-web-shell { width: 100%; border-radius: 10px; overflow: hidden; display: flex; border: 1px solid var(--border); box-shadow: var(--shadow-lg); min-height: 280px; }
    .wa-web-sidebar { width: 68px; background: #111B21; display: flex; flex-direction: column; flex-shrink: 0; }
    .wa-web-main { flex: 1; display: flex; flex-direction: column; background: #ECE5DD; }
    .wa-web-header { background: #128C7E; padding: 8px 10px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .wa-web-chat { flex: 1; padding: 10px 8px; overflow-y: auto; }
    .wa-web-bubble { background: #DCF8C6; border-radius: 8px 8px 2px 8px; padding: 8px 10px 5px; max-width: 88%; margin-left: auto; box-shadow: 0 1px 2px rgba(0,0,0,.09); }

    /* ── Variables column ── */
    .vars-scroll { flex: 1; overflow-y: auto; padding: 10px 10px 16px; }
    .var-cat-header { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .9px; color: var(--n-400); margin-bottom: 5px; padding: 0 2px; }
    .var-cat-dot { width: 6px; height: 6px; border-radius: 2px; flex-shrink: 0; }
    .var-chip {
      display: flex; align-items: center; gap: 6px; width: 100%; padding: 7px 8px;
      border-radius: 9px; background: white; border: 1px solid var(--border);
      cursor: grab; transition: all 140ms; margin-bottom: 3px; box-shadow: none;
    }
    .var-chip:hover { border-color: rgba(198,29,38,.22); box-shadow: var(--shadow-sm); }
    .var-chip:hover:not(:disabled) { transform: none; }
    .var-chip:active:not(:disabled) { cursor: grabbing; transform: scale(1.025) rotate(1.2deg); box-shadow: var(--shadow-lg); border-color: rgba(198,29,38,.4); }
    .var-chip-dots { color: var(--n-300); opacity: 0; transition: opacity 130ms; flex-shrink: 0; }
    .var-chip:hover .var-chip-dots { opacity: 1; }
    .var-cat-pip { width: 6px; height: 6px; border-radius: 2px; flex-shrink: 0; }

    .selected-var-box { margin: 10px 10px 0; padding: 10px 12px; background: #FFF7F7; border: 1px solid rgba(198,29,38,.14); border-radius: 10px; flex-shrink: 0; }
    .selected-var-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--rr-600); margin-bottom: 4px; }
    .btn-quitar { margin-top: 8px; padding: 4px 10px; background: var(--rr-600); color: white; border-radius: 6px; font-size: 11px; font-weight: 600; border: none; cursor: pointer; transition: background 140ms; box-shadow: none; }
    .btn-quitar:hover:not(:disabled) { background: var(--rr-700); transform: none; box-shadow: none; }
    .btn-quitar:active:not(:disabled) { transform: none; }

    /* ── Template chips inside contenteditable ── */
    .template-chip {
      display: inline-flex; align-items: center; gap: 4px; margin: 0 2px;
      padding: 2px 5px 2px 4px; border: 1.5px solid; border-radius: 7px;
      font-size: 11.5px; font-weight: 600; line-height: 1.45;
      white-space: nowrap; vertical-align: middle;
      box-shadow: 0 1px 3px rgba(0,0,0,.07); cursor: default; user-select: none;
      transition: box-shadow 120ms;
    }
    .template-chip:hover { box-shadow: 0 2px 7px rgba(0,0,0,.10); }
    .template-chip.is-selected { box-shadow: 0 0 0 3px rgba(198,29,38,.18); outline: 1.5px solid rgba(198,29,38,.5); }
    .template-chip-dot { width: 6px; height: 6px; border-radius: 2px; flex-shrink: 0; }
    .template-chip__remove {
      display: inline-flex; align-items: center; justify-content: center;
      width: 14px; height: 14px; border: none; border-radius: 3px;
      background: rgba(0,0,0,.08); color: currentColor; cursor: pointer;
      opacity: 0; transition: opacity 120ms, background 120ms; box-shadow: none; line-height: 1;
    }
    .template-chip:hover .template-chip__remove { opacity: 1; }
    .template-chip__remove:hover:not(:disabled) { background: rgba(0,0,0,.18); transform: none; box-shadow: none; }
    .template-chip__remove:active:not(:disabled) { transform: none; }

    @media (max-width: 1240px) {
      .workspace-shell { grid-template-columns: 150px 170px minmax(300px, 1fr) 180px; }
      .col-canvas { padding: 16px; }
      .template-composer--email, .template-composer--wa { padding-left: 34px; padding-right: 34px; }
      .subject-wrap { padding-left: 34px; padding-right: 34px; }
      .subject-divider { margin-left: 34px; margin-right: 34px; }
      .canvas-footer { padding-left: 34px; padding-right: 34px; }
    }

    @media (max-width: 1100px) {
      .mobile-tabbar {
        display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px;
        position: sticky; top: 0; z-index: 20;
        padding: 6px; border: 1px solid var(--border); border-radius: 14px;
        background: rgba(255,255,255,.92); box-shadow: var(--shadow-sm);
        backdrop-filter: blur(14px);
      }
      .mobile-tabbar button {
        min-width: 0; padding: 9px 4px; border: none; border-radius: 10px;
        background: transparent; color: var(--n-500); font-size: 11px;
        font-weight: 700; cursor: pointer; box-shadow: none;
      }
      .mobile-tabbar button:hover:not(:disabled),
      .mobile-tabbar button:active:not(:disabled) { transform: none; box-shadow: none; }
      .mobile-tabbar button.mobile-tabbar--active {
        background: var(--rr-600); color: white; box-shadow: 0 10px 20px rgba(198,29,38,.22);
      }

      .workspace-shell {
        display: block; min-height: auto; overflow: visible; border-radius: 18px;
        box-shadow: var(--shadow-lg);
      }
      .status-toast { left: 14px; right: 14px; bottom: 14px; justify-content: center; }
      .col-list, .col-canvas, .col-preview, .col-vars {
        display: none; min-height: calc(100dvh - 188px); border: none;
      }
      .col-list.mobile-active, .col-canvas.mobile-active,
      .col-preview.mobile-active, .col-vars.mobile-active { display: flex; }

      .col-list, .col-vars, .col-preview { border-radius: 18px; overflow: hidden; }
      .col-canvas {
        padding: 12px; gap: 10px; overflow: visible; border-radius: 18px;
        background-size: 18px 18px;
      }
      .meta-bar { flex-direction: column; align-items: stretch; gap: 8px; }
      .code-ghost { max-width: none; }
      .meta-bar > div { justify-content: space-between; }
      .ch-toggle { width: 100%; }
      .ch-toggle button { flex: 1; padding: 7px 8px; }

      .studio-toolbar { align-items: stretch; flex-direction: column; }
      .studio-toolbar-actions { justify-content: flex-start; }
      .snippet-btn { flex: 1; min-width: 86px; padding: 7px 8px; }

      .canvas-card { min-height: 520px; border-radius: 16px; }
      .subject-wrap { padding: 22px 20px 0; }
      .subject-divider { margin: 14px 20px 0; }
      .subject-ghost { font-size: 17px; }
      .subject-ghost-area { min-height: 70px; }
      .template-composer { min-height: 280px; font-size: 14px; line-height: 1.85; }
      .template-composer--email { padding: 18px 20px 24px; }
      .template-composer--wa { padding: 24px 20px; }
      .canvas-footer {
        padding: 10px 20px 14px; align-items: flex-start; flex-direction: column;
      }
      .actions-bar { align-items: stretch; flex-direction: column; }
      .actions-bar > div { justify-content: space-between; }
      .actions-bar .btn-primary { width: 100%; }
      .delete-btn { flex: 1; text-align: center; }

      .preview-scroll { min-height: calc(100dvh - 240px); padding: 20px 10px 24px; justify-content: flex-start; }
      .phone-shell { width: min(232px, 100%); }
      .phone-inner { height: 405px; }
      .mail-window, .wa-web-shell { max-width: 100%; }

      .tpl-list-scroll, .vars-scroll { max-height: calc(100dvh - 250px); }
      .var-chip { padding: 10px; border-radius: 11px; }
      .var-chip-dots { opacity: 1; }
      .template-chip__remove { opacity: 1; }
    }
  `],
})
export class PlantillasComponent implements AfterViewInit {
  private service = inject(PlantillaMensajeService);
  private notifications = inject(NotificationService);

  @ViewChild('messageEditor') private messageEditor?: ElementRef<HTMLDivElement>;
  @ViewChild('editorFrame')   private editorFrame?:   ElementRef<HTMLDivElement>;
  @ViewChild('subjectInput')  private subjectInput?:  ElementRef<HTMLInputElement | HTMLTextAreaElement>;
  private lastEditorRange: Range | null = null;
  history: string[] = [];
  future:  string[] = [];

  previewMode = signal<PreviewMode>('mobile');
  mobileTab = signal<MobileStudioTab>('editar');

  readonly variableCategories: VariableCategory[] = ['Cliente', 'Vehiculo', 'Cotizacion', 'Sistema'];
  readonly variableOptions: VariableOption[] = [
    { key: 'cliente_nombre',        label: 'Nombre del cliente', sample: 'Juan Perez',                                 category: 'Cliente' },
    { key: 'cliente_apodo',         label: 'Apodo',              sample: 'Juan',                                       category: 'Cliente' },
    { key: 'vehiculo_marca',        label: 'Marca',              sample: 'Ford',                                       category: 'Vehiculo' },
    { key: 'vehiculo_modelo',       label: 'Modelo',             sample: 'F-150',                                      category: 'Vehiculo' },
    { key: 'vehiculo_ano',          label: 'Año',                sample: '2024',                                       category: 'Vehiculo' },
    { key: 'vehiculo_vin',          label: 'VIN',                sample: '1FTFW1E50RFA12345',                          category: 'Vehiculo' },
    { key: 'valor_aduana_usd',      label: 'Valor aduana',       sample: '$18,500.00 USD',                             category: 'Cotizacion' },
    { key: 'impuestos_total',       label: 'Impuestos',          sample: '$74,230.00 MXN',                             category: 'Cotizacion' },
    { key: 'honorarios',            label: 'Honorarios',         sample: '$8,500.00 MXN',                              category: 'Cotizacion' },
    { key: 'total',                 label: 'Total',              sample: '$82,730.00 MXN',                             category: 'Cotizacion' },
    { key: 'fecha_expiracion',      label: 'Vigencia',           sample: '21/05/2026',                                 category: 'Cotizacion' },
    { key: 'url_pdf',               label: 'PDF',                sample: 'https://rrimportaciones.com/cotizacion.pdf', category: 'Cotizacion' },
    { key: 'mensaje_personalizado', label: 'Mensaje extra',      sample: 'Quedo atento a cualquier duda.',             category: 'Sistema' },
    { key: 'fechaActual',           label: 'Fecha actual',       sample: this.currentDateSample(),                     category: 'Sistema' },
  ];

  readonly snippets: TemplateSnippet[] = [
    { label: 'Saludo',  text: 'Hola {cliente_nombre},\n\n' },
    { label: 'Resumen', text: 'Resumen:\n- Valor aduana: {valor_aduana_usd}\n- Impuestos: {impuestos_total}\n- Honorarios: {honorarios}\n- Total: {total}\n\n' },
    { label: 'Cierre',  text: 'Quedo atento a cualquier duda.\n\nSaludos,\nR&R Importaciones' },
  ];

  plantillas       = signal<PlantillaMensajeDto[]>([]);
  selected         = signal<PlantillaMensajeDto | null>(null);
  loading          = signal(false);
  saving           = signal(false);
  dragging         = signal(false);
  dropMarker       = signal<DropMarker | null>(null);
  selectedVariable = signal<string | null>(null);
  message          = signal<string | null>(null);
  error            = signal<string | null>(null);

  form: TemplateForm = this.emptyForm();

  private readonly catColors: Record<string, { bg: string; border: string; dot: string; color: string }> = {
    'Cliente':    { bg: '#EFF6FF', border: 'rgba(59,130,246,.28)',  dot: '#3B82F6', color: '#1E40AF' },
    'Vehiculo':   { bg: '#FFFBEB', border: 'rgba(217,119,6,.28)',   dot: '#D97706', color: '#78350F' },
    'Cotizacion': { bg: '#F0FDF4', border: 'rgba(22,163,74,.28)',   dot: '#16A34A', color: '#14532D' },
    'Sistema':    { bg: '#F5F3FF', border: 'rgba(124,58,237,.28)',  dot: '#7C3AED', color: '#3730A3' },
  };

  categoryDot(cat: VariableCategory): string { return this.catColors[cat]?.dot ?? '#888'; }

  constructor() { this.load(); }
  ngAfterViewInit(): void { this.renderEditorFromMessage(); }

  variableLabel(key: string): string { return this.variableOptions.find(v => v.key === key)?.label ?? key; }

  load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (items) => { this.plantillas.set(items); this.loading.set(false); if (!this.selected() && items.length > 0) this.select(items[0]); },
      error: () => { this.loading.set(false); this.error.set('No se pudieron cargar las plantillas.'); },
    });
  }

  select(p: PlantillaMensajeDto): void {
    this.selected.set(p);
    this.form = { codigo: p.codigo, asunto: this.removeDeprecatedYearVariable(p.asunto), message: this.toEditableMessage(p.cuerpo), activa: p.activa, channel: this.channelFromCode(p.codigo) };
    this.mobileTab.set('editar');
    this.message.set(null); this.error.set(null); this.resetHistory();
    window.setTimeout(() => this.renderEditorFromMessage());
  }

  newTemplate(): void {
    this.selected.set(null); this.form = this.emptyForm();
    this.mobileTab.set('editar');
    this.message.set(null); this.error.set(null); this.resetHistory();
    window.setTimeout(() => this.renderEditorFromMessage());
  }

  setChannel(ch: TemplateChannel): void {
    this.form.channel = ch;
    if (!this.form.codigo.trim()) this.form.codigo = ch === 'EMAIL' ? 'COTIZACION_EMAIL' : 'COTIZACION_WHATSAPP';
    if (ch === 'WHATSAPP') this.form.asunto = null;
  }

  variablesByCategory(cat: VariableCategory): VariableOption[] { return this.variableOptions.filter(v => v.category === cat); }

  startDrag(e: DragEvent, key: string): void {
    e.dataTransfer?.setData('text/plain', key);
    e.dataTransfer?.setData('application/x-rr-variable', key);
    e.dataTransfer?.setDragImage(this.createDragGhost(key), 18, 18);
    this.dragging.set(true);
  }

  allowDrop(e: DragEvent): void { e.preventDefault(); }

  previewDrop(e: DragEvent): void {
    e.preventDefault(); this.dragging.set(true);
    this.placeEditorCaretFromPoint(e.clientX, e.clientY);
    this.updateDropMarker();
  }

  dropVariable(e: DragEvent, target: 'message' | 'subject'): void {
    e.preventDefault();
    const key = e.dataTransfer?.getData('application/x-rr-variable') || e.dataTransfer?.getData('text/plain');
    this.clearDropState();
    if (!key) return;
    if (target === 'message') this.placeEditorCaretFromPoint(e.clientX, e.clientY);
    this.insertVariable(key, target);
  }

  clearDropState(): void { this.dragging.set(false); this.dropMarker.set(null); }

  insertVariable(key: string, target: 'message' | 'subject' = 'message'): void {
    if (target === 'subject') { this.form.asunto = this.insertAtCursor(this.form.asunto ?? '', `{${key}}`, this.subjectInput?.nativeElement); return; }
    this.insertTokenIntoEditor(key);
  }

  save(): void {
    if (!this.form.codigo.trim()) { this.error.set('El código interno es obligatorio.'); return; }
    if (!this.form.message.trim()) { this.error.set('El mensaje es obligatorio.'); return; }
    this.saving.set(true); this.message.set(null); this.error.set(null);
    const req: GuardarPlantillaMensajeRequest = {
      codigo: this.form.codigo.trim().toUpperCase(),
      asunto: this.form.channel === 'EMAIL' ? this.clean(this.form.asunto) : null,
      cuerpo: this.technicalOutput(), variablesDisponibles: this.variablesJson(), activa: this.form.activa,
    };
    const cur = this.selected();
    (cur?.id ? this.service.actualizar(cur.id, req) : this.service.crear(req)).subscribe({
      next: (saved) => { this.saving.set(false); this.select(saved); this.message.set('Plantilla actualizada y guardada.'); this.load(); },
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.message || 'No se pudo guardar.'); },
    });
  }

  async deleteSelected(): Promise<void> {
    const cur = this.selected();
    if (!cur?.id) return;
    const confirmed = await this.notifications.confirm({
      title: 'Eliminar plantilla',
      message: 'La plantilla dejara de estar disponible para envios nuevos.',
      detail: cur.codigo,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;
    this.service.eliminar(cur.id).subscribe({
      next: () => { this.newTemplate(); this.load(); this.message.set('Plantilla eliminada.'); },
      error: () => this.error.set('No se pudo eliminar.'),
    });
  }

  usedVariables(): string[] { return this.detectVariables(); }

  syncMessageFromEditor(): void {
    const ed = this.messageEditor?.nativeElement;
    if (!ed) return;
    this.form.message = this.extractEditorText(ed);
    this.rememberEditorRange();
  }

  handleEditorClick(e: MouseEvent): void {
    const t = e.target as HTMLElement;
    const rm = t.closest('.template-chip__remove') as HTMLButtonElement | null;
    if (rm) { e.preventDefault(); this.removeChipElement(rm.closest('.template-chip') as HTMLElement | null); return; }
    this.selectChip(t.closest('.template-chip') as HTMLElement | null);
    this.rememberEditorRange();
  }

  handleEditorKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { this.selectChip(null); return; }
    if ((e.key === 'Backspace' || e.key === 'Delete') && this.selectedVariable()) { e.preventDefault(); this.removeSelectedChip(); }
  }

  removeSelectedChip(): void {
    const ed = this.messageEditor?.nativeElement;
    if (!ed) return;
    this.removeChipElement(ed.querySelector('.template-chip.is-selected') as HTMLElement | null);
  }

  insertSnippet(text: string): void { this.insertTextIntoEditor(text); this.renderEditorFromMessage(); }
  undo(): void { const p = this.history.pop(); if (p===undefined) return; this.future.push(this.form.message); this.form.message=p; this.renderEditorFromMessage(); }
  redo(): void { const n = this.future.pop(); if (n===undefined) return; this.history.push(this.form.message); this.form.message=n; this.renderEditorFromMessage(); }

  rememberEditorRange(): void {
    const ed = this.messageEditor?.nativeElement, sel = window.getSelection();
    if (!ed || !sel || sel.rangeCount===0) return;
    const r = sel.getRangeAt(0);
    if (ed.contains(r.commonAncestorContainer)) this.lastEditorRange = r.cloneRange();
  }

  pastePlainText(e: ClipboardEvent): void { e.preventDefault(); this.insertTextIntoEditor(e.clipboardData?.getData('text/plain') ?? ''); }

  previewText(): string { return this.renderText(this.form.message || 'Escribe un mensaje para ver la vista previa.'); }
  previewHtml(): string { return this.buildEmailHtml(this.previewText()); }
  technicalOutput(): string { return this.form.channel === 'EMAIL' ? this.buildEmailHtml(this.form.message) : this.form.message.trim(); }
  variablesJson(): string { return JSON.stringify(this.detectVariables(), null, 2); }
  renderText(value: string): string { return this.variableOptions.reduce((t, v) => t.replaceAll(`{${v.key}}`, v.sample), value); }
  plainText(value: string): string { return this.toEditableMessage(value).replace(/\s+/g,' ').trim(); }
  channelFromCode(code: string): TemplateChannel { return code.toUpperCase().includes('WHATSAPP') ? 'WHATSAPP' : 'EMAIL'; }
  channelClass(ch: TemplateChannel): string { return ch==='EMAIL' ? 'bg-[#DBEAFE] text-[#1E40AF]' : 'bg-[#DCFCE7] text-[#166534]'; }

  private emptyForm(): TemplateForm {
    return {
      codigo: 'COTIZACION_EMAIL',
      asunto: 'Cotización R&R Importaciones - {vehiculo_marca} {vehiculo_modelo} {vehiculo_ano}',
      message: 'Hola {cliente_nombre},\n\nTe compartimos la cotización para importar tu {vehiculo_marca} {vehiculo_modelo} {vehiculo_ano}.\n\nTotal: {total}\nFecha de envío: {fechaActual}\n\nEl PDF adjunto incluye el desglose completo y la vigencia.\n\nSaludos,\nR&R Importaciones',
      activa: true, channel: 'EMAIL',
    };
  }

  private insertAtCursor(cur: string, tok: string, inp?: HTMLInputElement | HTMLTextAreaElement): string {
    if (!inp) return cur ? `${cur} ${tok}` : tok;
    const s = inp.selectionStart ?? cur.length, e = inp.selectionEnd ?? cur.length;
    const pre = cur.slice(0,s), suf = cur.slice(e);
    const nb = pre.length>0 && !/[\s({[]$/.test(pre), na = suf.length>0 && !/^[\s,.;:!?)}\]]/.test(suf);
    window.setTimeout(() => { inp.focus(); inp.setSelectionRange(pre.length+(nb?1:0)+tok.length, pre.length+(nb?1:0)+tok.length); });
    return `${pre}${nb?' ':''}${tok}${na?' ':''}${suf}`;
  }

  private renderEditorFromMessage(): void {
    const ed = this.messageEditor?.nativeElement;
    if (!ed) return;
    ed.replaceChildren();
    const rx = /\{([a-zA-Z0-9_]+)\}/g;
    let last = 0;
    for (const m of this.form.message.matchAll(rx)) {
      if (m.index > last) ed.append(document.createTextNode(this.form.message.slice(last, m.index)));
      ed.append(this.createTokenChip(m[1]));
      last = m.index + m[0].length;
    }
    if (last < this.form.message.length) ed.append(document.createTextNode(this.form.message.slice(last)));
  }

  private insertTokenIntoEditor(key: string): void {
    const ed = this.messageEditor?.nativeElement;
    if (!ed) { this.form.message = this.form.message ? `${this.form.message} {${key}}` : `{${key}}`; return; }
    this.pushHistory(); ed.focus();
    const range = this.validEditorRange() ?? this.rangeAtEditorEnd(ed);
    range.deleteContents();
    const chip = this.createTokenChip(key), sp = document.createTextNode(' ');
    range.insertNode(sp); range.insertNode(chip);
    const nr = document.createRange(); nr.setStartAfter(sp); nr.collapse(true);
    this.applySelection(nr); this.syncMessageFromEditor(); this.selectChip(chip);
  }

  private insertTextIntoEditor(text: string): void {
    const ed = this.messageEditor?.nativeElement;
    if (!ed) return;
    this.pushHistory();
    const range = this.validEditorRange() ?? this.rangeAtEditorEnd(ed);
    range.deleteContents();
    const node = document.createTextNode(text); range.insertNode(node);
    const nr = document.createRange(); nr.setStartAfter(node); nr.collapse(true);
    this.applySelection(nr); this.syncMessageFromEditor();
  }

  private placeEditorCaretFromPoint(x: number, y: number): void {
    const ed = this.messageEditor?.nativeElement;
    if (!ed) return;
    const doc = document as Document & {
      caretPositionFromPoint?: (x:number,y:number) => {offsetNode:Node;offset:number}|null;
      caretRangeFromPoint?:    (x:number,y:number) => Range|null;
    };
    const pos = doc.caretPositionFromPoint?.(x,y);
    if (pos && ed.contains(pos.offsetNode)) {
      const r = document.createRange(); r.setStart(pos.offsetNode,pos.offset); r.collapse(true);
      this.lastEditorRange = r; this.applySelection(r); return;
    }
    const r = doc.caretRangeFromPoint?.(x,y);
    if (r && ed.contains(r.commonAncestorContainer)) { this.lastEditorRange = r; this.applySelection(r); }
  }

  private updateDropMarker(): void {
    const frame = this.editorFrame?.nativeElement, range = this.validEditorRange();
    if (!frame || !range) return;
    const rect = range.getBoundingClientRect(), fr = frame.getBoundingClientRect();
    if (rect.width===0 && rect.height===0) { this.dropMarker.set({left:44,top:44,height:24}); return; }
    this.dropMarker.set({ left: Math.max(10,rect.left-fr.left), top: Math.max(10,rect.top-fr.top), height: Math.max(22,rect.height) });
  }

  private selectChip(chip: HTMLElement|null): void {
    this.messageEditor?.nativeElement?.querySelectorAll('.template-chip.is-selected').forEach(n => n.classList.remove('is-selected'));
    if (!chip) { this.selectedVariable.set(null); return; }
    chip.classList.add('is-selected'); this.selectedVariable.set(chip.dataset['token'] ?? null);
  }

  private removeChipElement(chip: HTMLElement|null): void {
    if (!chip) return;
    this.pushHistory();
    const r = document.createRange(); r.setStartAfter(chip); r.collapse(true);
    chip.remove(); this.applySelection(r); this.selectChip(null); this.syncMessageFromEditor();
  }

  private createDragGhost(key: string): HTMLElement {
    const opt = this.variableOptions.find(v => v.key===key);
    const cfg = this.catColors[opt?.category ?? 'Sistema'];
    const g = document.createElement('div');
    g.style.cssText = `position:fixed;top:-1000px;left:-1000px;padding:7px 14px;border-radius:8px;background:${cfg.bg};border:1.5px solid ${cfg.border};color:${cfg.color};font:600 12px 'Onest',system-ui;box-shadow:0 12px 28px rgba(0,0,0,.18);white-space:nowrap;`;
    g.textContent = opt?.label ?? key;
    document.body.appendChild(g); window.setTimeout(() => g.remove(), 0);
    return g;
  }

  private pushHistory(): void {
    const s = this.form.message;
    if (this.history[this.history.length-1] !== s) { this.history.push(s); if (this.history.length>40) this.history.shift(); }
    this.future = [];
  }

  private resetHistory(): void { this.history=[]; this.future=[]; this.selectedVariable.set(null); }

  private createTokenChip(key: string): HTMLSpanElement {
    const opt = this.variableOptions.find(v => v.key===key);
    const cfg = this.catColors[opt?.category ?? 'Sistema'] ?? this.catColors['Sistema'];
    const chip = document.createElement('span');
    chip.className = 'template-chip';
    chip.dataset['token'] = key;
    chip.contentEditable = 'false';
    chip.title = `{${key}}`;
    chip.style.cssText = `background:${cfg.bg};border-color:${cfg.border};color:${cfg.color};`;
    const dot = document.createElement('span'); dot.className='template-chip-dot'; dot.style.background=cfg.dot; chip.append(dot);
    const label = document.createElement('span'); label.className='template-chip-label'; label.textContent=opt?.label??key; chip.append(label);
    const rm = document.createElement('button'); rm.type='button'; rm.className='template-chip__remove';
    rm.setAttribute('aria-label',`Quitar ${opt?.label??key}`);
    rm.innerHTML=`<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
    chip.append(rm);
    return chip;
  }

  private extractEditorText(root: Node): string {
    let out = '';
    root.childNodes.forEach(node => {
      if (node.nodeType===Node.TEXT_NODE) { out += node.textContent??''; return; }
      if (node instanceof HTMLBRElement) { out += '\n'; return; }
      if (node instanceof HTMLElement) {
        const tok = node.dataset['token'];
        if (tok) { out += `{${tok}}`; return; }
        const bl = out.length; out += this.extractEditorText(node);
        if ((node instanceof HTMLDivElement||node instanceof HTMLParagraphElement) && out.length>bl && !out.endsWith('\n')) out += '\n';
      }
    });
    return out.replace(/ /g, ' ');
  }

  private validEditorRange(): Range|null {
    const ed = this.messageEditor?.nativeElement;
    if (!ed||!this.lastEditorRange||!ed.contains(this.lastEditorRange.commonAncestorContainer)) return null;
    return this.lastEditorRange.cloneRange();
  }

  private rangeAtEditorEnd(ed: HTMLDivElement): Range {
    const r = document.createRange(); r.selectNodeContents(ed); r.collapse(false); return r;
  }

  private applySelection(r: Range): void {
    const sel = window.getSelection(); if (!sel) return;
    sel.removeAllRanges(); sel.addRange(r); this.lastEditorRange = r.cloneRange();
  }

  private buildEmailHtml(message: string): string {
    return message.trim().split(/\n{2,}/).map(p=>p.trim()).filter(Boolean)
      .map(p=>`<p>${this.escapeHtml(p).replace(/\n/g,'<br>')}</p>`).join('\n');
  }

  private toEditableMessage(value: string): string {
    return value.replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>\s*<p>/gi,'\n\n')
      .replace(/^<p>/i,'').replace(/<\/p>$/i,'').replace(/<[^>]+>/g,'')
      .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/\s*\{vehiculo_año\}/g, '')
      .trim();
  }

  private removeDeprecatedYearVariable(value: string | null): string | null {
    return value?.replace(/\s*\{vehiculo_año\}/g, '').trim() || null;
  }

  private detectVariables(): string[] {
    const used = new Set<string>();
    for (const m of this.form.message.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) used.add(m[1]);
    if (this.form.asunto) for (const m of this.form.asunto.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) used.add(m[1]);
    return [...used].sort((a,b)=>a.localeCompare(b));
  }

  private clean(v: string|null): string|null { return v?.trim()||null; }
  private escapeHtml(v: string): string { return v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  private currentDateSample(): string {
    return new Date().toLocaleString('es-MX',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  }
}
