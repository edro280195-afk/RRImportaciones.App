import { Injectable } from '@angular/core';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

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
  onDetected: (vin: string, rawText: string) => void;
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
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    let stopped = false;
    let timeoutId = 0;
    let attempt = 0;

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

    const scan = async () => {
      if (stopped) return;

      try {
        if (context && this.drawScanRegion(options.video, canvas, context, attempt++)) {
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

          if (stopped) return;
          const result = reader.decodeFromCanvas(canvas);
          if (emitIfVin(result.getText())) return;
        }
      } catch {
        // Un fallo por cuadro es normal mientras el usuario esta enfocando.
      }

      timeoutId = window.setTimeout(scan, 90);
    };

    timeoutId = window.setTimeout(scan, 80);
    return { stop };
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

  private drawScanRegion(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    attempt: number
  ): boolean {
    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;
    if (!sourceWidth || !sourceHeight) return false;

    const region = attempt % 5 === 4 ? { y: 0.18, h: 0.64 } : { y: 0.32, h: 0.36 };
    const cropX = Math.round(sourceWidth * 0.04);
    const cropWidth = Math.round(sourceWidth * 0.92);
    const cropY = Math.round(sourceHeight * region.y);
    const cropHeight = Math.round(sourceHeight * region.h);
    const targetWidth = Math.min(1600, Math.max(1000, cropWidth));
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

    return true;
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
