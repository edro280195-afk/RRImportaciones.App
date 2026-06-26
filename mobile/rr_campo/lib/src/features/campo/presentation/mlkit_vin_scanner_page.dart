import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import '../domain/vin_parser.dart';

class MlkitVinScannerPage extends StatefulWidget {
  const MlkitVinScannerPage({super.key});

  @override
  State<MlkitVinScannerPage> createState() => _MlkitVinScannerPageState();
}

class _MlkitVinScannerPageState extends State<MlkitVinScannerPage> {
  static const _orientations = {
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270,
  };

  final _barcodeScanner = BarcodeScanner(
    formats: [
      BarcodeFormat.code39,
      BarcodeFormat.code93,
      BarcodeFormat.code128,
      BarcodeFormat.ean13,
      BarcodeFormat.ean8,
      BarcodeFormat.dataMatrix,
      BarcodeFormat.pdf417,
      BarcodeFormat.qrCode,
    ],
  );
  final _textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);

  CameraDescription? _camera;
  CameraController? _controller;
  DateTime _lastOcrAt = DateTime.fromMillisecondsSinceEpoch(0);
  bool _cameraReady = false;
  bool _processingFrame = false;
  bool _finishing = false;
  bool _torchEnabled = false;
  String _status = 'Preparando camara...';

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  @override
  void dispose() {
    _disposeCamera();
    _barcodeScanner.close();
    _textRecognizer.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (_cameraReady && controller != null)
            _CameraPreview(controller: controller)
          else
            const Center(child: CircularProgressIndicator(color: Colors.white)),
          const _ScannerMask(),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 18),
              child: Column(
                children: [
                  Row(
                    children: [
                      IconButton.filledTonal(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back),
                        tooltip: 'Volver',
                      ),
                      const Spacer(),
                      IconButton.filledTonal(
                        onPressed: _cameraReady ? _toggleTorch : null,
                        icon: Icon(
                          _torchEnabled ? Icons.flash_on : Icons.flash_off,
                        ),
                        tooltip: 'Linterna',
                      ),
                    ],
                  ),
                  const Spacer(),
                  _ScannerInstruction(status: _status),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        _setStatus('No se encontro camara disponible.');
        return;
      }

      _camera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        _camera!,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid
            ? ImageFormatGroup.nv21
            : ImageFormatGroup.bgra8888,
      );

      _controller = controller;
      await controller.initialize();
      await controller.setFocusMode(FocusMode.auto).catchError((_) {});
      await controller.startImageStream(_processCameraImage);

      if (!mounted) return;
      setState(() {
        _cameraReady = true;
        _status = 'Enfoca el VIN, codigo de barras o QR';
      });
    } catch (_) {
      _setStatus('No se pudo abrir la camara. Revisa los permisos.');
    }
  }

  Future<void> _disposeCamera() async {
    final controller = _controller;
    _controller = null;
    if (controller == null) return;

    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {
      // La camara puede cerrarse mientras ML Kit termina un frame.
    }

    await controller.dispose();
  }

  Future<void> _toggleTorch() async {
    final controller = _controller;
    if (controller == null || !_cameraReady) return;

    try {
      final nextValue = !_torchEnabled;
      await controller.setFlashMode(
        nextValue ? FlashMode.torch : FlashMode.off,
      );
      if (!mounted) return;
      setState(() => _torchEnabled = nextValue);
    } catch (_) {
      _setStatus('Este dispositivo no permite activar la linterna aqui.');
    }
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (_processingFrame || _finishing) return;

    final inputImage = _inputImageFromCameraImage(image);
    if (inputImage == null) return;

    _processingFrame = true;
    try {
      final barcodeVin = await _scanBarcodes(inputImage);
      if (barcodeVin != null) {
        await _finishScan(barcodeVin);
        return;
      }

      final now = DateTime.now();
      if (now.difference(_lastOcrAt).inMilliseconds >= 1200) {
        _lastOcrAt = now;
        final textVin = await _scanText(inputImage);
        if (textVin != null) {
          await _finishScan(textVin);
          return;
        }
      }
    } catch (_) {
      _setStatus('Sigue enfocando el codigo o etiqueta VIN.');
    } finally {
      _processingFrame = false;
    }
  }

  Future<String?> _scanBarcodes(InputImage inputImage) async {
    final barcodes = await _barcodeScanner.processImage(inputImage);
    for (final barcode in barcodes) {
      final rawText = barcode.rawValue ?? barcode.displayValue ?? '';
      final vin = extractVinCandidate(rawText);
      if (vin != null) return vin;
    }
    return null;
  }

  Future<String?> _scanText(InputImage inputImage) async {
    if (mounted) {
      setState(() => _status = 'Leyendo texto con OCR...');
    }

    final recognizedText = await _textRecognizer.processImage(inputImage);
    final vin = extractVinCandidate(recognizedText.text);
    if (vin == null && mounted) {
      setState(() => _status = 'Enfoca el VIN, codigo de barras o QR');
    }
    return vin;
  }

  Future<void> _finishScan(String vin) async {
    if (_finishing) return;
    _finishing = true;

    if (mounted) {
      setState(() => _status = 'VIN detectado: ${toShortVin(vin)}');
    }

    await HapticFeedback.heavyImpact();
    await SystemSound.play(SystemSoundType.click);

    final controller = _controller;
    if (controller != null && controller.value.isStreamingImages) {
      await controller.stopImageStream().catchError((_) {});
    }

    await Future<void>.delayed(const Duration(milliseconds: 250));
    if (!mounted) return;
    Navigator.of(context).pop(vin);
  }

  InputImage? _inputImageFromCameraImage(CameraImage image) {
    final camera = _camera;
    final controller = _controller;
    if (camera == null || controller == null) return null;

    final sensorOrientation = camera.sensorOrientation;
    InputImageRotation? rotation;

    if (Platform.isIOS) {
      rotation = InputImageRotationValue.fromRawValue(sensorOrientation);
    } else if (Platform.isAndroid) {
      var rotationCompensation =
          _orientations[controller.value.deviceOrientation];
      if (rotationCompensation == null) return null;

      if (camera.lensDirection == CameraLensDirection.front) {
        rotationCompensation = (sensorOrientation + rotationCompensation) % 360;
      } else {
        rotationCompensation =
            (sensorOrientation - rotationCompensation + 360) % 360;
      }

      rotation = InputImageRotationValue.fromRawValue(rotationCompensation);
    }

    if (rotation == null) return null;

    final format = InputImageFormatValue.fromRawValue(image.format.raw);
    final validAndroidFormat =
        Platform.isAndroid && format == InputImageFormat.nv21;
    final validIosFormat =
        Platform.isIOS && format == InputImageFormat.bgra8888;
    if (format == null || (!validAndroidFormat && !validIosFormat)) return null;
    if (image.planes.length != 1) return null;

    final plane = image.planes.first;
    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  void _setStatus(String value) {
    if (!mounted) return;
    setState(() => _status = value);
  }
}

class _CameraPreview extends StatelessWidget {
  const _CameraPreview({required this.controller});

  final CameraController controller;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = controller.value.previewSize;
        if (size == null) return CameraPreview(controller);

        final previewAspectRatio = size.height / size.width;
        final screenAspectRatio = constraints.maxWidth / constraints.maxHeight;
        final scale = previewAspectRatio / screenAspectRatio;

        return Transform.scale(
          scale: scale < 1 ? 1 / scale : scale,
          child: Center(child: CameraPreview(controller)),
        );
      },
    );
  }
}

class _ScannerMask extends StatelessWidget {
  const _ScannerMask();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.16)),
        child: Center(
          child: Container(
            width: MediaQuery.sizeOf(context).width * 0.84,
            height: 168,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: Colors.white, width: 2),
              boxShadow: const [
                BoxShadow(
                  color: Colors.black45,
                  blurRadius: 24,
                  spreadRadius: 6,
                ),
              ],
            ),
            child: const Stack(
              children: [
                _Corner(alignment: Alignment.topLeft),
                _Corner(alignment: Alignment.topRight),
                _Corner(alignment: Alignment.bottomLeft),
                _Corner(alignment: Alignment.bottomRight),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Corner extends StatelessWidget {
  const _Corner({required this.alignment});

  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: alignment,
      child: Container(
        width: 36,
        height: 36,
        margin: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          border: Border(
            top: alignment.y < 0
                ? const BorderSide(color: Color(0xFFC61D26), width: 4)
                : BorderSide.none,
            bottom: alignment.y > 0
                ? const BorderSide(color: Color(0xFFC61D26), width: 4)
                : BorderSide.none,
            left: alignment.x < 0
                ? const BorderSide(color: Color(0xFFC61D26), width: 4)
                : BorderSide.none,
            right: alignment.x > 0
                ? const BorderSide(color: Color(0xFFC61D26), width: 4)
                : BorderSide.none,
          ),
        ),
      ),
    );
  }
}

class _ScannerInstruction extends StatelessWidget {
  const _ScannerInstruction({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white24),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.document_scanner_outlined, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Scanner ML Kit',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(status, style: const TextStyle(color: Colors.white70)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
