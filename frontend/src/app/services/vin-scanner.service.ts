import { inject, Injectable } from '@angular/core';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import type { ZBarScanner, ZBarSymbol } from '@undecaf/zbar-wasm';
import { firstValueFrom } from 'rxjs';
import { CampoService } from './campo.service';

type FacingMode = 'environment' | 'user';

interface BarcodeDetectionResult {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<BarcodeDetectionResult[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

interface BarcodeDetectorWindow extends Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}

interface ZBarModule {
  getDefaultScanner: () => Promise<ZBarScanner>;
  scanImageData: (image: ImageData, scanner?: ZBarScanner) => Promise<ZBarSymbol[]>;
  ZBarSymbolType: typeof import('@undecaf/zbar-wasm').ZBarSymbolType;
  ZBarConfigType: typeof import('@undecaf/zbar-wasm').ZBarConfigType;
}

interface MediaTrackCapabilitiesExtended extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: {
    min?: number;
    max?: number;
  };
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
}

interface MediaTrackConstraintSetExtended extends MediaTrackConstraintSet {
  torch?: boolean;
  zoom?: number;
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
}

export interface VinScanSession {
  stop(): void;
}

interface StartVinScanOptions {
  video: HTMLVideoElement;
  enableVisionFallback?: boolean;
  onDetected: (vin: string, rawText: string) => void;
  onVisionStart?: () => void;
  onVisionEnd?: () => void;
}

interface CapturedFrame {
  base64: string;
  mime: string;
}

interface ScanRegion {
  x: number;
  y: number;
  w: number;
  h: number;
  contrast?: boolean;
}

const VIN_REGEX = /[A-HJ-NPR-Z0-9]{17}/gi;
const NATIVE_FORMATS = ['code_39', 'code_93', 'code_128', 'pdf417', 'qr_code'];
const ZXING_FORMATS = [
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODE_128,
  BarcodeFormat.PDF_417,
  BarcodeFormat.QR_CODE,
];

@Injectable({ providedIn: 'root' })
export class VinScannerService {
  private campoService = inject(CampoService);
  private zbarDetectorPromise: Promise<BarcodeDetectorInstance | null> | null = null;

  buildVideoConstraints(facingMode: FacingMode = 'environment'): MediaTrackConstraints {
    return {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30, max: 30 },
    };
  }

  normalizeVinInput(value: string): string {
    return value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
  }

  toShortVin(value: string): string {
    return this.normalizeVinInput(value).slice(-6);
  }

  extractVin(value: string): string | null {
    const direct = this.collectCandidates(value);
    const withoutLabels = value.replace(/\bVIN\b/gi, ' ');
    const compact = withoutLabels.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    const labelPrefixed = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const compactCandidates = [
      ...this.collectCandidates(compact),
      ...(labelPrefixed.startsWith('VIN') ? this.collectCandidates(labelPrefixed.slice(3)) : []),
    ];
    const candidates = [...direct, ...compactCandidates];

    if (candidates.length === 0) return null;
    return candidates.find(candidate => this.hasValidCheckDigit(candidate)) ?? candidates[0];
  }

  async prepareStream(stream: MediaStream): Promise<void> {
    const track = stream.getVideoTracks()[0];
    if (!track?.applyConstraints) return;

    const capabilities = track.getCapabilities?.() as MediaTrackCapabilitiesExtended | undefined;
    if (!capabilities) return;

    const advanced: MediaTrackConstraintSetExtended[] = [];

    if (capabilities.focusMode?.includes('continuous')) {
      advanced.push({ focusMode: 'continuous' });
    }

    if (capabilities.exposureMode?.includes('continuous')) {
      advanced.push({ exposureMode: 'continuous' });
    }

    if (capabilities.whiteBalanceMode?.includes('continuous')) {
      advanced.push({ whiteBalanceMode: 'continuous' });
    }

    const zoom = this.recommendedZoom(capabilities);
    if (zoom !== null) {
      advanced.push({ zoom });
    }

    if (advanced.length === 0) return;

    try {
      await track.applyConstraints({ advanced: advanced as MediaTrackConstraintSet[] });
    } catch {
      // Algunos navegadores anuncian capacidades que no aceptan al aplicar constraints.
    }
  }

  hasTorch(stream: MediaStream | null): boolean {
    const track = stream?.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as MediaTrackCapabilitiesExtended | undefined;
    return capabilities?.torch === true;
  }

  async setTorch(stream: MediaStream | null, enabled: boolean): Promise<boolean> {
    const track = stream?.getVideoTracks()[0];
    if (!track?.applyConstraints || !this.hasTorch(stream)) return false;

    try {
      await track.applyConstraints({
        advanced: [{ torch: enabled } as MediaTrackConstraintSetExtended] as MediaTrackConstraintSet[],
      });
      return true;
    } catch {
      return false;
    }
  }

  async startVinScan(options: StartVinScanOptions): Promise<VinScanSession> {
    const reader = this.createReader();
    const detector = await this.createNativeDetector();
    const zbarDetectorPromise = this.getZbarDetector();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    let stopped = false;
    let timeoutId = 0;
    let attempt = 0;
    let zbarReady = false;
    let zbarDetector: BarcodeDetectorInstance | null = null;
    let visionBusy = false;
    let lastVisionAt = 0;
    const startedAt = Date.now();

    const stop = () => {
      stopped = true;
      window.clearTimeout(timeoutId);
      canvas.width = 0;
      canvas.height = 0;
    };

    const emitIfVin = (rawText: string): boolean => {
      const vin = this.extractVin(rawText);
      if (!vin) return false;

      stop();
      options.onDetected(vin, rawText);
      return true;
    };

    const tryVision = async () => {
      if (stopped || visionBusy || options.enableVisionFallback === false) return;

      const now = Date.now();
      if (now - startedAt < 1800 || now - lastVisionAt < 2800) return;

      visionBusy = true;
      lastVisionAt = now;
      options.onVisionStart?.();

      try {
        const vin = await this.extractVinWithVision(options.video);
        if (stopped || !vin) return;
        emitIfVin(vin);
      } catch {
        // La vision es respaldo; el scanner de barras sigue intentando.
      } finally {
        visionBusy = false;
        options.onVisionEnd?.();
      }
    };

    const scan = async () => {
      if (stopped) return;

      try {
        const currentAttempt = attempt++;
        if (context && this.drawScanRegion(options.video, canvas, context, currentAttempt)) {
          if (detector) {
            try {
              const detections = await detector.detect(canvas);
              if (stopped) return;
              for (const detection of detections) {
                if (emitIfVin(detection.rawValue)) return;
              }
            } catch {
              // Si el detector nativo falla en un cuadro, ZXing sigue como respaldo.
            }
          }

          if (currentAttempt % 3 === 0) {
            try {
              if (!zbarReady) {
                zbarDetector = await zbarDetectorPromise;
                zbarReady = true;
              }
              if (zbarDetector) {
                const detections = await zbarDetector.detect(canvas);
                if (stopped) return;
                for (const detection of detections) {
                  if (emitIfVin(detection.rawValue)) return;
                }
              }
            } catch {
              // ZBar WASM es un respaldo local; ZXing todavia puede leer este cuadro.
            }
          }

          if (stopped) return;
          const result = reader.decodeFromCanvas(canvas);
          if (emitIfVin(result.getText())) return;
        }
      } catch {
        // Un fallo por cuadro es normal mientras el usuario esta enfocando.
      }

      void tryVision();
      timeoutId = window.setTimeout(scan, 90);
    };

    timeoutId = window.setTimeout(scan, 80);
    return { stop };
  }

  async extractVinWithVision(video: HTMLVideoElement): Promise<string | null> {
    const frame = this.captureVinFrame(video);
    if (!frame) return null;

    const response = await firstValueFrom(this.campoService.extractVin(frame.base64, frame.mime));
    if (!response.vin) return null;

    return this.extractVin(response.vin) ?? this.normalizeVinInput(response.vin);
  }

  captureVinFrame(video: HTMLVideoElement): CapturedFrame | null {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return null;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    const cropX = Math.round(sourceWidth * 0.02);
    const cropY = Math.round(sourceHeight * 0.12);
    const cropWidth = Math.round(sourceWidth * 0.96);
    const cropHeight = Math.round(sourceHeight * 0.72);
    const targetWidth = Math.min(1800, Math.max(1200, cropWidth));
    const targetHeight = Math.round((cropHeight / cropWidth) * targetWidth);

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );
    this.boostContrast(canvas, context);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const [, base64 = ''] = dataUrl.split(',');
    return { base64, mime: 'image/jpeg' };
  }

  private createReader(): BrowserMultiFormatReader {
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 90,
      delayBetweenScanSuccess: 250,
      tryPlayVideoTimeout: 5000,
    });
  }

  private async createNativeDetector(): Promise<BarcodeDetectorInstance | null> {
    const detectorCtor = (window as BarcodeDetectorWindow).BarcodeDetector;
    if (!detectorCtor) return null;

    try {
      const supported = detectorCtor.getSupportedFormats
        ? await detectorCtor.getSupportedFormats()
        : NATIVE_FORMATS;
      const formats = NATIVE_FORMATS.filter(format => supported.includes(format));
      if (formats.length === 0) return null;
      return new detectorCtor({ formats });
    } catch {
      return null;
    }
  }

  private getZbarDetector(): Promise<BarcodeDetectorInstance | null> {
    this.zbarDetectorPromise ??= this.createZbarDetector();
    return this.zbarDetectorPromise;
  }

  private async createZbarDetector(): Promise<BarcodeDetectorInstance | null> {
    try {
      const module = (await import('@undecaf/zbar-wasm')) as ZBarModule;
      const scanner = await module.getDefaultScanner();
      scanner.setConfig(
        module.ZBarSymbolType.ZBAR_NONE,
        module.ZBarConfigType.ZBAR_CFG_ENABLE,
        0
      );

      const enabledSymbologies = [
        module.ZBarSymbolType.ZBAR_CODE39,
        module.ZBarSymbolType.ZBAR_CODE93,
        module.ZBarSymbolType.ZBAR_CODE128,
        module.ZBarSymbolType.ZBAR_PDF417,
        module.ZBarSymbolType.ZBAR_QRCODE,
      ];

      for (const symbology of enabledSymbologies) {
        scanner.setConfig(symbology, module.ZBarConfigType.ZBAR_CFG_ENABLE, 1);
      }

      return {
        detect: async source => {
          if (!(source instanceof HTMLCanvasElement)) return [];

          const sourceContext = source.getContext('2d', { willReadFrequently: true });
          if (!sourceContext) return [];

          const image = sourceContext.getImageData(0, 0, source.width, source.height);
          const symbols = await module.scanImageData(image, scanner);
          return symbols.map(symbol => ({ rawValue: symbol.decode() }));
        },
      };
    } catch {
      return null;
    }
  }

  private drawScanRegion(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    attempt: number
  ): boolean {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return false;

    const regions: ScanRegion[] = [
      { x: 0.03, y: 0.42, w: 0.94, h: 0.34 },
      { x: 0.03, y: 0.24, w: 0.94, h: 0.30 },
      { x: 0.02, y: 0.18, w: 0.96, h: 0.68 },
      { x: 0.03, y: 0.42, w: 0.94, h: 0.34, contrast: true },
      { x: 0.01, y: 0.08, w: 0.98, h: 0.84 },
    ];
    const region = regions[attempt % regions.length];
    const cropX = Math.round(sourceWidth * region.x);
    const cropWidth = Math.round(sourceWidth * region.w);
    const cropY = Math.round(sourceHeight * region.y);
    const cropHeight = Math.round(sourceHeight * region.h);
    const targetWidth = Math.min(1800, Math.max(1100, cropWidth));
    const targetHeight = Math.round((cropHeight / cropWidth) * targetWidth);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    context.drawImage(
      video,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    if (region.contrast) {
      this.boostContrast(canvas, context);
    }

    return true;
  }

  private boostContrast(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void {
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    const contrast = 1.45;
    const brightness = 8;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const adjusted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128 + brightness));
      data[i] = adjusted;
      data[i + 1] = adjusted;
      data[i + 2] = adjusted;
    }

    context.putImageData(image, 0, 0);
  }

  private recommendedZoom(capabilities: MediaTrackCapabilitiesExtended): number | null {
    const min = capabilities.zoom?.min;
    const max = capabilities.zoom?.max;
    if (typeof min !== 'number' || typeof max !== 'number' || max <= 1) return null;
    return Math.min(max, Math.max(min, 1.8));
  }

  private collectCandidates(value: string): string[] {
    const matches = value.toUpperCase().match(VIN_REGEX);
    return matches ? [...new Set(matches)] : [];
  }

  private hasValidCheckDigit(vin: string): boolean {
    const transliteration: Record<string, number> = {
      A: 1,
      B: 2,
      C: 3,
      D: 4,
      E: 5,
      F: 6,
      G: 7,
      H: 8,
      J: 1,
      K: 2,
      L: 3,
      M: 4,
      N: 5,
      P: 7,
      R: 9,
      S: 2,
      T: 3,
      U: 4,
      V: 5,
      W: 6,
      X: 7,
      Y: 8,
      Z: 9,
    };
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

    const sum = [...vin].reduce((acc, char, index) => {
      const value = /\d/.test(char) ? Number(char) : transliteration[char] ?? 0;
      return acc + value * weights[index];
    }, 0);
    const expected = sum % 11 === 10 ? 'X' : String(sum % 11);
    return vin[8] === expected;
  }
}
