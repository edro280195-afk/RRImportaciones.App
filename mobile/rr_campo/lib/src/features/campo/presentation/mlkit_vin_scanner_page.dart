import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_barcode_scanning/google_mlkit_barcode_scanning.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import '../domain/vin_parser.dart';
import '../domain/vin_scan_consensus.dart';

enum _ScannerMode { barcode, text }

typedef VinScannerValidator =
    Future<VinScannerValidationResult> Function(String vin);

class VinScannerValidationResult {
  const VinScannerValidationResult.success({required this.title, this.subtitle})
    : isValid = true;

  const VinScannerValidationResult.failure({required this.title, this.subtitle})
    : isValid = false;

  final bool isValid;
  final String title;
  final String? subtitle;
}

class MlkitVinScannerPage extends StatefulWidget {
  const MlkitVinScannerPage({super.key, this.onValidateVin});

  final VinScannerValidator? onValidateVin;

  @override
  State<MlkitVinScannerPage> createState() => _MlkitVinScannerPageState();
}

enum _VinValidationState { idle, validating, success, failure }

class _MlkitVinScannerPageState extends State<MlkitVinScannerPage>
    with WidgetsBindingObserver {
  static const _brandRed = Color(0xFFC61D26);
  static const _surfaceDark = Color(0xFF0D1017);
  static const _scanAmber = Color(0xFFF59E0B);
  static const _scanBlue = Color(0xFF38BDF8);
  static const _scanGreen = Color(0xFF32D583);
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
      BarcodeFormat.dataMatrix,
      BarcodeFormat.pdf417,
      BarcodeFormat.qrCode,
      BarcodeFormat.aztec,
    ],
    enableAllPotentialBarcodes: true,
    maxZoomRatio: 5,
  );
  final _textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);

  CameraDescription? _camera;
  CameraController? _controller;
  DateTime _lastOcrAt = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastDetectionFocusAt = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastAutoZoomAt = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastDetectionAt = DateTime.fromMillisecondsSinceEpoch(0);
  final _stabilityLock = VinStabilityLock();
  final _barcodeLock = VinStabilityLock(
    window: const Duration(milliseconds: 900),
    minVotes: 2,
    strongVotes: 1,
  );
  _ScannerMode _mode = _ScannerMode.barcode;
  bool _cameraReady = false;
  bool _processingFrame = false;
  bool _finishing = false;
  bool _torchEnabled = false;
  String _status = 'Preparando cámara...';
  String? _detectedVin;
  String? _confirmedSource;
  _VinValidationState _validationState = _VinValidationState.idle;
  String? _validationTitle;
  String? _validationSubtitle;
  Offset? _focusPoint;
  Timer? _focusTimer;
  Timer? _detectionTimer;
  _ScanDetection? _activeDetection;
  double _minZoom = 1;
  double _maxZoom = 1;
  double _zoomLevel = 1;
  double _zoomAtGestureStart = 1;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeCamera();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive ||
        state == AppLifecycleState.paused) {
      unawaited(_disposeCamera(updateUi: true));
      return;
    }

    if (state == AppLifecycleState.resumed && !_finishing) {
      unawaited(_initializeCamera());
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _focusTimer?.cancel();
    _detectionTimer?.cancel();
    unawaited(_disposeCamera());
    unawaited(_barcodeScanner.close());
    unawaited(_textRecognizer.close());
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        await _disposeCamera();
        if (context.mounted) {
          Navigator.of(context).pop(result);
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: LayoutBuilder(
          builder: (context, constraints) {
            final viewportSize = Size(
              constraints.maxWidth,
              constraints.maxHeight,
            );

            return Stack(
              fit: StackFit.expand,
              children: [
                if (_cameraReady && controller != null)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTapDown: (details) =>
                        _onTapToFocus(details, controller, viewportSize),
                    onScaleStart: (_) {
                      _zoomAtGestureStart = _zoomLevel;
                    },
                    onScaleUpdate: (details) {
                      if (details.pointerCount < 2) return;
                      unawaited(
                        _setZoomLevel(_zoomAtGestureStart * details.scale),
                      );
                    },
                    child: _CameraPreview(controller: controller),
                  )
                else
                  const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  ),
                _ScannerOverlay(
                  detection: _activeDetection,
                  viewportSize: viewportSize,
                ),
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
                    child: Column(
                      children: [
                        _ScannerTopBar(
                          torchEnabled: _torchEnabled,
                          cameraReady: _cameraReady,
                          onBack: () => Navigator.of(context).maybePop(),
                          onTorch: _toggleTorch,
                        ),
                        const SizedBox(height: 10),
                        _ScannerModeControl(
                          mode: _mode,
                          enabled: _detectedVin == null,
                          onChanged: _changeMode,
                        ),
                        const Spacer(),
                        if (_detectedVin == null) ...[
                          _ZoomControl(
                            value: _zoomLevel,
                            min: _minZoom,
                            max: _maxZoom,
                            enabled: _cameraReady && _maxZoom > _minZoom,
                            onChanged: (value) {
                              unawaited(_setZoomLevel(value));
                            },
                            onReset: () {
                              unawaited(
                                _setZoomLevel(
                                  1.0.clamp(_minZoom, _maxZoom).toDouble(),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 10),
                          _ScannerStatus(
                            status: _status,
                            detection: _activeDetection,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (_detectedVin != null) _buildConfirmationPanel(),
                if (_focusPoint != null)
                  Positioned(
                    left: _focusPoint!.dx - 25,
                    top: _focusPoint!.dy - 25,
                    child: const _FocusRing(),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _initializeCamera() async {
    if (_controller != null || _finishing) return;

    _setStatus('Preparando cámara...');
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        _setStatus('No se encontró una cámara disponible.');
        return;
      }

      final camera = cameras.firstWhere(
        (item) => item.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: Platform.isAndroid
            ? ImageFormatGroup.nv21
            : ImageFormatGroup.bgra8888,
      );

      _camera = camera;
      _controller = controller;
      await controller.initialize();
      await controller.setFocusMode(FocusMode.auto).catchError((_) {});
      await controller.setExposureMode(ExposureMode.auto).catchError((_) {});

      final minZoom = await controller.getMinZoomLevel().catchError((_) => 1.0);
      final deviceMaxZoom = await controller.getMaxZoomLevel().catchError(
        (_) => 1.0,
      );
      final maxZoom = math.max(minZoom, math.min(deviceMaxZoom, 5.0));
      final initialZoom = 1.0.clamp(minZoom, maxZoom).toDouble();

      _minZoom = minZoom;
      _maxZoom = maxZoom;
      _zoomLevel = initialZoom;
      await controller.setZoomLevel(initialZoom).catchError((_) {});
      await controller.startImageStream(_processCameraImage);

      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _cameraReady = true;
        _status = _statusForMode(_mode);
      });
    } on CameraException catch (error) {
      _controller = null;
      _setStatus(_cameraErrorMessage(error));
    } catch (_) {
      _controller = null;
      _setStatus('No se pudo abrir la cámara. Revisa los permisos.');
    }
  }

  String _cameraErrorMessage(CameraException error) {
    return switch (error.code) {
      'CameraAccessDenied' || 'CameraAccessDeniedWithoutPrompt' =>
        'Permite el acceso a la cámara desde Ajustes.',
      'CameraAccessRestricted' => 'El acceso a la cámara está restringido.',
      _ => 'No se pudo abrir la cámara.',
    };
  }

  Future<void> _disposeCamera({bool updateUi = false}) async {
    final controller = _controller;
    _controller = null;
    if (updateUi && mounted) {
      setState(() {
        _cameraReady = false;
        _torchEnabled = false;
      });
    }
    if (controller == null) return;

    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {
      // La cámara puede cerrarse mientras ML Kit termina de procesar un frame.
    }

    await controller.dispose().catchError((_) {});
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
      _setStatus('Este dispositivo no permite activar la linterna.');
    }
  }

  Future<void> _setZoomLevel(double value) async {
    final controller = _controller;
    if (controller == null || !_cameraReady) return;

    final nextValue = value.clamp(_minZoom, _maxZoom).toDouble();
    if ((nextValue - _zoomLevel).abs() < 0.02) return;

    if (mounted) {
      setState(() => _zoomLevel = nextValue);
    } else {
      _zoomLevel = nextValue;
    }

    await controller.setZoomLevel(nextValue).catchError((_) {});
  }

  void _changeMode(_ScannerMode mode) {
    if (_mode == mode) return;
    _stabilityLock.reset();
    _detectionTimer?.cancel();
    setState(() {
      _mode = mode;
      _activeDetection = null;
      _status = _statusForMode(mode);
    });
    _stabilityLock.reset();
    _barcodeLock.reset();
  }

  String _statusForMode(_ScannerMode mode) {
    return mode == _ScannerMode.barcode
        ? 'Apunta al código de barras del VIN'
        : 'Apunta únicamente al VIN impreso';
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (_processingFrame || _finishing || _detectedVin != null) {
      return;
    }

    final preparedImage = _prepareInputImage(image);
    if (preparedImage == null) return;

    _processingFrame = true;
    try {
      if (_mode == _ScannerMode.barcode) {
        await _processBarcodeFrame(preparedImage);
      } else {
        // El OCR corre de forma continua (igual que en PMMovil). Un throttle
        // pequeño solo evita saturar la CPU; la decisión la toma la votación.
        final now = DateTime.now();
        if (now.difference(_lastOcrAt).inMilliseconds < 120) return;
        _lastOcrAt = now;
        await _processTextFrame(preparedImage);
      }
    } catch (_) {
      _setStatus('Mantén la etiqueta visible mientras se enfoca.');
    } finally {
      _processingFrame = false;
    }
  }

  Future<void> _processBarcodeFrame(_PreparedInputImage prepared) async {
    final scanResult = await _barcodeScanner.processImageWithResult(
      prepared.inputImage,
    );
    if (_mode != _ScannerMode.barcode) return;

    // ML Kit puede sugerir un zoom para acercar un código que ve lejano.
    final suggestedZoom = scanResult.zoomSuggestion;
    if (suggestedZoom != null) {
      await _applyMlKitZoom(suggestedZoom);
    }

    _ScanDetection? potential;
    Rect? potentialBox;
    var shortestDistance = double.infinity;

    for (final barcode in scanResult.barcodes) {
      final rawText = barcode.rawValue ?? barcode.displayValue ?? '';
      final vin = extractVinFromBarcode(rawText);
      final bounds = _barcodeBounds(barcode);
      final detection = _ScanDetection(
        bounds: bounds,
        imageSize: prepared.imageSize,
        rotation: prepared.rotation,
        label: rawText.isEmpty
            ? 'Código localizado'
            : _barcodeFormatLabel(barcode.format),
        source: VinScanSource.barcode,
        vin: vin,
        isPotential: vin == null,
      );

      if (vin != null) {
        final strong = hasValidVinCheckDigit(vin);
        final locked = _barcodeLock.offer(
          vin: vin,
          strong: strong,
          now: DateTime.now(),
        );
        final verifyingDetection = strong
            ? detection.copyWith(label: 'Leyendo código')
            : detection.copyWith(label: 'Validando código');
        _showDetection(verifyingDetection);
        unawaited(_focusDetection(detection));

        if (locked != null) {
          await _onVinDetected(locked, detection);
          return;
        }

        _setStatus('Mantén el código estable...');
        return;
      }

      if (bounds.isEmpty) continue;
      final coordinateSize = detection.coordinateSize;
      final distance =
          (bounds.center -
                  Offset(coordinateSize.width / 2, coordinateSize.height / 2))
              .distance;
      if (distance < shortestDistance) {
        shortestDistance = distance;
        potential = detection;
        potentialBox = bounds;
      }
    }

    if (potential != null && potentialBox != null) {
      _showDetection(potential);
      unawaited(_focusDetection(potential));
      _maybeProgressiveZoom(potentialBox, prepared.imageSize);
      _setStatus('Código localizado. Ajustando enfoque...');
    } else {
      _maybeZoomOutWhenIdle();
      _setStatus(_statusForMode(_mode));
    }
  }

  Rect _barcodeBounds(Barcode barcode) {
    final points = barcode.cornerPoints;
    if (points.length < 4) return barcode.boundingBox;

    var left = points.first.x.toDouble();
    var top = points.first.y.toDouble();
    var right = left;
    var bottom = top;
    for (final point in points.skip(1)) {
      left = math.min(left, point.x.toDouble());
      top = math.min(top, point.y.toDouble());
      right = math.max(right, point.x.toDouble());
      bottom = math.max(bottom, point.y.toDouble());
    }
    final cornerBounds = Rect.fromLTRB(left, top, right, bottom);
    return cornerBounds.isEmpty ? barcode.boundingBox : cornerBounds;
  }

  Future<void> _applyMlKitZoom(double suggestedZoom) async {
    final targetZoom = suggestedZoom.clamp(_minZoom, _maxZoom).toDouble();
    if ((targetZoom - _zoomLevel).abs() < 0.05) return;
    await _setZoomLevel(targetZoom);
  }

  Future<void> _processTextFrame(_PreparedInputImage prepared) async {
    final recognizedText = await _textRecognizer.processImage(
      prepared.inputImage,
    );
    if (_mode != _ScannerMode.text) return;

    final detection = _bestVinDetection(recognizedText, prepared);
    if (detection == null) {
      _setStatus(_statusForMode(_mode));
      return;
    }

    _showDetection(detection);
    unawaited(_focusDetection(detection));

    final vin = detection.vin!;
    final strong = hasValidVinCheckDigit(vin);
    final locked = _stabilityLock.offer(
      vin: vin,
      strong: strong,
      now: DateTime.now(),
    );
    if (locked != null) {
      await _onVinDetected(locked, detection);
      return;
    }

    final required = strong ? 2 : 3;
    final votes = _stabilityLock.votesFor(vin).clamp(0, required);
    _setStatus('Leyendo VIN $votes/$required...');
  }

  /// Escoge el mejor renglón con forma de VIN del frame: prefiere el que pasa
  /// el dígito verificador y, a igualdad, el más centrado. No descarta lecturas
  /// por estar fuera de una guía: lee el VIN esté donde esté en el cuadro.
  _ScanDetection? _bestVinDetection(
    RecognizedText recognizedText,
    _PreparedInputImage prepared,
  ) {
    _ScanDetection? best;
    var bestScore = -1.0;

    for (final block in recognizedText.blocks) {
      for (final line in block.lines) {
        final vin = extractVinFromOcrLine(line.text);
        if (vin == null) continue;

        final detection = _ScanDetection(
          bounds: line.boundingBox,
          imageSize: prepared.imageSize,
          rotation: prepared.rotation,
          label: 'Texto VIN',
          source: VinScanSource.ocr,
          vin: vin,
        );

        final coordinateSize = detection.coordinateSize;
        final longestSide = coordinateSize.longestSide;
        final distance =
            (line.boundingBox.center -
                    Offset(coordinateSize.width / 2, coordinateSize.height / 2))
                .distance;
        final centerScore = longestSide == 0
            ? 0.0
            : 1 - (distance / longestSide).clamp(0.0, 1.0);
        final score = (hasValidVinCheckDigit(vin) ? 1.0 : 0.0) + centerScore;
        if (score > bestScore) {
          bestScore = score;
          best = detection;
        }
      }
    }
    return best;
  }

  String _barcodeFormatLabel(BarcodeFormat format) {
    if (format == BarcodeFormat.qrCode) return 'Código QR';
    if (format == BarcodeFormat.pdf417) return 'Código PDF417';
    if (format == BarcodeFormat.dataMatrix) return 'Data Matrix';
    if (format == BarcodeFormat.aztec) return 'Código Aztec';
    return 'Código de barras';
  }

  void _showDetection(_ScanDetection detection) {
    _lastDetectionAt = DateTime.now();
    final previous = _activeDetection;
    final smoothedBounds =
        previous != null &&
            previous.label == detection.label &&
            previous.vin == detection.vin
        ? Rect.lerp(previous.bounds, detection.bounds, 0.42)!
        : detection.bounds;
    final smoothed = detection.copyWith(bounds: smoothedBounds);

    _detectionTimer?.cancel();
    if (mounted) {
      setState(() => _activeDetection = smoothed);
    }
    _detectionTimer = Timer(const Duration(milliseconds: 900), () {
      if (!mounted || _detectedVin != null) return;
      setState(() => _activeDetection = null);
    });
  }

  Future<void> _focusDetection(_ScanDetection detection) async {
    final controller = _controller;
    if (controller == null || !_cameraReady) return;

    final now = DateTime.now();
    if (now.difference(_lastDetectionFocusAt).inMilliseconds < 900) return;
    _lastDetectionFocusAt = now;

    final viewportSize = MediaQuery.sizeOf(context);
    final mappedBounds = detection.mapToViewport(viewportSize);
    final focusPoint = Offset(
      (mappedBounds.center.dx / viewportSize.width).clamp(0.05, 0.95),
      (mappedBounds.center.dy / viewportSize.height).clamp(0.05, 0.95),
    );

    await controller.setFocusPoint(focusPoint).catchError((_) {});
    await controller.setExposurePoint(focusPoint).catchError((_) {});
  }

  /// Acerca de forma progresiva cuando ML Kit ve un código potencial pequeño
  /// (sin valor legible aún). Replica el "zoom inteligente" de PMMovil: pasos
  /// suaves de 1.1x a 2.0x, con enfriamiento, hasta que el código sea legible.
  void _maybeProgressiveZoom(Rect boxInImage, Size imageSize) {
    if (imageSize.isEmpty || _maxZoom <= _minZoom) return;
    final now = DateTime.now();
    if (now.difference(_lastAutoZoomAt).inMilliseconds < 600) return;

    final maxDim = math.max(
      boxInImage.width / imageSize.width,
      boxInImage.height / imageSize.height,
    );
    if (maxDim <= 0 || maxDim >= 0.22) return;
    if (_zoomLevel >= _maxZoom) return;

    final target = (_zoomLevel * (0.35 / maxDim))
        .clamp(_zoomLevel * 1.1, _zoomLevel * 2.0)
        .clamp(_minZoom, _maxZoom)
        .toDouble();
    _lastAutoZoomAt = now;
    unawaited(_setZoomLevel(target));
  }

  /// Si lleva un rato sin ver nada y quedó con zoom, regresa a campo abierto
  /// para volver a localizar el código.
  void _maybeZoomOutWhenIdle() {
    if (_zoomLevel <= 1.2) return;
    final now = DateTime.now();
    if (now.difference(_lastDetectionAt).inMilliseconds < 2500) return;
    if (now.difference(_lastAutoZoomAt).inMilliseconds < 600) return;
    _lastAutoZoomAt = now;
    unawaited(_setZoomLevel(1.0.clamp(_minZoom, _maxZoom).toDouble()));
  }

  Future<void> _onVinDetected(String vin, _ScanDetection detection) async {
    if (_finishing || _detectedVin != null) return;

    await HapticFeedback.heavyImpact();
    await SystemSound.play(SystemSoundType.click);

    final controller = _controller;
    if (controller != null && controller.value.isStreamingImages) {
      await controller.stopImageStream().catchError((_) {});
    }

    if (!mounted) return;
    setState(() {
      _detectedVin = vin;
      _confirmedSource = detection.source == VinScanSource.barcode
          ? 'Verificado desde código de barras'
          : 'Verificado con OCR (lectura estable)';
      _activeDetection = null;
      _validationState = _VinValidationState.idle;
      _validationTitle = null;
      _validationSubtitle = null;
      _status = 'VIN confirmado';
    });
  }

  Future<void> _confirmVin() async {
    final vin = _detectedVin;
    if (vin == null ||
        _finishing ||
        _validationState == _VinValidationState.validating) {
      return;
    }

    final validator = widget.onValidateVin;
    if (validator != null) {
      setState(() {
        _validationState = _VinValidationState.validating;
        _validationTitle = 'Validando VIN';
        _validationSubtitle = 'Buscando el vehículo antes de continuar.';
      });

      try {
        final result = await validator(vin);
        if (!mounted) return;

        if (!result.isValid) {
          HapticFeedback.heavyImpact();
          setState(() {
            _validationState = _VinValidationState.failure;
            _validationTitle = result.title;
            _validationSubtitle = result.subtitle;
          });
          return;
        }

        await HapticFeedback.mediumImpact();
        setState(() {
          _validationState = _VinValidationState.success;
          _validationTitle = result.title;
          _validationSubtitle = result.subtitle;
        });
        await Future<void>.delayed(const Duration(milliseconds: 650));
        if (!mounted) return;
      } catch (e) {
        if (!mounted) return;
        HapticFeedback.heavyImpact();
        setState(() {
          _validationState = _VinValidationState.failure;
          _validationTitle = 'No se pudo validar';
          _validationSubtitle =
              'Revisa la conexión o escanea el VIN nuevamente.';
        });
        return;
      }
    }

    _finishing = true;

    await _disposeCamera();
    if (!mounted) return;
    Navigator.of(context).pop(vin);
  }

  Future<void> _resumeScan() async {
    final controller = _controller;
    if (controller == null) return;

    setState(() {
      _detectedVin = null;
      _confirmedSource = null;
      _activeDetection = null;
      _validationState = _VinValidationState.idle;
      _validationTitle = null;
      _validationSubtitle = null;
      _finishing = false;
      _status = _statusForMode(_mode);
    });
    _stabilityLock.reset();
    _barcodeLock.reset();

    try {
      if (!controller.value.isStreamingImages) {
        await controller.startImageStream(_processCameraImage);
      }
    } catch (_) {
      _setStatus('No se pudo reiniciar el escáner.');
    }
  }

  Future<void> _onTapToFocus(
    TapDownDetails details,
    CameraController controller,
    Size viewportSize,
  ) async {
    if (!_cameraReady) return;

    try {
      final point = Offset(
        (details.localPosition.dx / viewportSize.width).clamp(0.0, 1.0),
        (details.localPosition.dy / viewportSize.height).clamp(0.0, 1.0),
      );
      await controller.setFocusPoint(point);
      await controller.setExposurePoint(point);

      if (!mounted) return;
      setState(() => _focusPoint = details.localPosition);
      _focusTimer?.cancel();
      _focusTimer = Timer(const Duration(milliseconds: 650), () {
        if (mounted) setState(() => _focusPoint = null);
      });
    } catch (_) {
      // Algunos dispositivos no exponen puntos de enfoque manual.
    }
  }

  Widget _buildConfirmationPanel() {
    final vin = _detectedVin!;
    final validating = _validationState == _VinValidationState.validating;
    final success = _validationState == _VinValidationState.success;
    final failure = _validationState == _VinValidationState.failure;
    final title =
        _validationTitle ??
        (success
            ? 'Vehículo encontrado'
            : failure
            ? 'No se pudo validar'
            : 'VIN detectado');
    final subtitle = _validationSubtitle ?? _confirmedSource;

    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: Material(
        color: _surfaceDark,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
        child: SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _VinValidationAnimation(state: _validationState),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 15,
                            ),
                          ),
                          if (subtitle != null && subtitle.trim().isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 3),
                              child: Text(
                                subtitle,
                                style: const TextStyle(
                                  color: Colors.white60,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: SelectableText(
                    vin,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                if (validating)
                  const SizedBox(
                    height: 50,
                    child: Center(
                      child: Text(
                        'Espera un momento...',
                        style: TextStyle(
                          color: Colors.white60,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  )
                else
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: failure ? _confirmVin : _resumeScan,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(50),
                            side: const BorderSide(color: Colors.white24),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          icon: const Icon(Icons.refresh),
                          label: Text(
                            failure ? 'Validar otra vez' : 'Reintentar',
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: failure ? _resumeScan : _confirmVin,
                          style: FilledButton.styleFrom(
                            backgroundColor: _brandRed,
                            foregroundColor: Colors.white,
                            minimumSize: const Size.fromHeight(50),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          icon: Icon(
                            failure ? Icons.qr_code_scanner : Icons.check,
                          ),
                          label: Text(
                            failure ? 'Escanear de nuevo' : 'Usar VIN',
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  _PreparedInputImage? _prepareInputImage(CameraImage image) {
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

    final imageSize = Size(image.width.toDouble(), image.height.toDouble());
    final plane = image.planes.first;
    final inputImage = InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: imageSize,
        rotation: rotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
    return _PreparedInputImage(
      inputImage: inputImage,
      imageSize: imageSize,
      rotation: rotation,
    );
  }

  void _setStatus(String value) {
    if (!mounted || _status == value) return;
    setState(() => _status = value);
  }
}

class _VinValidationAnimation extends StatefulWidget {
  const _VinValidationAnimation({required this.state});

  final _VinValidationState state;

  @override
  State<_VinValidationAnimation> createState() =>
      _VinValidationAnimationState();
}

class _VinValidationAnimationState extends State<_VinValidationAnimation>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _syncAnimation();
  }

  @override
  void didUpdateWidget(covariant _VinValidationAnimation oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.state != widget.state) _syncAnimation();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _syncAnimation() {
    if (widget.state == _VinValidationState.validating) {
      _controller.repeat();
    } else {
      _controller.stop();
      _controller.value = 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.state;
    final color = switch (state) {
      _VinValidationState.validating => _MlkitVinScannerPageState._scanBlue,
      _VinValidationState.success => _MlkitVinScannerPageState._scanGreen,
      _VinValidationState.failure => _MlkitVinScannerPageState._brandRed,
      _ => _MlkitVinScannerPageState._scanGreen,
    };
    final icon = switch (state) {
      _VinValidationState.failure => Icons.error_outline,
      _VinValidationState.validating => Icons.directions_car_filled_outlined,
      _ => Icons.check,
    };

    return SizedBox(
      width: 42,
      height: 42,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _ValidationRingPainter(
              color: color,
              progress: _controller.value,
              spinning: state == _VinValidationState.validating,
            ),
            child: Center(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 160),
                child: Icon(icon, key: ValueKey(state), size: 19, color: color),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ValidationRingPainter extends CustomPainter {
  const _ValidationRingPainter({
    required this.color,
    required this.progress,
    required this.spinning,
  });

  final Color color;
  final double progress;
  final bool spinning;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final ringRect = rect.deflate(3);
    canvas.drawOval(
      ringRect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..color = color.withValues(alpha: 0.20),
    );

    if (spinning) {
      canvas.drawArc(
        ringRect,
        -math.pi / 2 + (progress * math.pi * 2),
        math.pi * 1.35,
        false,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round
          ..strokeWidth = 2.8
          ..color = color,
      );
    } else {
      canvas.drawOval(
        ringRect,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.8
          ..color = color,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ValidationRingPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.progress != progress ||
        oldDelegate.spinning != spinning;
  }
}

class _PreparedInputImage {
  const _PreparedInputImage({
    required this.inputImage,
    required this.imageSize,
    required this.rotation,
  });

  final InputImage inputImage;
  final Size imageSize;
  final InputImageRotation rotation;
}

class _ScanDetection {
  const _ScanDetection({
    required this.bounds,
    required this.imageSize,
    required this.rotation,
    required this.label,
    required this.source,
    this.vin,
    this.isPotential = false,
    this.locked = false,
  });

  final Rect bounds;
  final Size imageSize;
  final InputImageRotation rotation;
  final String label;
  final VinScanSource source;
  final String? vin;
  final bool isPotential;
  final bool locked;

  Size get coordinateSize {
    if (Platform.isIOS) return imageSize;
    return switch (rotation) {
      InputImageRotation.rotation90deg || InputImageRotation.rotation270deg =>
        Size(imageSize.height, imageSize.width),
      _ => imageSize,
    };
  }

  Rect mapToViewport(Size viewportSize) {
    final sourceSize = coordinateSize;
    if (sourceSize.isEmpty || viewportSize.isEmpty) return Rect.zero;

    var sourceBounds = bounds;
    if (rotation == InputImageRotation.rotation270deg) {
      sourceBounds = Rect.fromLTRB(
        sourceSize.width - bounds.right,
        bounds.top,
        sourceSize.width - bounds.left,
        bounds.bottom,
      );
    } else if (rotation == InputImageRotation.rotation180deg) {
      sourceBounds = Rect.fromLTRB(
        sourceSize.width - bounds.right,
        sourceSize.height - bounds.bottom,
        sourceSize.width - bounds.left,
        sourceSize.height - bounds.top,
      );
    }

    final fitted = applyBoxFit(BoxFit.cover, sourceSize, viewportSize);
    final destination = Alignment.center.inscribe(
      fitted.destination,
      Offset.zero & viewportSize,
    );
    final scaleX = destination.width / sourceSize.width;
    final scaleY = destination.height / sourceSize.height;

    return Rect.fromLTRB(
      destination.left + (sourceBounds.left * scaleX),
      destination.top + (sourceBounds.top * scaleY),
      destination.left + (sourceBounds.right * scaleX),
      destination.top + (sourceBounds.bottom * scaleY),
    );
  }

  _ScanDetection copyWith({
    Rect? bounds,
    String? label,
    VinScanSource? source,
    String? vin,
    bool? isPotential,
    bool? locked,
  }) {
    return _ScanDetection(
      bounds: bounds ?? this.bounds,
      imageSize: imageSize,
      rotation: rotation,
      label: label ?? this.label,
      source: source ?? this.source,
      vin: vin ?? this.vin,
      isPotential: isPotential ?? this.isPotential,
      locked: locked ?? this.locked,
    );
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

class _ScannerTopBar extends StatelessWidget {
  const _ScannerTopBar({
    required this.torchEnabled,
    required this.cameraReady,
    required this.onBack,
    required this.onTorch,
  });

  final bool torchEnabled;
  final bool cameraReady;
  final VoidCallback onBack;
  final VoidCallback onTorch;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        IconButton.filled(
          onPressed: onBack,
          style: IconButton.styleFrom(
            backgroundColor: const Color(0xCC0D1017),
            foregroundColor: Colors.white,
          ),
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Volver',
        ),
        const Expanded(
          child: Text(
            'Escanear VIN',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        IconButton.filled(
          onPressed: cameraReady ? onTorch : null,
          style: IconButton.styleFrom(
            backgroundColor: torchEnabled
                ? const Color(0xFFC61D26)
                : const Color(0xCC0D1017),
            foregroundColor: Colors.white,
            disabledBackgroundColor: const Color(0x660D1017),
          ),
          icon: Icon(torchEnabled ? Icons.flash_on : Icons.flash_off),
          tooltip: 'Linterna',
        ),
      ],
    );
  }
}

class _ScannerModeControl extends StatelessWidget {
  const _ScannerModeControl({
    required this.mode,
    required this.enabled,
    required this.onChanged,
  });

  final _ScannerMode mode;
  final bool enabled;
  final ValueChanged<_ScannerMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.center,
      child: SizedBox(
        width: 274,
        child: SegmentedButton<_ScannerMode>(
          segments: const [
            ButtonSegment(
              value: _ScannerMode.barcode,
              icon: Icon(Icons.qr_code_scanner, size: 18),
              label: Text('Código'),
            ),
            ButtonSegment(
              value: _ScannerMode.text,
              icon: Icon(Icons.text_fields, size: 18),
              label: Text('Texto VIN'),
            ),
          ],
          selected: {mode},
          showSelectedIcon: false,
          onSelectionChanged: enabled
              ? (selection) => onChanged(selection.first)
              : null,
          style: ButtonStyle(
            minimumSize: const WidgetStatePropertyAll(Size(0, 42)),
            backgroundColor: WidgetStateProperty.resolveWith((states) {
              return states.contains(WidgetState.selected)
                  ? _MlkitVinScannerPageState._brandRed
                  : const Color(0xD90D1017);
            }),
            foregroundColor: const WidgetStatePropertyAll(Colors.white),
            side: const WidgetStatePropertyAll(
              BorderSide(color: Colors.white24),
            ),
            textStyle: const WidgetStatePropertyAll(
              TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
            ),
          ),
        ),
      ),
    );
  }
}

class _ZoomControl extends StatelessWidget {
  const _ZoomControl({
    required this.value,
    required this.min,
    required this.max,
    required this.enabled,
    required this.onChanged,
    required this.onReset,
  });

  final double value;
  final double min;
  final double max;
  final bool enabled;
  final ValueChanged<double> onChanged;
  final VoidCallback onReset;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 46,
      padding: const EdgeInsets.only(left: 8, right: 12),
      decoration: BoxDecoration(
        color: const Color(0xD90D1017),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        children: [
          TextButton(
            onPressed: enabled ? onReset : null,
            style: TextButton.styleFrom(
              foregroundColor: Colors.white,
              minimumSize: const Size(52, 36),
              padding: EdgeInsets.zero,
            ),
            child: Text(
              '${value.toStringAsFixed(1)}x',
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
          Expanded(
            child: SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor: _MlkitVinScannerPageState._brandRed,
                inactiveTrackColor: Colors.white24,
                thumbColor: Colors.white,
                overlayColor: _MlkitVinScannerPageState._brandRed.withValues(
                  alpha: 0.18,
                ),
                trackHeight: 2,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
              ),
              child: Slider(
                value: value.clamp(min, max),
                min: min,
                max: max > min ? max : min + 0.01,
                onChanged: enabled ? onChanged : null,
              ),
            ),
          ),
          const Icon(Icons.zoom_in, color: Colors.white70, size: 20),
        ],
      ),
    );
  }
}

class _ScannerStatus extends StatelessWidget {
  const _ScannerStatus({required this.status, required this.detection});

  final String status;
  final _ScanDetection? detection;

  @override
  Widget build(BuildContext context) {
    final dotColor = detection == null
        ? Colors.white54
        : _scannerToneForDetection(detection!);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        color: const Color(0xE60D1017),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            width: 9,
            height: 9,
            decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              status,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ScannerOverlay extends StatefulWidget {
  const _ScannerOverlay({required this.detection, required this.viewportSize});

  final _ScanDetection? detection;
  final Size viewportSize;

  @override
  State<_ScannerOverlay> createState() => _ScannerOverlayState();
}

class _ScannerOverlayState extends State<_ScannerOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  _ScanDetection? _fromDetection;
  _ScanDetection? _toDetection;

  @override
  void initState() {
    super.initState();
    _toDetection = widget.detection;
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 180),
      value: 1,
    );
  }

  @override
  void didUpdateWidget(covariant _ScannerOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.detection == widget.detection &&
        oldWidget.viewportSize == widget.viewportSize) {
      return;
    }

    _fromDetection = _currentDetection;
    _toDetection = widget.detection;
    _controller.forward(from: 0);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  _ScanDetection? get _currentDetection {
    final t = Curves.easeOutCubic.transform(_controller.value);
    final from = _fromDetection;
    final to = _toDetection;
    if (from == null && to == null) return null;
    if (from == null) return to;
    if (to == null) return from;
    return to.copyWith(bounds: Rect.lerp(from.bounds, to.bounds, t));
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final appearing = _toDetection != null;
            final animationValue = Curves.easeOutCubic.transform(
              _controller.value,
            );
            return CustomPaint(
              painter: _ScannerOverlayPainter(
                detection: _currentDetection,
                viewportSize: widget.viewportSize,
                progress: animationValue,
                detectionOpacity: appearing
                    ? animationValue.clamp(0.0, 1.0)
                    : (1 - animationValue).clamp(0.0, 1.0),
              ),
            );
          },
        ),
      ),
    );
  }
}

Color _scannerToneForDetection(_ScanDetection detection) {
  if (detection.locked) return _MlkitVinScannerPageState._scanGreen;
  if (detection.vin != null) return _MlkitVinScannerPageState._scanBlue;
  if (detection.isPotential) return _MlkitVinScannerPageState._scanAmber;
  return Colors.white;
}

class _ScannerOverlayPainter extends CustomPainter {
  const _ScannerOverlayPainter({
    required this.detection,
    required this.viewportSize,
    required this.progress,
    required this.detectionOpacity,
  });

  final _ScanDetection? detection;
  final Size viewportSize;
  final double progress;
  final double detectionOpacity;

  @override
  void paint(Canvas canvas, Size size) {
    final currentDetection = detection;
    if (currentDetection == null) return;
    final opacity = detectionOpacity.clamp(0.0, 1.0).toDouble();
    if (opacity <= 0.01) return;

    var detectedRect = currentDetection.mapToViewport(viewportSize).inflate(8);
    detectedRect = _clampDetectionRect(detectedRect, size);
    if (detectedRect.isEmpty) return;

    final color = _scannerToneForDetection(currentDetection);
    final detectedRRect = RRect.fromRectAndRadius(
      detectedRect,
      const Radius.circular(8),
    );
    canvas.drawRRect(
      detectedRRect,
      Paint()
        ..style = PaintingStyle.fill
        ..color = color.withValues(
          alpha: (currentDetection.locked ? 0.14 : 0.09) * opacity,
        ),
    );
    canvas.drawRRect(
      detectedRRect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = color.withValues(alpha: 0.32 * opacity),
    );
    _drawCornerBrackets(
      canvas,
      detectedRect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round
        ..strokeWidth = currentDetection.locked ? 3 : 2.4
        ..color = color.withValues(alpha: 0.96 * opacity),
      math.min(34, detectedRect.shortestSide * 0.32),
    );

    final label = currentDetection.locked
        ? 'VIN confirmado'
        : currentDetection.label;
    final textPainter = TextPainter(
      text: TextSpan(
        text: label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    final labelWidth = math.min(textPainter.width + 16, size.width - 16);
    final labelLeft = detectedRect.left.clamp(8.0, size.width - labelWidth - 8);
    final labelRect = Rect.fromLTWH(
      labelLeft.toDouble(),
      math.max(76, detectedRect.top - 27),
      labelWidth,
      24,
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(labelRect, const Radius.circular(5)),
      Paint()..color = color.withValues(alpha: 0.88 * opacity),
    );
    textPainter.paint(canvas, Offset(labelRect.left + 8, labelRect.top + 5));
  }

  Rect _clampDetectionRect(Rect rect, Size size) {
    final left = rect.left.clamp(8.0, size.width - 8.0).toDouble();
    final right = rect.right.clamp(8.0, size.width - 8.0).toDouble();
    final top = rect.top.clamp(72.0, size.height - 8.0).toDouble();
    final bottom = rect.bottom.clamp(72.0, size.height - 8.0).toDouble();
    return Rect.fromLTRB(
      math.min(left, right),
      math.min(top, bottom),
      math.max(left, right),
      math.max(top, bottom),
    );
  }

  void _drawCornerBrackets(
    Canvas canvas,
    Rect rect,
    Paint paint,
    double length,
  ) {
    final cornerLength = math.max(10.0, length);
    canvas
      ..drawLine(rect.topLeft, rect.topLeft + Offset(cornerLength, 0), paint)
      ..drawLine(rect.topLeft, rect.topLeft + Offset(0, cornerLength), paint)
      ..drawLine(rect.topRight, rect.topRight - Offset(cornerLength, 0), paint)
      ..drawLine(rect.topRight, rect.topRight + Offset(0, cornerLength), paint)
      ..drawLine(
        rect.bottomLeft,
        rect.bottomLeft + Offset(cornerLength, 0),
        paint,
      )
      ..drawLine(
        rect.bottomLeft,
        rect.bottomLeft - Offset(0, cornerLength),
        paint,
      )
      ..drawLine(
        rect.bottomRight,
        rect.bottomRight - Offset(cornerLength, 0),
        paint,
      )
      ..drawLine(
        rect.bottomRight,
        rect.bottomRight - Offset(0, cornerLength),
        paint,
      );
  }

  @override
  bool shouldRepaint(covariant _ScannerOverlayPainter oldDelegate) {
    return oldDelegate.detection != detection ||
        oldDelegate.viewportSize != viewportSize ||
        oldDelegate.progress != progress ||
        oldDelegate.detectionOpacity != detectionOpacity;
  }
}

class _FocusRing extends StatefulWidget {
  const _FocusRing();

  @override
  State<_FocusRing> createState() => _FocusRingState();
}

class _FocusRingState extends State<_FocusRing>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 520),
    )..forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final curved = Curves.easeOutCubic.transform(_controller.value);
        return Opacity(
          opacity: 1 - (curved * 0.75),
          child: Transform.scale(
            scale: 1.35 - (0.35 * curved),
            child: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _MlkitVinScannerPageState._brandRed,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
        );
      },
    );
  }
}
