import re

with open("C:/Codigos/RRImportaciones/frontend/src/app/pages/campo/campo-captura.component.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace("import { RealtimeService } from '../../services/realtime.service';",
"""import { RealtimeService } from '../../services/realtime.service';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';""")

# 2. CameraMode type
content = content.replace("type CaptureState = 'loading' | 'ready' | 'sending' | 'error';",
"""type CaptureState = 'loading' | 'ready' | 'sending' | 'error';
type CameraMode = 'photo' | 'vin';""")

# 3. Signals
content = content.replace("cameraOpen = signal(false);",
"""cameraOpen = signal(false);
  cameraMode = signal<CameraMode>('photo');
  private zxingReader: BrowserMultiFormatReader | null = null;""")

# 4. Scanner Button
content = content.replace("""<span class="field-label">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                class="field-icon"
              >
                <rect x="2" y="4" width="16" height="12" rx="2" />
                <path stroke-linecap="round" d="M5 8h5M5 12h3" />
              </svg>
              VIN confirmado (últimos 6)
            </span>""",
"""<div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 6px;">
              <span class="field-label" style="margin-bottom: 0;">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" class="field-icon">
                  <rect x="2" y="4" width="16" height="12" rx="2" />
                  <path stroke-linecap="round" d="M5 8h5M5 12h3" />
                </svg>
                VIN confirmado (últimos 6)
              </span>
              <button class="btn-ghost" style="padding: 4px 8px; font-size: 12px; display: flex; gap: 4px; align-items: center; border: 1.5px solid var(--border); border-radius: var(--radius-sm); color: var(--text-2); background: white;" (click)="openVinScanner()" type="button">
                 <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 8v8M11 8v8M17 8v8M14 8v8"/></svg>
                 Escanear
              </button>
            </div>""")

# 5. Camera Viewfinder
content = content.replace("""<div class="cam-guide">
            <div class="corner corner--tl"></div>
            <div class="corner corner--tr"></div>
            <div class="corner corner--bl"></div>
            <div class="corner corner--br"></div>
          </div>

          <!-- Shutter -->
          <div class="cam-bottom">""",
"""<div class="cam-guide" [class.cam-guide--vin]="cameraMode() === 'vin'">
            <div class="corner corner--tl"></div>
            <div class="corner corner--tr"></div>
            <div class="corner corner--bl"></div>
            <div class="corner corner--br"></div>
            @if (cameraMode() === 'vin') {
              <div class="scan-line"></div>
              <p class="scan-text">Enfoca el código de barras del VIN</p>
            }
          </div>

          <!-- Shutter -->
          @if (cameraMode() === 'photo') {
          <div class="cam-bottom">""")

content = content.replace("""<button class="cam-done-btn" (click)="closeCamera()" type="button">
                  Listo<br />
                  <small>{{ photos().length }} fotos</small>
                </button>
              }
            </div>
          </div>""",
"""<button class="cam-done-btn" (click)="closeCamera()" type="button">
                  Listo<br />
                  <small>{{ photos().length }} fotos</small>
                </button>
              }
            </div>
          </div>
          }""")

# 6. Styles
content = content.replace("""/* -- Custom properties -------------------------------------------- */""",
"""@keyframes scan {
        0% { transform: translateY(-50px); }
        100% { transform: translateY(50px); }
      }
      .cam-guide--vin {
        height: 140px !important;
      }
      .scan-line {
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        background: #ef4444;
        box-shadow: 0 0 6px #ef4444;
        animation: scan 2s infinite linear alternate;
      }
      .scan-text {
        position: absolute;
        bottom: -40px;
        left: 0;
        right: 0;
        text-align: center;
        color: white;
        font-size: 14px;
        font-weight: bold;
        text-shadow: 0 1px 4px rgba(0,0,0,0.8);
      }
      /* -- Custom properties -------------------------------------------- */""")

# 7. Typescript logic openCamera & openVinScanner
content = content.replace("""openCamera(): void {
    if (this.state() === 'sending') return;
    this.cameraOpen.set(true);""",
"""openVinScanner(): void {
    if (this.state() === 'sending') return;
    this.cameraMode.set('vin');
    this.cameraOpen.set(true);
    this.cameraError.set('');
    this.cameraReady.set(false);
    window.setTimeout(() => void this.startCamera(), 0);
  }

  openCamera(): void {
    if (this.state() === 'sending') return;
    this.cameraMode.set('photo');
    this.cameraOpen.set(true);""")

# 8. Typescript logic startCamera
content = content.replace("""this.cameraReady.set(true);
    } catch {""",
"""this.cameraReady.set(true);
      
      if (this.cameraMode() === 'vin') {
        this.zxingReader = new BrowserMultiFormatReader();
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_39, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE]);
        this.zxingReader.setHints(hints);
        this.zxingReader.decodeFromVideoElement(video, (result) => {
          if (result) {
            const text = result.getText();
            const matches = text.match(/[A-HJ-NPR-Z0-9]{17}/gi);
            if (matches && matches.length > 0) {
              const vin = matches[0];
              this.vinConfirmado = this.normalizeVin(vin);
              this.persistDraft();
              this.notifications.success('VIN escaneado: ' + vin);
              this.vibrate([40, 40, 40]);
              this.closeCamera();
            }
          }
        });
      }
    } catch {""")

# 9. Typescript logic stopCamera
content = content.replace("""this.stream = null;
    this.cameraReady.set(false);
  }""",
"""this.stream = null;
    this.cameraReady.set(false);
    if (this.zxingReader) {
      this.zxingReader.reset();
      this.zxingReader = null;
    }
  }""")

with open("C:/Codigos/RRImportaciones/frontend/src/app/pages/campo/campo-captura.component.ts", "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied to campo-captura.component.ts")
